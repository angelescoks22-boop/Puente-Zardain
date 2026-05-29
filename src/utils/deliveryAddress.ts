import type { DeliveryAddress, DeliveryDetailsFields } from '../types';

export const EMPTY_DELIVERY_DETAILS: DeliveryDetailsFields = {
  portal: '',
  floor: '',
  door: '',
  details: '',
};

export function sanitizeDeliveryDetailsFields(
  fields: Partial<DeliveryDetailsFields>,
): DeliveryDetailsFields {
  const trim = (value?: string, max = 30) => value?.trim().slice(0, max) || undefined;
  return {
    portal: trim(fields.portal, 20),
    floor: trim(fields.floor, 20),
    door: trim(fields.door, 20),
    details: trim(fields.details, 200),
  };
}

export function formatDeliveryUnitLine(
  addr: Pick<DeliveryDetailsFields, 'portal' | 'floor' | 'door'>,
): string | undefined {
  const parts: string[] = [];
  if (addr.portal?.trim()) parts.push(`Portal ${addr.portal.trim()}`);
  if (addr.floor?.trim()) parts.push(`Piso ${addr.floor.trim()}`);
  if (addr.door?.trim()) parts.push(`Puerta ${addr.door.trim()}`);
  return parts.length ? parts.join(', ') : undefined;
}

export function formatDeliveryDisplay(
  addr: Pick<DeliveryAddress, 'fullAddress' | 'portal' | 'floor' | 'door' | 'details'>,
): string {
  const lines = [addr.fullAddress];
  const unit = formatDeliveryUnitLine(addr);
  if (unit) lines.push(unit);
  if (addr.details?.trim()) lines.push(addr.details.trim());
  return lines.join('\n');
}

export function hasStructuredDeliveryDetails(
  addr?: Partial<DeliveryDetailsFields> | null,
): boolean {
  return Boolean(addr?.portal?.trim() || addr?.floor?.trim() || addr?.door?.trim());
}

export function hasExtraDeliveryInstructions(
  addr?: Partial<DeliveryDetailsFields> | null,
): boolean {
  return Boolean(addr?.details?.trim());
}

export function hasDeliveryDetails(addr?: Partial<DeliveryDetailsFields> | null): boolean {
  return hasStructuredDeliveryDetails(addr) || hasExtraDeliveryInstructions(addr);
}

export function pickDeliveryDetails(
  addr?: Partial<DeliveryAddress> | null,
): DeliveryDetailsFields {
  return {
    portal: addr?.portal ?? '',
    floor: addr?.floor ?? '',
    door: addr?.door ?? '',
    details: addr?.details ?? '',
  };
}
