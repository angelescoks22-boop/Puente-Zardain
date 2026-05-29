import { useCallback, useEffect, useRef, useState } from 'react';
import type { ValidatedAddress } from '../types';
import { fetchAddressSuggestions, validateAddress } from '../api/address';
import { ARROYOMOLINOS_CENTER, getGoogleMapsApiKey, loadGoogleMaps } from '../lib/googleMapsLoader';

export type AddressSuggestion = {
  id: string;
  mainText: string;
  secondaryText: string;
  placeId?: string;
  raw?: ValidatedAddress;
};

function parseGooglePlace(place: google.maps.places.PlaceResult): ValidatedAddress | null {
  if (!place.geometry?.location) return null;

  const components = place.address_components ?? [];
  const city =
    components.find((c) => c.types.includes('locality'))?.long_name ??
    components.find((c) => c.types.includes('administrative_area_level_3'))?.long_name ??
    components.find((c) => c.types.includes('postal_town'))?.long_name ??
    '';

  return {
    fullAddress: place.formatted_address ?? place.name ?? '',
    city,
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
    placeId: place.place_id,
  };
}

export function useAddressAutocomplete(initialValue?: ValidatedAddress | null) {
  const [query, setQuery] = useState(initialValue?.fullAddress ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [validated, setValidated] = useState<ValidatedAddress | null>(initialValue ?? null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>(
    initialValue?.fullAddress ? 'valid' : 'idle',
  );
  const [validationMessage, setValidationMessage] = useState(
    initialValue?.fullAddress ? 'Dirección válida' : '',
  );
  const [useGoogle, setUseGoogle] = useState(false);

  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    const key = getGoogleMapsApiKey();
    if (!key) {
      setUseGoogle(false);
      return;
    }
    loadGoogleMaps()
      .then(() => {
        setUseGoogle(true);
        autocompleteRef.current = new google.maps.places.AutocompleteService();
        placesRef.current = new google.maps.places.PlacesService(document.createElement('div'));
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      })
      .catch(() => setUseGoogle(false));
  }, []);

  const fetchBackendSuggestions = useCallback(async (input: string) => {
    try {
      const results = await fetchAddressSuggestions(input);
      setSuggestions(
        results.map((r, i) => ({
          id: r.placeId ?? `osm-${i}`,
          mainText: r.fullAddress.split(',')[0]?.trim() ?? r.fullAddress,
          secondaryText: r.city,
          placeId: r.placeId,
          raw: r,
        })),
      );
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGoogleSuggestions = useCallback(
    (input: string, fallbackToBackend = true) => {
      if (!autocompleteRef.current) {
        if (fallbackToBackend) void fetchBackendSuggestions(input);
        else setLoading(false);
        return;
      }

      autocompleteRef.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current ?? undefined,
          componentRestrictions: { country: 'es' },
          location: new google.maps.LatLng(ARROYOMOLINOS_CENTER.lat, ARROYOMOLINOS_CENTER.lng),
          radius: 12000,
          types: ['geocode'],
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
            setLoading(false);
            setSuggestions(
              predictions.map((p) => ({
                id: p.place_id,
                mainText: p.structured_formatting.main_text,
                secondaryText: p.structured_formatting.secondary_text ?? 'Arroyomolinos',
                placeId: p.place_id,
              })),
            );
            return;
          }

          if (fallbackToBackend) {
            void fetchBackendSuggestions(input);
            return;
          }

          setLoading(false);
          setSuggestions([]);
        },
      );
    },
    [fetchBackendSuggestions],
  );

  useEffect(() => {
    if (!useGoogle || latestQueryRef.current.length < 3) return;
    setLoading(true);
    setOpen(true);
    fetchGoogleSuggestions(latestQueryRef.current);
  }, [useGoogle, fetchGoogleSuggestions]);

  const search = useCallback(
    (input: string) => {
      latestQueryRef.current = input;
      setQuery(input);
      setValidated(null);
      setValidationStatus('idle');
      setValidationMessage('');

      if (input.length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      setOpen(true);
      setLoading(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (useGoogle) fetchGoogleSuggestions(input);
        else fetchBackendSuggestions(input);
      }, 280);
    },
    [useGoogle, fetchGoogleSuggestions, fetchBackendSuggestions],
  );

  const selectSuggestion = useCallback(
    async (suggestion: AddressSuggestion) => {
      setOpen(false);
      setLoading(true);
      setQuery(suggestion.mainText + (suggestion.secondaryText ? `, ${suggestion.secondaryText}` : ''));

      try {
        let payload: ValidatedAddress | null = suggestion.raw ?? null;

        if (!payload && suggestion.placeId && placesRef.current) {
          payload = await new Promise((resolve) => {
            placesRef.current!.getDetails(
              {
                placeId: suggestion.placeId!,
                fields: ['formatted_address', 'geometry', 'address_components', 'place_id'],
                sessionToken: sessionTokenRef.current ?? undefined,
              },
              (place, status) => {
                sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                  resolve(parseGooglePlace(place));
                } else {
                  resolve(null);
                }
              },
            );
          });
        }

        if (!payload) {
          setValidationStatus('invalid');
          setValidationMessage('No se pudo validar la dirección. Prueba otra sugerencia.');
          setValidated(null);
          return;
        }

        const result = await validateAddress(payload);
        if (result.valid && result.address) {
          setValidated(result.address);
          setValidationStatus('valid');
          setValidationMessage(result.message);
          setQuery(result.address.fullAddress);
        } else {
          setValidated(null);
          setValidationStatus('invalid');
          setValidationMessage(result.message || 'Solo disponible en Arroyomolinos');
        }
      } catch {
        setValidated(null);
        setValidationStatus('invalid');
        setValidationMessage('Error al validar la dirección');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setValidated(null);
    setValidationStatus('idle');
    setValidationMessage('');
    setOpen(false);
  }, []);

  const clearSelection = useCallback(() => {
    setValidated(null);
    setValidationStatus('idle');
    setValidationMessage('');
  }, []);

  const hydrateFromValue = useCallback((address: ValidatedAddress | null) => {
    if (!address?.fullAddress) return;

    setQuery(address.fullAddress);
    setValidated(address);
    setValidationStatus('valid');
    setValidationMessage('Dirección válida');
    setOpen(false);
  }, []);

  return {
    query,
    suggestions,
    loading,
    open,
    setOpen,
    validated,
    validationStatus,
    validationMessage,
    useGoogle,
    search,
    selectSuggestion,
    reset,
    clearSelection,
    hydrateFromValue,
  };
}
