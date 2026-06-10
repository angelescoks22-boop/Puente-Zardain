import * as ordersRepo from '../db/orders.js';
import * as productsRepo from '../db/products.js';
import * as usersRepo from '../db/users.js';
import * as rewardRedemptionsRepo from '../db/rewardRedemptions.js';
import { BIRTHDAY_FREE_PRODUCT } from '../utils/gamification.js';
import type { IUser } from '../models/User.js';
import type { IOrder } from '../models/Order.js';
import { findOrCreateConversation } from './chat.service.js';
import { generateAndStoreTicket } from './ticket.service.js';
import { sendWelcomeChat } from './autoChat.service.js';
import { logOrderStatusChange } from '../db/orderStatusLogs.js';
import { notifyNewOrder } from './adminNotify.js';
import { notifyOrderCreatedByEmail } from './orderEmail.service.js';
import { validateAddressPayload } from '../utils/addressValidation.js';
import { formatDeliveryDisplay } from '../utils/deliveryAddress.js';
import { AppError } from '../utils/logger.js';
import {
  assertTotalMatches,
  buildPricedLine,
  calculateOrderTotal,
} from '../utils/orderPricing.js';
import { assertOrdersAccepted, calculateOrderEstimatedMinutes } from './settings.service.js';
import { getPendingQueueCount } from './queue.service.js';

export type CreateOrderItemInput = {
  productId: string;
  quantity: number;
  removedIngredients: string[];
  unitPrice: number;
};

export type CreateOrderInput = {
  items: CreateOrderItemInput[];
  total: number;
  type: 'pickup' | 'delivery';
  paymentMethod: 'cash' | 'card';
  cashPaidAmount?: number;
  address?: string;
  deliveryAddress?: {
    fullAddress: string;
    city?: string;
    lat: number;
    lng: number;
    portal?: string;
    floor?: string;
    door?: string;
    details?: string;
    placeId?: string;
  };
  redemptionId?: string;
};

export async function createOrder(user: IUser, data: CreateOrderInput) {
  if (user.isBlocked || user.clientStatus === 'blocked') {
    throw new AppError('Tu cuenta está bloqueada', 403);
  }

  const settings = await assertOrdersAccepted();

  const activeCount = await ordersRepo.countActiveForUser(user.id);
  if (activeCount >= 3) {
    throw new AppError('Tienes demasiados pedidos activos. Espera a que finalicen.', 400);
  }

  const { items, total, type, paymentMethod, address, deliveryAddress, cashPaidAmount, redemptionId } = data;
  if (!items?.length || !total || !type || !paymentMethod) {
    throw new AppError('Pedido incompleto', 400);
  }

  let finalAddress = address;
  let deliveryLat: number | undefined;
  let deliveryLng: number | undefined;
  let structuredDeliveryAddress: IOrder['deliveryAddress'];

  if (type === 'delivery') {
    const addrPayload = deliveryAddress ?? { fullAddress: address };
    const check = validateAddressPayload(addrPayload);
    if (!check.valid || !check.address) {
      throw new AppError(
        check.message || `Solo entregamos en ${settings.deliveryArea ?? 'Arroyomolinos'}`,
        400,
      );
    }
    structuredDeliveryAddress = {
      fullAddress: check.address.fullAddress,
      city: check.address.city ?? 'Arroyomolinos',
      lat: check.address.lat,
      lng: check.address.lng,
      portal: check.address.portal,
      floor: check.address.floor,
      door: check.address.door,
      details: check.address.details,
    };
    finalAddress = formatDeliveryDisplay(structuredDeliveryAddress);
    deliveryLat = structuredDeliveryAddress.lat;
    deliveryLng = structuredDeliveryAddress.lng;
  }

  const queuePosition = await getPendingQueueCount();
  const estimatedTimeMinutes = calculateOrderEstimatedMinutes(settings);

  const orderItems = [];
  for (const item of items) {
    const product = await productsRepo.findById(item.productId);
    if (!product || !product.active) {
      throw new AppError('Producto no disponible en la carta', 400);
    }
    orderItems.push(
      buildPricedLine(product, item.quantity, item.removedIngredients ?? []),
    );
  }

  const computedTotal = calculateOrderTotal(orderItems);
  assertTotalMatches(computedTotal, total);

  if (computedTotal < (settings.minOrderAmount ?? 15)) {
    throw new AppError(`Pedido mínimo ${settings.minOrderAmount ?? 15}€`, 400);
  }

  let cashChange: number | undefined;
  if (paymentMethod === 'cash') {
    if (typeof cashPaidAmount !== 'number' || Number.isNaN(cashPaidAmount)) {
      throw new AppError('Indica con cuánto vas a pagar en efectivo', 400);
    }
    if (cashPaidAmount < computedTotal) {
      throw new AppError(`El importe debe ser al menos ${computedTotal.toFixed(2)}€`, 400);
    }
    cashChange = Math.round((cashPaidAmount - computedTotal) * 100) / 100;
  }

  const orderNotes: string[] = [];

  if (redemptionId) {
    const redemption = await rewardRedemptionsRepo.findByIdForUser(redemptionId, user.id);
    if (!redemption || redemption.status !== 'pending') {
      throw new AppError('Recompensa canjeada no válida o ya usada', 400);
    }
    const fulfilled = await rewardRedemptionsRepo.fulfillRedemption(redemptionId, user.id);
    if (!fulfilled) {
      throw new AppError('No se pudo aplicar la recompensa', 400);
    }
    orderNotes.push(`🎁 Recompensa: ${fulfilled.rewardName} (${fulfilled.zardasCost} Zardas)`);
  }

  const hasBirthdayGift = await usersRepo.consumeBirthdayFreeProduct(user.id);
  if (hasBirthdayGift) {
    orderNotes.push(`🎂 Regalo cumpleaños: ${BIRTHDAY_FREE_PRODUCT}`);
  }

  const order = await ordersRepo.create({
    userId: user.id,
    clientName: user.name,
    clientPhone: user.phone,
    items: orderItems,
    total: computedTotal,
    type,
    paymentMethod,
    cashPaidAmount: cashChange != null ? cashPaidAmount : undefined,
    cashChange,
    address: finalAddress,
    deliveryAddress: structuredDeliveryAddress,
    deliveryLat,
    deliveryLng,
    status: 'pending',
    queuePosition,
    estimatedTimeMinutes,
  });

  if (orderNotes.length > 0) {
    await ordersRepo.updateById(order.id, { internalNotes: orderNotes.join('\n') });
    order.internalNotes = orderNotes.join('\n');
  }

  await findOrCreateConversation(user.id, user.name, order.id);
  await generateAndStoreTicket(order);
  void sendWelcomeChat(order.id, user.id, user.name);

  await logOrderStatusChange({
    orderId: order.id,
    fromStatus: 'new',
    toStatus: 'pending',
    changedByName: user.name,
    changedByRole: 'system',
    changedById: user.id,
  });

  notifyNewOrder({
    orderId: order.id,
    clientName: order.clientName,
    total: order.total,
    type: order.type,
    itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
  });
  notifyOrderCreatedByEmail(user, order);
  return order;
}
