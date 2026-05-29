const LEVELS = [
  { id: 'hierro', minOrders: 0 },
  { id: 'bronce', minOrders: 3 },
  { id: 'plata', minOrders: 8 },
  { id: 'oro', minOrders: 15 },
  { id: 'platino', minOrders: 25 },
  { id: 'diamante', minOrders: 40 },
] as const;

export function getLevelForOrders(orderCount: number) {
  let current = 'hierro';
  for (const l of LEVELS) {
    if (orderCount >= l.minOrders) current = l.id;
  }
  const idx = LEVELS.findIndex((l) => l.id === current);
  const next = LEVELS[idx + 1];
  if (!next) return { level: current, progress: 100 };
  const range = next.minOrders - LEVELS[idx].minOrders;
  const progress = Math.min(100, Math.round(((orderCount - LEVELS[idx].minOrders) / range) * 100));
  return { level: current, progress };
}

export function getZardasBonus(level: string) {
  const map: Record<string, number> = { hierro: 0, bronce: 5, plata: 10, oro: 15, platino: 20, diamante: 30 };
  return map[level] ?? 0;
}

export const ZARDAS_PER_ORDER = 15;
export const ZARDAS_REGISTER = 25;
export const ZARDAS_BIRTHDAY = 50;
export const BIRTHDAY_FREE_PRODUCT = 'Bebida gratis';

export function mapClientStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'received',
    accepted: 'received',
    preparing: 'preparing',
    ready: 'ready',
    on_the_way: 'on_the_way',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  return map[status] ?? status;
}

export function mapAdminStatus(status: string): string {
  const map: Record<string, string> = {
    received: 'pending',
  };
  return map[status] ?? status;
}

export const STATUS_FLOW: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['on_the_way', 'delivered', 'cancelled'],
  on_the_way: ['delivered', 'cancelled'],
};

export function assertValidStatusTransition(current: string, next: string): void {
  if (current === next) return;
  const allowed = STATUS_FLOW[current] ?? [];
  if (!allowed.includes(next)) {
    const err = new Error(`No se puede cambiar de ${current} a ${next}`) as Error & { status?: number };
    err.status = 400;
    throw err;
  }
}
