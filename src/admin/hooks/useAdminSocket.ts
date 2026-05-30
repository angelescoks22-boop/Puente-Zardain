import { useEffect } from 'react';
import { getChatSocket } from '../../api/chatSocket';

export type AdminNewOrderPayload = {
  orderId: string;
  clientName: string;
  total: number;
  type: string;
  itemCount: number;
  at: string;
};

type RefreshHandler = () => void;
type NewOrderHandler = (payload: AdminNewOrderPayload) => void;

const refreshHandlers = new Set<RefreshHandler>();
const newOrderHandlers = new Set<NewOrderHandler>();

function setupAdminListeners() {
  const socket = getChatSocket();
  if (!socket) return;

  socket.off('admin_dashboard_update');
  socket.off('admin_order_update');
  socket.off('admin_new_order');

  socket.on('admin_dashboard_update', () => {
    refreshHandlers.forEach((h) => h());
  });

  socket.on('admin_order_update', () => {
    refreshHandlers.forEach((h) => h());
  });

  socket.on('admin_new_order', (payload: AdminNewOrderPayload) => {
    newOrderHandlers.forEach((h) => h(payload));
    refreshHandlers.forEach((h) => h());
  });
}

export function onAdminDashboardUpdate(handler: RefreshHandler) {
  refreshHandlers.add(handler);
  setupAdminListeners();
  return () => {
    refreshHandlers.delete(handler);
  };
}

export function onAdminNewOrder(handler: NewOrderHandler) {
  newOrderHandlers.add(handler);
  setupAdminListeners();
  return () => {
    newOrderHandlers.delete(handler);
  };
}

export function useAdminSocketInit() {
  useEffect(() => {
    setupAdminListeners();
  }, []);
}
