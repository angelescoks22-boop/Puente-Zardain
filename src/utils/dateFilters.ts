export type OrderDateFilter = 'today' | 'yesterday' | 'week' | 'all';

export const ORDER_DATE_FILTERS: { id: OrderDateFilter; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'week', label: 'Últimos 7 días' },
  { id: 'all', label: 'Todos' },
];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getOrderDateRange(filter: OrderDateFilter, now = new Date()) {
  switch (filter) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
    }
    case 'week': {
      const w = new Date(now);
      w.setDate(w.getDate() - 6);
      return { from: startOfDay(w).toISOString(), to: endOfDay(now).toISOString() };
    }
    default:
      return {};
  }
}
