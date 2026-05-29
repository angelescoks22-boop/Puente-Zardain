import { useEffect } from 'react';
import { getChatSocket } from '../../api/chatSocket';

type Handler = () => void;

const handlers = new Set<Handler>();

function setupAdminListeners() {
  const socket = getChatSocket();
  if (!socket) return;

  socket.off('admin_dashboard_update');
  socket.off('admin_order_update');

  socket.on('admin_dashboard_update', () => {
    handlers.forEach((h) => h());
  });

  socket.on('admin_order_update', () => {
    handlers.forEach((h) => h());
  });
}

export function onAdminDashboardUpdate(handler: Handler) {
  handlers.add(handler);
  setupAdminListeners();
  return () => {
    handlers.delete(handler);
  };
}

export function useAdminSocketInit() {
  useEffect(() => {
    setupAdminListeners();
  }, []);
}
