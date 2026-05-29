import type { UserLevel } from '../types';
import { LEVELS } from '../data/levels';

export function getLevelForOrders(orderCount: number): UserLevel {
  let current: UserLevel = 'hierro';
  for (const level of LEVELS) {
    if (orderCount >= level.minOrders) current = level.id;
  }
  return current;
}

export function getLevelProgress(orderCount: number): { current: UserLevel; progress: number; nextLevel?: UserLevel } {
  const current = getLevelForOrders(orderCount);
  const currentIdx = LEVELS.findIndex((l) => l.id === current);
  const next = LEVELS[currentIdx + 1];

  if (!next) {
    return { current, progress: 100 };
  }

  const currentMin = LEVELS[currentIdx].minOrders;
  const range = next.minOrders - currentMin;
  const progress = Math.min(100, Math.round(((orderCount - currentMin) / range) * 100));

  return { current, progress, nextLevel: next.id };
}

export function getLevelInfo(level: UserLevel) {
  return LEVELS.find((l) => l.id === level)!;
}

export function getZardasBonusForLevel(level: UserLevel): number {
  const bonuses: Record<UserLevel, number> = {
    hierro: 0,
    bronce: 5,
    plata: 10,
    oro: 15,
    platino: 20,
    diamante: 30,
  };
  return bonuses[level];
}

export function getNextRewardProgress(zardas: number, rewards: { zardasCost: number }[]): {
  nextReward?: { zardasCost: number };
  remaining: number;
  progress: number;
} {
  const affordable = rewards.filter((r) => r.zardasCost > zardas);
  if (affordable.length === 0) {
    const last = rewards[rewards.length - 1];
    return { remaining: 0, progress: 100, nextReward: last };
  }

  const next = affordable.sort((a, b) => a.zardasCost - b.zardasCost)[0];
  const prev = rewards.filter((r) => r.zardasCost <= next.zardasCost).sort((a, b) => b.zardasCost - a.zardasCost)[0];
  const base = prev?.zardasCost ?? 0;
  const range = next.zardasCost - base;
  const progress = range > 0 ? Math.round(((zardas - base) / range) * 100) : 0;

  return { nextReward: next, remaining: next.zardasCost - zardas, progress };
}

export function calculateStreakBonus(streak: number): number {
  if (streak >= 7) return 25;
  if (streak >= 3) return 10;
  return 0;
}

export function shouldGiveSurpriseReward(): boolean {
  return Math.random() < 0.15;
}

export function getSurpriseReward(): { type: 'zardas' | 'food'; amount: number; label: string } {
  if (Math.random() < 0.6) {
    const amount = [5, 10, 15, 20][Math.floor(Math.random() * 4)];
    return { type: 'zardas', amount, label: `¡Sorpresa! +${amount} Zardas` };
  }
  return { type: 'food', amount: 1, label: '¡Sorpresa! Patatas gratis en tu próximo pedido' };
}
