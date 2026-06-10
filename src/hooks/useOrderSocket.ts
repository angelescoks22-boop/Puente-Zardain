import { useEffect } from 'react';
import { getChatSocket } from '../api/chatSocket';
import { useOrderStore } from '../store/orderStore';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/auth';
import { requestPushPermission, showPushNotification } from '../utils/pushNotifications';

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  pending: { title: 'Pedido recibido', body: 'Hemos recibido tu pedido' },
  accepted: { title: 'Pedido aceptado', body: 'Tu pedido ha sido confirmado' },
  preparing: { title: 'En cocina', body: 'Estamos preparando tu pedido' },
  ready: { title: '¡Pedido listo!', body: 'Pasa a recogerlo o espera al repartidor' },
  on_the_way: { title: 'En camino', body: 'Tu pedido va de camino a tu dirección' },
  delivered: { title: 'Entregado', body: '¡Disfruta tu comida!' },
  cancelled: { title: 'Pedido cancelado', body: 'Contacta con nosotros si tienes dudas' },
};

export function useOrderSocket() {
  const user = useAuthStore((s) => s.user);
  const refreshActiveOrder = useOrderStore((s) => s.refreshActiveOrder);
  const activeOrder = useOrderStore((s) => s.activeOrder);
  const addNotification = useAppStore((s) => s.addNotification);
  const showToast = useAppStore((s) => s.showToast);
  const showOrderReady = useAppStore((s) => s.showOrderReady);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    void requestPushPermission();
    const socket = getChatSocket();
    if (!socket) return;

    const handler = async (payload: { orderId: string; status: string }) => {
      void refreshActiveOrder(payload.orderId);
      window.dispatchEvent(new CustomEvent('zardain:order-update', { detail: payload }));

      const msg = STATUS_MESSAGES[payload.status];
      if (msg) {
        addNotification(msg.title, msg.body);
        showToast(`${msg.title} — ${msg.body}`);
        showPushNotification(msg.title, msg.body);
      }

      if (payload.status === 'ready') {
        const order = useOrderStore.getState().activeOrder;
        const type = order?.id === payload.orderId ? order.type : 'pickup';
        showOrderReady(payload.orderId, type);
      }

      if (payload.status === 'delivered') {
        try {
          const freshUser = await authApi.getCurrentUser();
          if (freshUser) useAuthStore.getState().setUser(freshUser);
        } catch {
          // non-critical
        }
      }
    };

    socket.on('order_update', handler);
    return () => {
      socket.off('order_update', handler);
    };
  }, [user, refreshActiveOrder, addNotification, showToast, showOrderReady]);

  // Show overlay if user lands with active order already ready
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'ready') return;
    const dismissed = sessionStorage.getItem(`ready-dismissed-${activeOrder.id}`);
    if (!dismissed) {
      showOrderReady(activeOrder.id, activeOrder.type);
    }
  }, [activeOrder, showOrderReady]);
}
