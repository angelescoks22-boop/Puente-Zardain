import type { IOrder } from '../models/Order.js';
import type { IUser } from '../models/User.js';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from './email.service.js';

const NOTIFY_STATUSES = new Set([
  'accepted',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
  'cancelled',
]);

export function notifyOrderCreatedByEmail(user: IUser, order: IOrder): void {
  void sendOrderConfirmationEmail(user.email, order).catch((err) => {
    console.error('[EMAIL] Error confirmación pedido:', err);
  });
}

export function notifyOrderStatusByEmail(
  user: IUser,
  order: IOrder,
  status: string,
): void {
  if (!NOTIFY_STATUSES.has(status)) return;
  void sendOrderStatusEmail(user.email, order, status).catch((err) => {
    console.error('[EMAIL] Error estado pedido:', err);
  });
}
