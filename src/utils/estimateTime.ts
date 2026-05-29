export type QueueEstimate = {
  activeOrders: number;
  prepTimeMinutes: number;
  businessStatus?: 'open' | 'closed' | 'saturated';
  pickup: { min: number; max: number };
  delivery: { min: number; max: number };
};

export function formatEtaRange(min: number, max: number): string {
  return `${min}–${max} min`;
}

export function getEtaForType(estimate: QueueEstimate, type: 'pickup' | 'delivery') {
  const range = type === 'delivery' ? estimate.delivery : estimate.pickup;
  return {
    min: range.min,
    max: range.max,
    label: formatEtaRange(range.min, range.max),
  };
}

export function getAlmostReadyMinutes(queuePosition: number, prepTimeMinutes: number): number {
  if (queuePosition <= 0) return Math.max(5, Math.round(prepTimeMinutes * 0.4));
  return Math.max(8, queuePosition * 4 + prepTimeMinutes);
}
