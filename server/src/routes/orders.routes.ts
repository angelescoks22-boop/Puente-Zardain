import { Router } from 'express';
import type { IOrder } from '../models/Order.js';
import * as ordersRepo from '../db/orders.js';
import * as orderFeedbacksRepo from '../db/orderFeedbacks.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { mapClientStatus } from '../utils/gamification.js';
import { grantOrderCompletionRewards } from '../services/orderRewards.service.js';
import { AppError } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { buildOrderTicket, ticketToHtml } from '../services/ticket.service.js';
import { createOrder } from '../services/order.service.js';
import { paramStr } from '../utils/params.js';
import { validateBody } from '../middleware/validate.js';
import { createOrderSchema } from '../schemas/order.schema.js';

const router = Router();

function formatDeliveryAddress(order: IOrder) {
  if (order.deliveryAddress?.fullAddress) {
    return {
      fullAddress: order.deliveryAddress.fullAddress,
      city: order.deliveryAddress.city,
      lat: order.deliveryAddress.lat,
      lng: order.deliveryAddress.lng,
      portal: order.deliveryAddress.portal,
      floor: order.deliveryAddress.floor,
      door: order.deliveryAddress.door,
      details: order.deliveryAddress.details,
    };
  }
  if (order.address && order.deliveryLat != null && order.deliveryLng != null) {
    return {
      fullAddress: order.address,
      city: 'Arroyomolinos',
      lat: order.deliveryLat,
      lng: order.deliveryLng,
    };
  }
  return undefined;
}

function formatOrderForClient(order: IOrder, feedbackSubmitted = false) {
  const deliveryAddress = formatDeliveryAddress(order);
  return {
    id: order.id,
    userId: order.userId,
    items: order.items.map((item, idx) => ({
      id: `${order.id}-${idx}`,
      productId: item.productId,
      product: {
        id: item.productId,
        name: item.productName,
        image: item.productImage,
        description: '',
        price: item.unitPrice,
        category: 'hamburguesas',
        ingredients: [],
      },
      quantity: item.quantity,
      removedIngredients: item.removedIngredients,
      unitPrice: item.unitPrice,
    })),
    total: order.total,
    type: order.type,
    paymentMethod: order.paymentMethod,
    cashPaidAmount: order.cashPaidAmount,
    cashChange: order.cashChange,
    address: order.address,
    deliveryAddress,
    status: mapClientStatus(order.status),
    queuePosition: order.queuePosition,
    estimatedTimeMinutes: order.estimatedTimeMinutes,
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString(),
    pickedUp: order.pickedUp,
    feedbackSubmitted,
  };
}

router.post('/', authenticate, validateBody(createOrderSchema), asyncHandler(async (req: AuthRequest, res) => {
  const user = req.user!;
  const order = await createOrder(user, req.body);
  res.status(201).json(formatOrderForClient(order));
}));

router.get('/my', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const orders = await ordersRepo.find({ userId: req.userId });
  const feedbacks = await orderFeedbacksRepo.findByUserId(req.userId!);
  const feedbackSet = new Set(feedbacks.map((f) => f.orderId));
  res.json(orders.map((o) => formatOrderForClient(o, feedbackSet.has(o.id))));
}));

router.get('/active', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const order = await ordersRepo.findOne({
    userId: req.userId,
    status: { nin: ['delivered', 'cancelled'] },
  });
  res.json(order ? formatOrderForClient(order) : null);
}));

router.get('/:id/ticket', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const orderId = paramStr(req.params.id);
  const order = await ordersRepo.findOne({ id: orderId, userId: req.userId });
  if (!order) throw new AppError('Pedido no encontrado', 404);
  const ticket = order.ticketSnapshot
    ? (order.ticketSnapshot as ReturnType<typeof buildOrderTicket>)
    : buildOrderTicket(order);
  res.json(ticket);
}));

router.get('/:id/ticket/download', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const orderId = paramStr(req.params.id);
  const order = await ordersRepo.findOne({ id: orderId, userId: req.userId });
  if (!order) throw new AppError('Pedido no encontrado', 404);
  const ticket = order.ticketSnapshot
    ? (order.ticketSnapshot as ReturnType<typeof buildOrderTicket>)
    : buildOrderTicket(order);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.html"`);
  res.send(ticketToHtml(ticket));
}));

router.get('/:id/feedback', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const orderId = paramStr(req.params.id);
  const feedback = await orderFeedbacksRepo.findOne({ orderId, userId: req.userId });
  res.json(feedback ? { rating: feedback.rating, comment: feedback.comment } : null);
}));

router.post('/:id/feedback', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { rating, comment } = req.body;
  if (!['like', 'dislike'].includes(rating)) {
    throw new AppError('Valoración no válida', 400);
  }

  const orderId = paramStr(req.params.id);
  const order = await ordersRepo.findOne({
    id: orderId,
    userId: req.userId,
    status: { in: ['delivered', 'ready'] },
  });
  if (!order) throw new AppError('Pedido no encontrado o aún no completado', 404);

  const existing = await orderFeedbacksRepo.findOne({ orderId: order.id });
  if (existing) throw new AppError('Ya enviaste tu opinión sobre este pedido', 409);

  const feedback = await orderFeedbacksRepo.create({
    orderId: order.id,
    userId: req.userId!,
    rating,
    comment: comment?.trim()?.slice(0, 200),
  });

  res.status(201).json({ rating: feedback.rating, comment: feedback.comment });
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const orderId = paramStr(req.params.id);
  const order = await ordersRepo.findOne({ id: orderId, userId: req.userId });
  if (!order) throw new AppError('Pedido no encontrado', 404);
  const hasFeedback = await orderFeedbacksRepo.exists({ orderId: order.id });
  res.json(formatOrderForClient(order, hasFeedback));
}));

router.post('/:id/complete-rewards', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const orderId = paramStr(req.params.id);
  const order = await ordersRepo.findOne({ id: orderId, userId: req.userId, status: 'delivered' });
  if (!order) throw new AppError('Pedido no encontrado', 404);

  const result = await grantOrderCompletionRewards(order);
  if (!result.granted) {
    return res.json({ message: 'Recompensas ya aplicadas a este pedido', alreadyGranted: true });
  }

  res.json({
    zardasEarned: result.zardasEarned,
    user: result.user,
  });
}));

export default router;
