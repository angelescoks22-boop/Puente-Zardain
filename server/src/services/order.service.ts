import * as ordersRepo from '../db/orders.js';
import * as productsRepo from '../db/products.js';
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
};

export async function createOrder(user: IUser, data: CreateOrderInput) {
  if (user.isBlocked || user.clientStatus === 'blocked') {
    throw new AppError('Tu cuenta está bloqueada', 403);
  }

  const settings = await assertOrdersAccepted();

  const { items, total, type, paymentMethod, address, deliveryAddress, cashPaidAmount } = data;
  if (!items?.length || !total || !type || !paymentMethod) {
    throw new AppError('Pedido incompleto', 400);
  }
  if (total < (settings.minOrderAmount ?? 15)) {
    throw new AppError(`Pedido mínimo ${settings.minOrderAmount ?? 15}€`, 400);
  }

  let cashChange: number | undefined;
  if (paymentMethod === 'cash') {
    if (typeof cashPaidAmount !== 'number' || Number.isNaN(cashPaidAmount)) {
      throw new AppError('Indica con cuánto vas a pagar en efectivo', 400);
    }
    if (cashPaidAmount < total) {
      throw new AppError(`El importe debe ser al menos ${total.toFixed(2)}€`, 400);
    }
    cashChange = Math.round((cashPaidAmount - total) * 100) / 100;
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

  const orderItems = await Promise.all(
    items.map(async (item) => {
      const product = await productsRepo.findById(item.productId);
      return {
        productId: item.productId,
        productName: product?.name ?? 'Producto',
        productImage: product?.image ?? '🍔',
        quantity: item.quantity,
        removedIngredients: item.removedIngredients ?? [],
        unitPrice: item.unitPrice,
      };
    }),
  );

  const order = await ordersRepo.create({
    userId: user.id,
    clientName: user.name,
    clientPhone: user.phone,
    items: orderItems,
    total,
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
