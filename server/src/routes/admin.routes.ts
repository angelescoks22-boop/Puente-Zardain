import { Router } from 'express';
import type { IOrder } from '../models/Order.js';
import * as ordersRepo from '../db/orders.js';
import * as usersRepo from '../db/users.js';
import * as productsRepo from '../db/products.js';
import * as reviewsRepo from '../db/reviews.js';
import * as rewardsRepo from '../db/rewards.js';
import * as settingsRepo from '../db/settings.js';
import * as businessMessagesRepo from '../db/businessMessages.js';
import * as orderStatusLogsRepo from '../db/orderStatusLogs.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { assertValidStatusTransition } from '../utils/gamification.js';
import { buildAdminDashboard, isOrderDelayed, orderElapsedMinutes } from '../services/adminDashboard.service.js';
import { notifyAdminDashboard, notifyOrderUpdate, notifyBusinessMessagesUpdate } from '../services/adminNotify.js';
import { toggleOrdersOpen, setBusinessStatus } from '../services/settings.service.js';
import { getEffectivePrepMinutes, runMaintenanceJobs } from '../services/adminJobs.service.js';
import { getSystemHealth, getRecentSystemLogs } from '../services/systemMonitor.service.js';
import { sendAutoChatForOrderStatus } from '../services/autoChat.service.js';
import { notifyOrderStatusByEmail } from '../services/orderEmail.service.js';
import { getDailyReports, getTodayLiveReport } from '../services/dailyReport.service.js';
import { buildOrderTicket, ticketToHtml } from '../services/ticket.service.js';
import { getOrderDateRange, type OrderDatePreset } from '../utils/dateFilters.js';
import type { BusinessStatus } from '../models/Settings.js';
import { paramStr } from '../utils/params.js';

const router = Router();
router.use(authenticate, requireAdmin);

async function getPrepLimit() {
  const settings = await settingsRepo.getSingleton();
  return settings?.prepTimeMinutes ?? 15;
}

function formatAdminOrder(order: IOrder, prepLimit?: number) {
  const limit = prepLimit ?? 15;
  return {
    id: order.id,
    userId: order.userId,
    clientName: order.clientName,
    clientPhone: order.clientPhone,
    items: order.items,
    total: order.total,
    type: order.type,
    paymentMethod: order.paymentMethod,
    cashPaidAmount: order.cashPaidAmount,
    cashChange: order.cashChange,
    address: order.address,
    deliveryAddress: order.deliveryAddress
      ? {
          fullAddress: order.deliveryAddress.fullAddress,
          city: order.deliveryAddress.city,
          lat: order.deliveryAddress.lat,
          lng: order.deliveryAddress.lng,
          portal: order.deliveryAddress.portal,
          floor: order.deliveryAddress.floor,
          door: order.deliveryAddress.door,
          details: order.deliveryAddress.details,
        }
      : undefined,
    deliveryLat: order.deliveryLat,
    deliveryLng: order.deliveryLng,
    status: order.status,
    queuePosition: order.queuePosition,
    internalNotes: order.internalNotes ?? '',
    cancelReason: order.cancelReason,
    elapsedMinutes: orderElapsedMinutes(order.createdAt),
    isDelayed: isOrderDelayed(order.createdAt, order.status, limit),
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString(),
  };
}

const CANCELLABLE_STATUSES = ['pending'];
const NON_CANCELLABLE_STATUSES = ['preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'];

router.get('/dashboard', async (_req, res) => {
  const dashboard = await buildAdminDashboard();
  res.json(dashboard);
});

router.get('/orders', async (req, res) => {
  const { active, from, to, date } = req.query;
  const filter: ordersRepo.OrderFilter = {};

  if (active === 'true') {
    filter.status = { nin: ['delivered', 'cancelled'] };
  }

  let rangeFrom = from ? new Date(from as string) : undefined;
  let rangeTo = to ? new Date(to as string) : undefined;

  if (date && typeof date === 'string' && date !== 'all' && !from && !to) {
    const preset = date as OrderDatePreset;
    if (['today', 'yesterday', 'week'].includes(preset)) {
      const range = getOrderDateRange(preset);
      rangeFrom = range.from;
      rangeTo = range.to;
    }
  }

  if (rangeFrom) filter.createdAtGte = rangeFrom;
  if (rangeTo) filter.createdAtLt = new Date(rangeTo.getTime() + 1);

  const orders = await ordersRepo.find(filter);
  const prepLimit = await getPrepLimit();
  res.json(orders.map((o) => formatAdminOrder(o, prepLimit)));
});

router.get('/orders/queue', async (_req, res) => {
  const active = await ordersRepo.find({ status: { nin: ['delivered', 'cancelled'] } }, 'createdAtAsc');
  const settings = await settingsRepo.getOrCreate();
  const prepTime = getEffectivePrepMinutes(settings, active.length);
  const prepLimit = prepTime;
  res.json({
    count: active.length,
    estimatedMinutes: active.length * prepTime,
    prepTimeMinutes: prepTime,
    orders: active.map((o) => formatAdminOrder(o, prepLimit)),
  });
});

router.get('/orders/map', async (_req, res) => {
  const orders = await ordersRepo.find({
    type: 'delivery',
    status: { nin: ['delivered', 'cancelled'] },
    deliveryLatExists: true,
  });

  res.json(orders.map((o) => ({
    id: o.id,
    clientName: o.clientName,
    address: o.address,
    deliveryAddress: o.deliveryAddress,
    status: o.status,
    total: o.total,
    lat: o.deliveryLat,
    lng: o.deliveryLng,
    createdAt: o.createdAt.toISOString(),
  })));
});

router.get('/orders/:id/timeline', async (req, res) => {
  const orderId = paramStr(req.params.id);
  const logs = await orderStatusLogsRepo.findByOrderId(orderId);
  res.json(logs.map((l) => ({
    id: l.id,
    fromStatus: l.fromStatus,
    toStatus: l.toStatus,
    changedByName: l.changedByName,
    changedByRole: l.changedByRole,
    reason: l.reason,
    createdAt: l.createdAt.toISOString(),
  })));
});

router.post('/orders/:id/cancel', async (req: AuthRequest, res) => {
  const { reason } = req.body;
  const orderId = paramStr(req.params.id);
  const order = await ordersRepo.findById(orderId);
  if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

  if (NON_CANCELLABLE_STATUSES.includes(order.status)) {
    return res.status(400).json({
      message: order.status === 'preparing'
        ? 'No se puede cancelar: el pedido ya está en preparación'
        : `No se puede cancelar en estado "${order.status}"`,
    });
  }
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return res.status(400).json({ message: 'Solo se pueden cancelar pedidos pendientes' });
  }
  if (!reason?.trim()) {
    return res.status(400).json({ message: 'Indica el motivo de la cancelación' });
  }

  const fromStatus = order.status;
  order.status = 'cancelled';
  order.cancelReason = String(reason).trim().slice(0, 300);
  await ordersRepo.save(order);

  await orderStatusLogsRepo.logOrderStatusChange({
    orderId: order.id,
    fromStatus,
    toStatus: 'cancelled',
    changedByName: req.user?.name ?? 'Admin',
    changedById: req.userId,
    reason: order.cancelReason,
  });

  notifyOrderUpdate(order.id, order.status, order.userId);
  void sendAutoChatForOrderStatus(order.id, 'cancelled');
  const client = await usersRepo.findById(order.userId);
  if (client) notifyOrderStatusByEmail(client, order, 'cancelled');
  notifyAdminDashboard();

  const prepLimit = await getPrepLimit();
  res.json(formatAdminOrder(order, prepLimit));
});

router.patch('/orders/:id/notes', async (req, res) => {
  const { internalNotes } = req.body;
  const order = await ordersRepo.updateById(req.params.id, {
    internalNotes: String(internalNotes ?? ''),
  });
  if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
  const prepLimit = await getPrepLimit();
  res.json(formatAdminOrder(order, prepLimit));
});

router.patch('/orders/:id/status', async (req: AuthRequest, res) => {
  const { status } = req.body;
  const orderId = paramStr(req.params.id);
  const order = await ordersRepo.findById(orderId);
  if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

  if (status === 'cancelled') {
    if (NON_CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({
        message: order.status === 'preparing'
          ? 'No se puede cancelar: el pedido ya está en preparación'
          : `No se puede cancelar en estado "${order.status}"`,
      });
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ message: 'Usa cancelar con motivo para pedidos pendientes' });
    }
  }

  try {
    assertValidStatusTransition(order.status, status);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Transición no válida';
    return res.status(400).json({ message });
  }

  const fromStatus = order.status;
  order.status = status;
  if (status === 'delivered') {
    order.completedAt = new Date();
    order.pickedUp = true;
    const user = await usersRepo.findById(order.userId);
    const settings = await settingsRepo.getSingleton();
    if (user) {
      const { getLevelForOrders, getZardasBonus, ZARDAS_PER_ORDER } = await import('../utils/gamification.js');
      const multiplier = settings?.promo?.active ? (settings.promo.zardasMultiplier ?? 1) : 1;
      const base = ZARDAS_PER_ORDER + getZardasBonus(user.level);
      user.zardas += Math.round(base * multiplier);
      user.orderCount += 1;
      const { level, progress } = getLevelForOrders(user.orderCount);
      user.level = level as typeof user.level;
      user.levelProgress = progress;
      await usersRepo.save(user);
    }
  }
  if (['preparing', 'ready'].includes(status)) {
    order.queuePosition = await ordersRepo.countAheadInQueue(order.createdAt);
  }
  await ordersRepo.save(order);

  if (fromStatus !== status) {
    await orderStatusLogsRepo.logOrderStatusChange({
      orderId: order.id,
      fromStatus,
      toStatus: status,
      changedByName: req.user?.name ?? 'Admin',
      changedById: req.userId,
    });
  }

  notifyOrderUpdate(order.id, order.status, order.userId);
  if (fromStatus !== status) {
    void sendAutoChatForOrderStatus(order.id, status);
    const client = await usersRepo.findById(order.userId);
    if (client) notifyOrderStatusByEmail(client, order, status);
  }
  notifyAdminDashboard();

  const prepLimit = await getPrepLimit();
  res.json(formatAdminOrder(order, prepLimit));
});

router.get('/orders/:id/ticket', async (req, res) => {
  const order = await ordersRepo.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

  const ticket = order.ticketSnapshot
    ? (order.ticketSnapshot as ReturnType<typeof buildOrderTicket>)
    : buildOrderTicket(order);

  res.json({
    id: ticket.id,
    client: ticket.client,
    phone: ticket.phone,
    address: ticket.address,
    payment: ticket.payment,
    time: ticket.time,
    items: ticket.items,
    total: ticket.total,
    status: order.status,
    autoGenerated: !!order.ticketGeneratedAt,
  });
});

router.get('/orders/:id/ticket/download', async (req, res) => {
  const order = await ordersRepo.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
  const ticket = order.ticketSnapshot
    ? (order.ticketSnapshot as ReturnType<typeof buildOrderTicket>)
    : buildOrderTicket(order);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.html"`);
  res.send(ticketToHtml(ticket));
});

router.get('/customers', async (_req, res) => {
  const users = await usersRepo.findByRole('client', { orderCount: -1 });
  res.json(users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    orderCount: u.orderCount,
    level: u.level,
    zardas: u.zardas,
    clientStatus: u.clientStatus,
    isBlocked: u.isBlocked,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.get('/customers/:id', async (req, res) => {
  const user = await usersRepo.findById(req.params.id);
  if (!user || user.role !== 'client') return res.status(404).json({ message: 'Cliente no encontrado' });
  const orders = await ordersRepo.find({ userId: user.id });
  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      address: user.address,
      addresses: user.addresses ?? [],
      orderCount: user.orderCount,
      level: user.level,
      zardas: user.zardas,
      clientStatus: user.clientStatus,
      streak: user.streak,
      createdAt: user.createdAt.toISOString(),
    },
    orders: orders.slice(0, 20).map(formatAdminOrder),
  });
});

router.patch('/customers/:id/status', async (req, res) => {
  const { clientStatus } = req.body;
  const user = await usersRepo.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Cliente no encontrado' });
  user.clientStatus = clientStatus;
  user.isBlocked = clientStatus === 'blocked';
  await usersRepo.save(user);
  res.json({ ok: true });
});

router.patch('/customers/:id/zardas', async (req, res) => {
  const { zardas, delta } = req.body;
  const user = await usersRepo.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Cliente no encontrado' });
  if (typeof zardas === 'number') user.zardas = zardas;
  if (typeof delta === 'number') user.zardas += delta;
  await usersRepo.save(user);
  res.json({ zardas: user.zardas });
});

router.get('/analytics', async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const [todayOrders, weekOrders, allDelivered, productStats, newClients, recurringClients] = await Promise.all([
    ordersRepo.find({ createdAtGte: startOfDay, status: { ne: 'cancelled' } }),
    ordersRepo.find({ createdAtGte: startOfWeek, status: { ne: 'cancelled' } }),
    ordersRepo.find({ status: 'delivered' }),
    ordersRepo.aggregateProductStats(),
    usersRepo.countDocuments({ role: 'client', createdAtGte: startOfWeek }),
    usersRepo.countDocuments({ role: 'client', orderCountGte: 2 }),
  ]);

  const salesToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const salesWeek = weekOrders.reduce((s, o) => s + o.total, 0);

  const hourlyMap: Record<number, number> = {};
  weekOrders.forEach((o) => {
    const h = o.createdAt.getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + 1;
  });
  const peakHours = Object.entries(hourlyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h, count]) => ({ hour: `${h}:00`, count }));

  const dailyAvg = weekOrders.length / 7;
  const topProducts = productStats.slice(0, 5).map((p) => ({
    _id: p.productName,
    total: p.total,
    revenue: p.revenue,
  }));
  const leastProducts = [...productStats].sort((a, b) => a.total - b.total).slice(0, 5).map((p) => ({
    _id: p.productName,
    total: p.total,
    revenue: p.revenue,
  }));

  res.json({
    sales: { today: salesToday, week: salesWeek, ordersToday: todayOrders.length, ordersWeek: weekOrders.length },
    peakHours,
    topProducts,
    leastProducts,
    clients: { new: newClients, recurring: recurringClients, total: await usersRepo.countDocuments({ role: 'client' }) },
    predictions: {
      estimatedDailyOrders: Math.round(dailyAvg),
      topDemand: topProducts[0]?._id ?? 'N/A',
    },
    totalDelivered: allDelivered.length,
  });
});

router.get('/reviews', async (req, res) => {
  const { filter } = req.query;
  const reviewFilter: reviewsRepo.ReviewFilter = {};

  if (filter === 'pending') reviewFilter.approved = false;
  else if (filter === 'approved') reviewFilter.approved = true;
  else if (filter === 'good') reviewFilter.ratingGte = 4;
  else if (filter === 'bad') reviewFilter.ratingLte = 2;
  else if (filter === 'featured') reviewFilter.featured = true;

  const reviews = await reviewsRepo.find(reviewFilter, 'createdDesc');
  res.json(reviews.map((r) => ({
    id: r.id,
    userName: r.userName,
    rating: r.rating,
    comment: r.comment,
    approved: r.approved,
    verified: r.verified !== false,
    adminResponse: r.adminResponse,
    featured: r.featured ?? false,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.patch('/reviews/:id', async (req, res) => {
  const { approved, adminResponse, featured } = req.body;
  await reviewsRepo.updateById(req.params.id, {
    ...(approved !== undefined ? { approved } : {}),
    ...(adminResponse !== undefined ? { adminResponse: String(adminResponse).slice(0, 500) } : {}),
    ...(featured !== undefined ? { featured: Boolean(featured) } : {}),
  });
  res.json({ ok: true });
});

router.get('/products', async (_req, res) => {
  const products = await productsRepo.find({}, 'category ASC');
  res.json(products.map((p) => ({ ...p, id: p.id })));
});

router.post('/products', async (req, res) => {
  const product = await productsRepo.create(req.body);
  res.status(201).json({ ...product, id: product.id });
});

router.put('/products/:id', async (req, res) => {
  const product = await productsRepo.updateById(req.params.id, req.body);
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  res.json({ ...product, id: product.id });
});

router.delete('/products/:id', async (req, res) => {
  await productsRepo.softDelete(req.params.id);
  res.json({ ok: true });
});

router.get('/rewards', async (_req, res) => {
  const rewards = await rewardsRepo.find();
  res.json(rewards.map((r) => ({ ...r, id: r.id })));
});

router.get('/rewards/stats', async (_req, res) => {
  const rewards = await rewardsRepo.find();
  const clients = await usersRepo.findByRole('client');
  const totalZardas = clients.reduce((sum, u) => sum + u.zardas, 0);
  const activeRewards = rewards.filter((r) => r.active);
  res.json({
    totalRewards: rewards.length,
    activeRewards: activeRewards.length,
    totalZardasInCirculation: totalZardas,
    avgZardasPerClient: clients.length ? Math.round(totalZardas / clients.length) : 0,
    cheapestReward: activeRewards.length ? Math.min(...activeRewards.map((r) => r.zardasCost)) : 0,
  });
});

router.post('/rewards', async (req, res) => {
  const reward = await rewardsRepo.create(req.body);
  res.status(201).json({ ...reward, id: reward.id });
});

router.put('/rewards/:id', async (req, res) => {
  const reward = await rewardsRepo.updateById(req.params.id, req.body);
  if (!reward) return res.status(404).json({ message: 'Recompensa no encontrada' });
  res.json({ ...reward, id: reward.id });
});

router.delete('/rewards/:id', async (req, res) => {
  const reward = await rewardsRepo.deleteById(req.params.id);
  if (!reward) return res.status(404).json({ message: 'Recompensa no encontrada' });
  res.json({ ok: true, id: req.params.id });
});

router.get('/settings', async (_req, res) => {
  const settings = await settingsRepo.getOrCreate();
  res.json(settings);
});

router.put('/settings', async (req, res) => {
  const settings = await settingsRepo.mergeUpdate(req.body);
  res.json(settings);
});

router.post('/settings/toggle-promo', async (_req, res) => {
  const settings = await settingsRepo.getOrCreate();
  if (!settings.promo) settings.promo = { active: false, zardasMultiplier: 2, label: 'Doble Zardas hoy' };
  settings.promo.active = !settings.promo.active;
  await settingsRepo.save(settings);
  notifyAdminDashboard();
  res.json({ promo: settings.promo });
});

router.post('/settings/toggle-orders', async (_req, res) => {
  const settings = await toggleOrdersOpen();
  notifyAdminDashboard();
  res.json({ ordersOpen: settings.ordersOpen, businessStatus: settings.businessStatus });
});

router.post('/settings/business-status', async (req, res) => {
  const { status } = req.body as { status: BusinessStatus };
  if (!['open', 'closed', 'saturated'].includes(status)) {
    return res.status(400).json({ message: 'Estado no válido' });
  }
  const settings = await setBusinessStatus(status);
  notifyAdminDashboard();
  res.json({ businessStatus: settings.businessStatus, ordersOpen: settings.ordersOpen });
});

router.post('/settings/prep-time', async (req, res) => {
  const { prepTimeMinutes } = req.body;
  if (typeof prepTimeMinutes !== 'number' || prepTimeMinutes < 5 || prepTimeMinutes > 120) {
    return res.status(400).json({ message: 'Tiempo entre 5 y 120 minutos' });
  }
  const settings = await settingsRepo.getOrCreate();
  settings.prepTimeMinutes = prepTimeMinutes;
  await settingsRepo.save(settings);
  notifyAdminDashboard();
  res.json({ prepTimeMinutes: settings.prepTimeMinutes });
});

router.get('/system/health', async (_req, res) => {
  const health = await getSystemHealth();
  res.json(health);
});

router.get('/system/logs', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const logs = await getRecentSystemLogs(limit);
  res.json(logs.map((l) => ({
    id: l.id,
    level: l.level,
    message: l.message,
    meta: l.meta,
    createdAt: l.createdAt.toISOString(),
  })));
});

router.post('/system/run-jobs', async (_req, res) => {
  const results = await runMaintenanceJobs();
  notifyAdminDashboard();
  res.json({ results });
});

router.get('/reports/daily', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 7, 30);
  const reports = await getDailyReports(limit);
  res.json(reports.map((r) => ({
    date: r.date,
    totalOrders: r.totalOrders,
    totalRevenue: r.totalRevenue,
    topProduct: r.topProduct,
    peakHour: r.peakHour,
    newClients: r.newClients,
    recurringClients: r.recurringClients,
    avgTicket: r.avgTicket,
    cancelledOrders: r.cancelledOrders,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get('/reports/daily/today', async (_req, res) => {
  const report = await getTodayLiveReport();
  res.json(report);
});

router.get('/messages', async (_req, res) => {
  const messages = await businessMessagesRepo.find({}, true);
  res.json(messages.map((m) => ({
    id: m.id,
    text: m.text,
    type: m.type,
    active: m.active,
    createdAt: m.createdAt?.toISOString(),
  })));
});

router.post('/messages', async (req, res) => {
  const text = String(req.body.text ?? '').trim();
  if (!text) {
    return res.status(400).json({ message: 'Escribe el texto del mensaje' });
  }
  const type = ['info', 'warning', 'promo'].includes(req.body.type) ? req.body.type : 'info';
  const msg = await businessMessagesRepo.create({ text, type, active: req.body.active !== false });
  notifyBusinessMessagesUpdate();
  res.status(201).json({
    id: msg.id,
    text: msg.text,
    type: msg.type,
    active: msg.active,
    createdAt: msg.createdAt?.toISOString(),
  });
});

router.patch('/messages/:id', async (req, res) => {
  const id = paramStr(req.params.id);
  const patch: { text?: string; type?: 'info' | 'warning' | 'promo'; active?: boolean } = {};
  if (req.body.text !== undefined) {
    const text = String(req.body.text).trim();
    if (!text) return res.status(400).json({ message: 'El texto no puede estar vacío' });
    patch.text = text;
  }
  if (req.body.type !== undefined) {
    if (!['info', 'warning', 'promo'].includes(req.body.type)) {
      return res.status(400).json({ message: 'Tipo inválido' });
    }
    patch.type = req.body.type;
  }
  if (req.body.active !== undefined) patch.active = Boolean(req.body.active);

  const updated = await businessMessagesRepo.updateById(id, patch);
  if (!updated) return res.status(404).json({ message: 'Mensaje no encontrado' });
  notifyBusinessMessagesUpdate();
  res.json({
    id: updated.id,
    text: updated.text,
    type: updated.type,
    active: updated.active,
    createdAt: updated.createdAt?.toISOString(),
  });
});

router.delete('/messages/:id', async (req, res) => {
  const id = paramStr(req.params.id);
  const existing = await businessMessagesRepo.findById(id);
  if (!existing) return res.status(404).json({ message: 'Mensaje no encontrado' });
  await businessMessagesRepo.deleteById(id);
  notifyBusinessMessagesUpdate();
  res.json({ ok: true });
});

export default router;
