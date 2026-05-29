import { useCallback, useEffect, useState } from 'react';
import { getQueueEstimate } from '../api/products';
import type { QueueEstimate } from '../utils/estimateTime';
import { formatEtaRange, getEtaForType } from '../utils/estimateTime';
import { getMealPeriod } from '../utils/userHabits';

/** Ajuste ligero según hora del día (más cola en cena) */
function adjustEstimate(estimate: QueueEstimate): QueueEstimate {
  const period = getMealPeriod();
  let boost = 0;
  if (period === 'dinner') boost = 3;
  else if (period === 'lunch') boost = 2;

  return {
    ...estimate,
    pickup: { min: estimate.pickup.min + boost, max: estimate.pickup.max + boost },
    delivery: { min: estimate.delivery.min + boost, max: estimate.delivery.max + boost },
  };
}

export function useSmartEta(type: 'pickup' | 'delivery' = 'delivery', pollMs = 45000) {
  const [estimate, setEstimate] = useState<QueueEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const raw = await getQueueEstimate();
      setEstimate(adjustEstimate(raw));
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  const range = estimate ? getEtaForType(estimate, type) : null;

  return {
    estimate,
    loading,
    refresh,
    label: range?.label ?? '—',
    min: range?.min,
    max: range?.max,
    activeOrders: estimate?.activeOrders ?? 0,
    formatRange: (min: number, max: number) => formatEtaRange(min, max),
  };
}

export function getOrderEtaMinutes(
  queuePosition: number,
  estimate: QueueEstimate | null,
  type: 'pickup' | 'delivery',
): { min: number; max: number; label: string } | null {
  if (!estimate) return null;
  const base = getEtaForType(estimate, type);
  if (queuePosition <= 0) return base;
  const extra = Math.min(queuePosition * 4, 20);
  return {
    min: base.min + extra,
    max: base.max + extra,
    label: formatEtaRange(base.min + extra, base.max + extra),
  };
}
