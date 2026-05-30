import type { Server } from 'socket.io';

let io: Server | null = null;

export function setAdminIo(server: Server) {
  io = server;
}

export type AdminNewOrderPayload = {
  orderId: string;
  clientName: string;
  total: number;
  type: string;
  itemCount: number;
  at: string;
};

export function notifyAdminDashboard() {
  io?.to('admin:dashboard').emit('admin_dashboard_update', { at: new Date().toISOString() });
}

export function notifyNewOrder(order: Omit<AdminNewOrderPayload, 'at'>) {
  const payload: AdminNewOrderPayload = { ...order, at: new Date().toISOString() };
  io?.to('admin:dashboard').emit('admin_new_order', payload);
  notifyAdminDashboard();
}

export function notifySettingsUpdate(payload: Record<string, unknown>) {
  io?.emit('settings_update', payload);
}

export function notifyBusinessMessagesUpdate() {
  io?.emit('business_messages_update', { at: new Date().toISOString() });
}

export function notifyOrderUpdate(orderId: string, status: string, userId?: string) {
  io?.to('admin:dashboard').emit('admin_order_update', { orderId, status });
  if (userId) {
    io?.to(`user:${userId}`).emit('order_update', { orderId, status });
  }
}
