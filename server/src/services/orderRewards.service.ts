import * as ordersRepo from '../db/orders.js';
import * as usersRepo from '../db/users.js';
import * as settingsRepo from '../db/settings.js';
import type { IOrder } from '../models/Order.js';
import type { IUser } from '../models/User.js';
import { getLevelForOrders, getZardasBonus, ZARDAS_PER_ORDER } from '../utils/gamification.js';
import { AppError } from '../utils/logger.js';

export type GrantRewardsResult = {
  granted: boolean;
  zardasEarned?: number;
  user?: Pick<IUser, 'zardas' | 'level' | 'orderCount' | 'streak'>;
};

/** Otorga Zardas y sube nivel solo una vez por pedido (idempotente). */
export async function grantOrderCompletionRewards(order: IOrder): Promise<GrantRewardsResult> {
  const claimed = await ordersRepo.claimRewardsGranted(order.id);
  if (!claimed) {
    return { granted: false };
  }

  const user = await usersRepo.findById(order.userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const settings = await settingsRepo.getSingleton();
  const multiplier = settings?.promo?.active ? (settings.promo.zardasMultiplier ?? 1) : 1;
  const base = ZARDAS_PER_ORDER + getZardasBonus(user.level);
  const zardasEarned = Math.round(base * multiplier);

  const today = new Date().toDateString();
  const last = user.lastOrderDate ? new Date(user.lastOrderDate).toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (last !== today) {
    user.streak = last === yesterday ? user.streak + 1 : 1;
  }
  user.lastOrderDate = new Date();
  user.zardas += zardasEarned;
  user.orderCount += 1;
  const { level, progress } = getLevelForOrders(user.orderCount);
  user.level = level as typeof user.level;
  user.levelProgress = progress;
  await usersRepo.save(user);

  return {
    granted: true,
    zardasEarned,
    user: {
      zardas: user.zardas,
      level: user.level,
      orderCount: user.orderCount,
      streak: user.streak,
    },
  };
}
