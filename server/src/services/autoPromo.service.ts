import * as settingsRepo from '../db/settings.js';
import * as usersRepo from '../db/users.js';
import * as ordersRepo from '../db/orders.js';
import { analyzeBusinessActivity } from './activityAnalysis.service.js';
import { persistSystemLog } from '../db/systemLogs.js';
import { notifyAdminDashboard } from './adminNotify.js';

export async function applyAutoPromoRules() {
  const settings = await settingsRepo.getOrCreate();

  if (!settings.automation?.enabled || !settings.automation?.autoPromoEnabled) {
    return { changed: false, reason: 'auto-promo-disabled' };
  }

  const activity = await analyzeBusinessActivity();
  const slowRatio = settings.automation.slowDayRatio ?? 0.6;
  const busyRatio = settings.automation.busyDayRatio ?? 1.3;

  const isSlow =
    activity.level === 'slow' ||
    (activity.dailyAvg >= 2 && activity.ordersToday < activity.dailyAvg * slowRatio);
  const isBusy =
    activity.level === 'busy' ||
    activity.activeOrders >= (settings.autoRules?.saturatedOrderThreshold ?? 8) ||
    (activity.dailyAvg >= 2 && activity.ordersToday > activity.dailyAvg * busyRatio);

  if (!settings.promo) {
    settings.promo = { active: false, zardasMultiplier: 2, label: 'Doble Zardas hoy', autoManaged: false };
  }

  let changed = false;
  let action = 'none';

  if (isBusy && settings.promo.active && settings.promo.autoManaged) {
    settings.promo.active = false;
    settings.promo.autoManaged = false;
    changed = true;
    action = 'deactivated-busy';
    await persistSystemLog('info', 'Promo auto-desactivada: alta demanda', {
      ordersToday: activity.ordersToday,
      activeOrders: activity.activeOrders,
    });
  } else if (isSlow && !isBusy && !settings.promo.active) {
    settings.promo.active = true;
    settings.promo.autoManaged = true;
    settings.promo.zardasMultiplier = settings.promo.zardasMultiplier ?? 2;
    settings.promo.label = 'Doble Zardas — día tranquilo';
    changed = true;
    action = 'activated-slow';
    await persistSystemLog('info', 'Promo auto-activada: día flojo detectado', {
      ordersToday: activity.ordersToday,
      dailyAvg: activity.dailyAvg,
    });
  }

  if (changed) {
    await settingsRepo.save(settings);
    notifyAdminDashboard();
  }

  let bonusGiven = 0;
  if (settings.automation.autoBonusZardas && isSlow) {
    bonusGiven = await grantActiveClientBonus(settings.automation.autoBonusAmount ?? 10);
  }

  return { changed, action, activity, bonusGiven };
}

async function grantActiveClientBonus(amount: number) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const recentOrderUserIds = await ordersRepo.distinctUserIds({
    createdAtGte: weekAgo,
    status: { ne: 'cancelled' },
  });

  const todayOrderUserIds = await ordersRepo.distinctUserIds({
    createdAtGte: todayStart,
  });
  const todaySet = new Set(todayOrderUserIds);

  const eligible = recentOrderUserIds.filter((id) => !todaySet.has(id));
  if (eligible.length === 0) return 0;

  const limit = Math.min(eligible.length, 5);
  const picked = eligible.slice(0, limit);

  await usersRepo.incrementZardasForIds(picked, amount);

  if (picked.length > 0) {
    await persistSystemLog('info', `Bonus Zardas automático a ${picked.length} clientes activos`, { amount });
  }
  return picked.length;
}
