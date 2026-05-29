import { sanitizeDeliveryDetailsFields } from './deliveryAddress.js';
import { env } from '../config/env.js';

export const DELIVERY_CITY = 'Arroyomolinos';

/** Bounding box aproximado de Arroyomolinos */
export const ARROYOMOLINOS_BOUNDS = {
  minLat: 40.265,
  maxLat: 40.335,
  minLng: -3.92,
  maxLng: -3.82,
};

export type AddressPayload = {
  fullAddress: string;
  city: string;
  lat: number;
  lng: number;
  placeId?: string;
  label?: string;
  portal?: string;
  floor?: string;
  door?: string;
  details?: string;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

export function isInArroyomolinosBounds(lat: number, lng: number): boolean {
  return (
    lat >= ARROYOMOLINOS_BOUNDS.minLat &&
    lat <= ARROYOMOLINOS_BOUNDS.maxLat &&
    lng >= ARROYOMOLINOS_BOUNDS.minLng &&
    lng <= ARROYOMOLINOS_BOUNDS.maxLng
  );
}

export function isArroyomolinosCity(city: string): boolean {
  const n = normalize(city);
  return n.includes('arroyomolinos');
}

export function validateAddressPayload(addr: Partial<AddressPayload>): {
  valid: boolean;
  message: string;
  address?: AddressPayload;
} {
  const { fullAddress, city, lat, lng, placeId, label, portal, floor, door, details } = addr;

  if (!fullAddress?.trim()) {
    return { valid: false, message: 'Selecciona una dirección de la lista' };
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { valid: false, message: 'Dirección no geolocalizada. Selecciona una sugerencia válida.' };
  }

  const inBounds = isInArroyomolinosBounds(lat, lng);
  const cityOk = city ? isArroyomolinosCity(city) : false;
  const distKm = distanceKm(env.restaurantLat, env.restaurantLng, lat, lng);

  if (distKm > env.deliveryRadiusKm) {
    return {
      valid: false,
      message: `Fuera de zona de reparto (máx. ${env.deliveryRadiusKm} km desde el local)`,
    };
  }

  if (!inBounds && !cityOk) {
    return {
      valid: false,
      message: 'Solo disponible en Arroyomolinos. Elige una dirección dentro de la zona.',
    };
  }

  const extra = sanitizeDeliveryDetailsFields({ portal, floor, door, details });

  return {
    valid: true,
    message: 'Dirección válida',
    address: {
      fullAddress: fullAddress.trim(),
      city: city?.trim() || DELIVERY_CITY,
      lat,
      lng,
      placeId,
      label,
      ...extra,
    },
  };
}

/** Distancia Haversine en km */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const ARROYOMOLINOS_CENTER = { lat: 40.3019, lng: -3.8736 };
