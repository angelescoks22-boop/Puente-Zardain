import { env } from '../config/env.js';
import { validateAddressPayload, type AddressPayload } from '../utils/addressValidation.js';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
};

export async function geocodeWithNominatim(query: string): Promise<AddressPayload[]> {
  const q = encodeURIComponent(`${query}, Arroyomolinos, Madrid, Spain`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=5&countrycodes=es`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PuenteZardain/1.0' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  return data.map((item) => {
    const city =
      item.address?.city ??
      item.address?.town ??
      item.address?.village ??
      item.address?.municipality ??
      'Arroyomolinos';
    const road = item.address?.road?.trim();
    const fullAddress = road ? `${road}, ${city}` : item.display_name.split(',').slice(0, 3).join(', ');

    return {
      fullAddress,
      city,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
  });
}

export async function validateAddressServer(body: Partial<AddressPayload>) {
  const result = validateAddressPayload(body);
  if (result.valid) return result;

  if (body.fullAddress && !body.lat && env.isDev) {
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
