import { useEffect, useRef } from 'react';
import type { ValidatedAddress } from '../../types';
import { useAddressAutocomplete } from '../../hooks/useAddressAutocomplete';

type Props = {
  value?: ValidatedAddress | null;
  onChange: (address: ValidatedAddress | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

function sameAddress(a?: ValidatedAddress | null, b?: ValidatedAddress | null) {
  if (!a || !b) return !a && !b;
  return a.fullAddress === b.fullAddress && a.lat === b.lat && a.lng === b.lng;
}

export function AddressAutocomplete({
  value,
  onChange,
  label = 'Dirección de entrega',
  placeholder = 'Busca tu calle en Arroyomolinos...',
  required,
  disabled,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const skipNotifyRef = useRef(true);
  const lastNotifiedRef = useRef<ValidatedAddress | null | undefined>(undefined);
  const pickingRef = useRef(false);
  const lastPickIdRef = useRef<string | null>(null);

  const {
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
    clearSelection,
    hydrateFromValue,
  } = useAddressAutocomplete(value ?? null);

  useEffect(() => {
    if (!value?.fullAddress || sameAddress(value, validated)) return;
    hydrateFromValue(value);
  }, [value?.fullAddress, value?.lat, value?.lng, value?.placeId, value, validated, hydrateFromValue]);

  useEffect(() => {
    if (skipNotifyRef.current) {
      skipNotifyRef.current = false;
      lastNotifiedRef.current = validated;
      return;
    }
    if (sameAddress(validated, lastNotifiedRef.current)) return;
    lastNotifiedRef.current = validated;
    onChangeRef.current(validated);
  }, [validated]);

  // Sincronizar padre cuando hay dirección validada (refuerzo móvil)
  useEffect(() => {
    if (validated?.fullAddress) {
      onChangeRef.current(validated);
    }
  }, [validated?.fullAddress, validated?.lat, validated?.lng]);

  useEffect(() => {
    const handleOutside = (e: Event) => {
      if (pickingRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [setOpen]);

  const pickSuggestion = (suggestion: (typeof suggestions)[0]) => {
    if (lastPickIdRef.current === suggestion.id) return;
    lastPickIdRef.current = suggestion.id;
    pickingRef.current = true;
    setOpen(false);
    void selectSuggestion(suggestion).finally(() => {
      window.setTimeout(() => {
        pickingRef.current = false;
        lastPickIdRef.current = null;
      }, 400);
    });
  };

  const handlePick = (suggestion: (typeof suggestions)[0]) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    pickSuggestion(suggestion);
  };

  return (
    <div className="address-autocomplete" ref={containerRef}>
      {label && (
        <label className="address-label">
          {label}
          {required && <span className="required-mark"> *</span>}
        </label>
      )}

      <div
        className={`address-input-wrap ${validationStatus === 'valid' ? 'is-valid' : ''} ${validationStatus === 'invalid' ? 'is-invalid' : ''}`}
      >
        <span className="address-input-icon" aria-hidden>
          📍
        </span>
        <input
          type="text"
          className="address-input"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          autoComplete="street-address"
          enterKeyHint="next"
          onChange={(e) => {
            clearSelection();
            search(e.target.value);
          }}
          onFocus={() => {
            if (query.length >= 3 && suggestions.length) setOpen(true);
          }}
        />
        {loading && <span className="address-spinner" aria-hidden />}
        {validated && !loading && (
          <span className="address-check" aria-hidden>
            ✓
          </span>
        )}
      </div>

      {!useGoogle && (
        <p className="address-hint subtle">
          Modo sin Google Maps: sugerencias vía OpenStreetMap (solo Arroyomolinos).
        </p>
      )}

      {open && suggestions.length > 0 && (
        <ul className="address-suggestions" role="listbox">
          {suggestions.map((s) => (
            <li key={s.id} role="option">
              <button
                type="button"
                className="address-suggestion-card"
                onPointerDown={handlePick(s)}
                onTouchEnd={handlePick(s)}
                onClick={handlePick(s)}
              >
                <span className="suggestion-pin">📍</span>
                <span className="suggestion-text">
                  <strong>{s.mainText}</strong>
                  <span>{s.secondaryText}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {validationStatus === 'valid' && (
        <p className="address-feedback valid" role="status">
          ✅ {validationMessage || 'Dirección válida'}
        </p>
      )}
      {validationStatus === 'invalid' && (
        <p className="address-feedback invalid" role="alert">
          ❌ {validationMessage || 'Solo disponible en Arroyomolinos'}
        </p>
      )}

      {!validated && query.length >= 3 && !loading && !open && (
        <p className="address-hint">Toca una dirección de la lista para continuar</p>
      )}
    </div>
  );
}
