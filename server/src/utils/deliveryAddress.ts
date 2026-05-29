export type DeliveryAddressPayload = {
  fullAddress: string;
  city: string;
  lat: number;
  lng: number;
  portal?: string;
  floor?: string;
  door?: string;
  details?: string;
};

function sanitizeField(value?: string, max = 30): string | undefined {
  const trimmed = value?.trim().slice(0, max);
  return trimmed || undefined;
}

export function sanitizeDeliveryDetailsFields(fields: {
  portal?: string;
  floor?: string;
  door?: string;
  details?: string;
}) {
  return {
    portal: sanitizeField(fields.portal, 20),
    floor: sanitizeField(fields.floor, 20),
    door: sanitizeField(fields.door, 20),
    details: sanitizeField(fields.details, 200),
  };
}

export function sanitizeDeliveryDetails(details?: string): string | undefined {
  return sanitizeField(details, 200);
}

export function formatDeliveryUnitLine(addr: {
  portal?: string;
  floor?: string;
  door?: string;
}): string | undefined {
  const parts: string[] = [];
  if (addr.portal?.trim()) parts.push(`Portal ${addr.portal.trim()}`);
  if (addr.floor?.trim()) parts.push(`Piso ${addr.floor.trim()}`);
  if (addr.door?.trim()) parts.push(`Puerta ${addr.door.trim()}`);
  return parts.length ? parts.join(', ') : undefined;
}

export function formatDeliveryDisplay(
  addr: Pick<DeliveryAddressPayload, 'fullAddress' | 'portal' | 'floor' | 'door' | 'details'>,
): string {
  const lines = [addr.fullAddress];
  const unit = formatDeliveryUnitLine(addr);
  if (unit) lines.push(unit);
  if (addr.details?.trim()) lines.push(addr.details.trim());
  return lines.join('\n');
}

export function formatDeliveryDetailsForTicket(
  addr?: Pick<DeliveryAddressPayload, 'portal' | 'floor' | 'door' | 'details'> | null,
): string | undefined {
  if (!addr) return undefined;
  const parts: string[] = [];
  const unit = formatDeliveryUnitLine(addr);
  if (unit) parts.push(unit);
  if (addr.details?.trim()) parts.push(addr.details.trim());
  return parts.length ? parts.join(' · ') : undefined;
}
