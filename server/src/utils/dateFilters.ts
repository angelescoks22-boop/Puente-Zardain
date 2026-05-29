export type OrderDatePreset = 'today' | 'yesterday' | 'week' | 'all';

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

export function getOrderDateRange(preset: OrderDatePreset, now = new Date()) {
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'week': {
      const w = new Date(now);
      w.setDate(w.getDate() - 6);
      return { from: startOfDay(w), to: endOfDay(now) };
    }
    default:
      return {};
  }
}
