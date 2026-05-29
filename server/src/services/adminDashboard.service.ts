import * as ordersRepo from '../db/orders.js';
import * as usersRepo from '../db/users.js';
import * as settingsRepo from '../db/settings.js';
import * as conversationsRepo from '../db/conversations.js';
import { getEffectivePrepMinutes } from './adminJobs.service.js';
import { getTodayLiveReport, getLatestDailyReport } from './dailyReport.service.js';
import { analyzeBusinessActivity } from './activityAnalysis.service.js';
import { formatDurationMinutes } from '../utils/formatDuration.js';

export type AdminAlert = {
  id: string;
  type: 'delay' | 'queue' | 'chat' | 'warning';
  severity: 'high' | 'medium' | 'low';
  message: string;
  orderId?: string;
};

export type AdminInsight = {
  id: string;
  icon: string;
  message: string;
  tone: 'positive' | 'neutral' | 'warning';
};

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function minutesBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export async function buildAdminDashboard() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const settings = await settingsRepo.getOrCreate();
  const prepLimit = settings.prepTimeMinutes ?? 15;

  const [activeOrders, todayOrders, weekOrders, deliveredToday, conversations, topClients] =
    await Promise.all([
      ordersRepo.find({ status: { nin: ['delivered', 'cancelled'] } }, 'createdAtAsc'),
      ordersRepo.find({ createdAtGte: todayStart, status: { ne: 'cancelled' } }),
      ordersRepo.find({ createdAtGte: weekStart, status: { ne: 'cancelled' } }),
      ordersRepo.find({ status: 'delivered', completedAtGte: todayStart }),
      conversationsRepo.find({ unreadByAdminGt: 0 }),
      usersRepo.findByRole('client', { orderCount: -1 }, 8),
    ]);

  const activeCount = activeOrders.length;
  const effectivePrep = getEffectivePrepMinutes(settings, activeCount);

  const revenueToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const ordersToday = todayOrders.length;
  const avgTicket = ordersToday > 0 ? revenueToday / ordersToday : 0;

  const prepTimes = deliveredToday
    .filter((o) => o.completedAt)
    .map((o) => minutesBetween(o.createdAt, o.completedAt!));
  const avgPrepMinutes =
    prepTimes.length > 0
      ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
      : prepLimit;

  const weekDailyAvg = weekOrders.length / 7;
  const alerts: AdminAlert[] = [];
  const insights: AdminInsight[] = [];

  for (const order of activeOrders) {
    const elapsed = minutesBetween(order.createdAt, now);
    if (elapsed > prepLimit * 2 && !['ready', 'on_the_way', 'delivered', 'cancelled'].includes(order.status)) {
      alerts.push({
        id: `delay-${order.id}`,
        type: 'delay',
        severity: 'high',
        message: `🚨 Retraso grave: pedido ${order.id.slice(-6).toUpperCase()} lleva ${formatDurationMinutes(elapsed)}`,
        orderId: order.id,
      });
    }
  }

  const satThreshold = settings.autoRules?.saturatedOrderThreshold ?? 8;
  if (activeOrders.length >= satThreshold) {
    alerts.push({
      id: 'queue-high',
      type: 'queue',
      severity: 'high',
      message: `⚠️ ${activeOrders.length} pedidos activos — cocina saturada`,
    });
  }

  if (settings.businessStatus === 'saturated') {
    alerts.push({
      id: 'business-saturated',
      type: 'warning',
      severity: 'high',
      message: '⚠️ Sistema SATURADO — tiempo estimado alto para clientes',
    });
  }

  if (effectivePrep > prepLimit + 10 && activeCount >= 3) {
    alerts.push({
      id: 'eta-high',
      type: 'warning',
      severity: 'high',
      message: `⚠️ Tiempo estimado alto: ~${effectivePrep} min por pedido`,
    });
  }

  if (conversations.length > 0) {
    insights.push({
      id: 'chat-unread',
      icon: '💬',
      message: `${conversations.length} chat(s) pendientes de respuesta humana`,
      tone: 'neutral',
    });
  }

  const readyWaiting = activeOrders.filter((o) => o.status === 'ready' && !o.pickedUp);
  if (readyWaiting.length > 0) {
    insights.push({
      id: 'ready-wait',
      icon: '📦',
      message: `${readyWaiting.length} pedido(s) listos esperando recogida`,
      tone: 'warning',
    });
  }

  if (ordersToday > weekDailyAvg * 1.2 && ordersToday >= 3) {
    insights.push({
      id: 'busy-day',
      icon: '📈',
      message: `Hoy hay más pedidos que la media (${ordersToday} vs ~${Math.round(weekDailyAvg)}/día)`,
      tone: 'positive',
    });
  } else if (ordersToday < weekDailyAvg * 0.6 && weekDailyAvg >= 2) {
    insights.push({
      id: 'quiet-day',
      icon: '📉',
      message: 'Hoy está más tranquilo de lo habitual',
      tone: 'neutral',
    });
  }

  if (avgPrepMinutes > prepLimit + 5 && prepTimes.length >= 2) {
    insights.push({
      id: 'slow-prep',
      icon: '⏱️',
      message: `Tiempo de preparación alto: media ${avgPrepMinutes} min (objetivo ${prepLimit} min)`,
      tone: 'warning',
    });
  }

  const productToday: Record<string, number> = {};
  const productWeek: Record<string, number> = {};
  todayOrders.forEach((o) =>
    o.items.forEach((i) => {
      productToday[i.productName] = (productToday[i.productName] ?? 0) + i.quantity;
    }),
  );
  weekOrders.forEach((o) =>
    o.items.forEach((i) => {
      productWeek[i.productName] = (productWeek[i.productName] ?? 0) + i.quantity;
    }),
  );

  const risingProduct = Object.entries(productToday).sort((a, b) => {
    const ratioA = (productWeek[a[0]] ?? 1) / 7;
    return b[1] / Math.max(ratioA, 0.1) - a[1] / Math.max(ratioA, 0.1);
  })[0];

  if (risingProduct && risingProduct[1] >= 2) {
    insights.push({
      id: 'rising-product',
      icon: '🍔',
      message: `"${risingProduct[0]}" está subiendo en ventas hoy (${risingProduct[1]} uds)`,
      tone: 'positive',
    });
  }

  if (settings.promo?.active) {
    insights.push({
      id: 'promo-active',
      icon: '🎟️',
      message: settings.promo.autoManaged
        ? `Promo automática activa: ${settings.promo.label ?? 'Doble Zardas'}`
        : `Promo activa: ${settings.promo.label ?? 'Promoción'}`,
      tone: 'positive',
    });
  }

  const activity = await analyzeBusinessActivity();
  if (settings.automation?.enabled !== false) {
    insights.push({
      id: 'automation-on',
      icon: '🤖',
      message: `Automatización activa · Actividad: ${activity.level} (${activity.ordersToday} pedidos hoy)`,
      tone: 'neutral',
    });
  }

  const cancelledAgg = await ordersRepo.aggregateCancelledByUser(2);
  const problematicIds = cancelledAgg.map((c) => c.userId);
  const problematicUsers = await usersRepo.findProblematicClients(problematicIds, 15);

  const dailySalesRaw = await ordersRepo.aggregateDailySales(weekStart);
  const dailySales = dailySalesRaw.map((d) => ({
    _id: d.date,
    orders: d.orders,
    revenue: d.revenue,
  }));

  const hourlyToday: Record<number, number> = {};
  todayOrders.forEach((o) => {
    const h = o.createdAt.getHours();
    hourlyToday[h] = (hourlyToday[h] ?? 0) + 1;
  });
  const ordersByHour = Object.entries(hourlyToday)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }));

  const [todayReport, lastReport] = await Promise.all([
    getTodayLiveReport(),
    getLatestDailyReport(),
  ]);

  return {
    live: {
      activeOrders: activeOrders.length,
      queueCount: activeOrders.filter((o) =>
        ['pending', 'accepted', 'preparing'].includes(o.status),
      ).length,
      avgPrepMinutes,
      ordersOpen: settings.ordersOpen,
      businessStatus: settings.businessStatus ?? 'open',
      prepTimeTarget: prepLimit,
      effectivePrepMinutes: effectivePrep,
      unreadChats: conversations.reduce((s, c) => s + c.unreadByAdmin, 0),
    },
    revenue: {
      today: Math.round(revenueToday * 100) / 100,
      ordersToday,
      avgTicket: Math.round(avgTicket * 100) / 100,
    },
    alerts,
    insights,
    vipClients: topClients.map((u) => ({
      id: u.id,
      name: u.name,
      orderCount: u.orderCount,
      level: u.level,
      zardas: u.zardas,
    })),
    problematicClients: problematicUsers.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      orderCount: u.orderCount,
      clientStatus: u.clientStatus,
      noShowCount: u.noShowCount,
      isBlocked: u.isBlocked,
    })),
    dailySales,
    ordersByHour,
    todayReport,
    lastDailyReport: lastReport
      ? {
          date: lastReport.date,
          totalOrders: lastReport.totalOrders,
          topProduct: lastReport.topProduct,
          peakHour: lastReport.peakHour,
          newClients: lastReport.newClients,
          summary: lastReport.summary,
        }
      : null,
    updatedAt: now.toISOString(),
  };
}

export function orderElapsedMinutes(createdAt: Date) {
  return minutesBetween(createdAt, new Date());
}

export function isOrderDelayed(createdAt: Date, status: string, prepLimit: number) {
  const elapsed = orderElapsedMinutes(createdAt);
  return elapsed > prepLimit * 1.5 && !['ready', 'on_the_way', 'delivered', 'cancelled'].includes(status);
}
