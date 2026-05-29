import type { Server } from 'socket.io';

let io: Server | null = null;

export function setAdminIo(server: Server) {
  io = server;
}

export function notifyAdminDashboard() {
  io?.to('admin:dashboard').emit('admin_dashboard_update', { at: new Date().toISOString() });
}

export function notifySettingsUpdate(payload: Record<string, unknown>) {
  io?.emit('settings_update', payload);
}

export function notifyOrderUpdate(orderId: string, status: string, userId?: string) {
  io?.to('admin:dashboard').emit('admin_order_update', { orderId, status });
  if (userId) {
    io?.to(`user:${userId}`).emit('order_update', { orderId, status });
  }
}
