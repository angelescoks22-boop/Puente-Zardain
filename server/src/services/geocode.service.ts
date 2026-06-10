import {
  validateAddressPayload,
  isArroyomolinosCity,
  isArroyomolinosInText,
  DELIVERY_CITY,
  type AddressPayload,
} from '../utils/addressValidation.js';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    postcode?: string;
  };
};

function resolveCity(item: NominatimResult): string {
  const candidates = [
    item.address?.city,
    item.address?.town,
    item.address?.village,
    item.address?.municipality,
    item.address?.suburb,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (isArroyomolinosCity(c)) return DELIVERY_CITY;
  }
  if (isArroyomolinosInText(item.display_name)) return DELIVERY_CITY;
  return candidates[0] ?? DELIVERY_CITY;
}

function formatFullAddress(item: NominatimResult, city: string): string {
  const road = item.address?.road?.trim();
  const number = item.address?.house_number?.trim();
  if (road) {
    return number ? `${road} ${number}, ${city}` : `${road}, ${city}`;
  }
  return item.display_name.split(',').slice(0, 3).join(', ').trim();
}

export async function geocodeWithNominatim(query: string): Promise<AddressPayload[]> {
  const q = encodeURIComponent(`${query}, Arroyomolinos, Madrid, Spain`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=8&countrycodes=es`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PuenteZardain/1.0' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  return data.map((item) => {
    const city = resolveCity(item);
    return {
      fullAddress: formatFullAddress(item, city),
      city,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
  });
}

export async function validateAddressServer(body: Partial<AddressPayload>) {
  const result = validateAddressPayload(body);
  if (result.valid) return result;

  if (body.fullAddress && (!body.lat || !body.lng)) {
    const suggestions = await geocodeWithNominatim(body.fullAddress);
    const match = suggestions.find((s) => validateAddressPayload(s).valid);
    if (match) return validateAddressPayload(match);
  }

  return result;
}

export async function fetchAddressSuggestions(query: string) {
  if (query.length < 3) return [];
  const results = await geocodeWithNominatim(query);
  return results
    .map((r) => validateAddressPayload(r))
    .filter((r) => r.valid && r.address)
    .map((r) => r.address!);
}
