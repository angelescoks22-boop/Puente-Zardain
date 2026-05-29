import { DELIVERY_AREA } from '../data/levels';

export function isValidDeliveryAddress(address: string): boolean {
  const normalized = address.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const area = DELIVERY_AREA.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return normalized.includes(area);
}

export function getAddressError(address: string): string | null {
  if (!address.trim()) return 'Introduce una dirección';
  if (!isValidDeliveryAddress(address)) {
    return `Solo entregamos en ${DELIVERY_AREA}`;
  }
  return null;
}
