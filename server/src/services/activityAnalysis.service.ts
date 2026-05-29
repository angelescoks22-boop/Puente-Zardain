import * as ordersRepo from '../db/orders.js';
import * as usersRepo from '../db/users.js';

export type ActivityLevel = 'slow' | 'normal' | 'busy';

export type ActivityAnalysis = {
  level: ActivityLevel;
  ordersToday: number;
  dailyAvg: number;
  activeOrders: number;
  peakHour: string;
  revenueToday: number;
  hour: number;
};

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function analyzeBusinessActivity(): Promise<ActivityAnalysis> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [todayOrders, weekOrders, activeOrders] = await Promise.all([
    ordersRepo.find({ createdAtGte: todayStart, status: { ne: 'cancelled' } }),
    ordersRepo.find({ createdAtGte: weekStart, createdAtLt: todayStart, status: { ne: 'cancelled' } }),
    ordersRepo.countDocuments({ status: { nin: ['delivered', 'cancelled'] } }),
  ]);

  const ordersToday = todayOrders.length;
  const dailyAvg = weekOrders.length / 7;
  const revenueToday = todayOrders.reduce((s, o) => s + o.total, 0);

  const hourly: Record<number, number> = {};
  todayOrders.forEach((o) => {
    const h = o.createdAt.getHours();
    hourly[h] = (hourly[h] ?? 0) + 1;
  });
  const peakEntry = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakEntry ? `${peakEntry[0]}:00` : 'N/A';

  let level: ActivityLevel = 'normal';
  if (dailyAvg >= 2) {
    if (ordersToday < dailyAvg * 0.6) level = 'slow';
    else if (ordersToday > dailyAvg * 1.3) level = 'busy';
  } else if (ordersToday === 0 && now.getHours() >= 14) {
    level = 'slow';
  } else if (activeOrders >= 8) {
    level = 'busy';
  }

  return {
    level,
    ordersToday,
    dailyAvg: Math.round(dailyAvg * 10) / 10,
    activeOrders,
    peakHour,
    revenueToday: Math.round(revenueToday * 100) / 100,
    hour: now.getHours(),
  };
}

export async function getTopProductForDay(date = new Date()) {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const orders = await ordersRepo.find({
    createdAtGte: start,
    createdAtLt: end,
    status: { ne: 'cancelled' },
  });

  const counts: Record<string, number> = {};
  orders.forEach((o) =>
    o.items.forEach((i) => {
      counts[i.productName] = (counts[i.productName] ?? 0) + i.quantity;
    }),
  );

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], quantity: top[1] } : { name: 'N/A', quantity: 0 };
}

export async function countNewClientsForDay(date = new Date()) {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return usersRepo.countDocuments({ role: 'client', createdAtGte: start, createdAtLt: end });
}

export async function countRecurringClientsForDay(date = new Date()) {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const todayUserIds = await ordersRepo.distinctUserIds({
    createdAtGte: start,
    createdAtLt: end,
    status: { ne: 'cancelled' },
  });

  if (todayUserIds.length === 0) return 0;

  return usersRepo.countDocuments({
    ids: todayUserIds,
    orderCountGte: 2,
  });
}
