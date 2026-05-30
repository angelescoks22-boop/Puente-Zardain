import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { OrderTracker } from '../components/order/OrderTracker';
import { ReviewsSection } from '../components/reviews/ReviewsSection';
import { HomeActionHub, useHomeActions } from '../components/home/HomeActionHub';
import { getUsualOrder } from '../utils/recommendations';
import { useSettingsStore, isStoreOpen } from '../store/settingsStore';
import { useSmartEta, getOrderEtaMinutes } from '../hooks/useSmartEta';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const activeOrder = useOrderStore((s) => s.activeOrder);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const fetchActiveOrder = useOrderStore((s) => s.fetchActiveOrder);
  const refreshActiveOrder = useOrderStore((s) => s.refreshActiveOrder);
  const repeatOrder = useCartStore((s) => s.repeatOrder);
  const showToast = useAppStore((s) => s.showToast);

  const settings = useSettingsStore();
  const ordersOpen = isStoreOpen(settings);

  const { label: etaLabel, estimate } = useSmartEta('delivery', 60000);
  const activeEta = activeOrder && estimate
    ? getOrderEtaMinutes(activeOrder.queuePosition, estimate, activeOrder.type)?.label
    : undefined;

  useEffect(() => {
    if (user) {
      fetchOrders(user.id);
      fetchActiveOrder(user.id);
    }
  }, [user, fetchOrders, fetchActiveOrder]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { orderId } = (e as CustomEvent).detail;
      void refreshActiveOrder(orderId);
    };
    window.addEventListener('zardain:order-update', handler);
    return () => window.removeEventListener('zardain:order-update', handler);
  }, [refreshActiveOrder]);

  const usualOrder = user ? getUsualOrder(orders, user.id) : null;

  const handleRepeat = useCallback(() => {
    if (!usualOrder) return;
    repeatOrder(usualOrder);
    showToast('🔄 ¡Pedido repetido!');
    navigate('/cart');
  }, [usualOrder, repeatOrder, showToast, navigate]);

  const actions = useHomeActions(usualOrder, handleRepeat, ordersOpen);

  return (
    <div className="page home-page home-page--clean">
      <section className="home-welcome">
        <span className="home-welcome-emoji">🌉</span>
        <h1>Puente Zardain</h1>
        <p className="home-welcome-sub">¿Cómo quieres pedir hoy?</p>
        {ordersOpen && etaLabel !== '—' && (
          <p className="home-welcome-eta">⏱️ Entrega estimada: {etaLabel}</p>
        )}
      </section>

      {!ordersOpen && (
        <div className="business-msg msg-warning">
          👉 No estamos aceptando pedidos ahora mismo
        </div>
      )}

      <HomeActionHub actions={actions} />

      {activeOrder && (
        <Card className={`active-order-card ${activeOrder.status === 'ready' ? 'order-ready-glow' : ''}`}>
          <h3>Pedido en curso</h3>
          <OrderTracker
            status={activeOrder.status}
            queuePosition={activeOrder.queuePosition}
            type={activeOrder.type}
            etaLabel={activeEta}
          />
          <Button variant="secondary" fullWidth onClick={() => navigate(`/order/${activeOrder.id}`)}>
            Ver detalle
          </Button>
        </Card>
      )}

      <ReviewsSection />

      {!user && (
        <Card className="auth-cta">
          <p>Regístrate y gana <strong>25 Zardas</strong> de bienvenida</p>
          <Button fullWidth onClick={() => navigate('/auth')}>
            Crear cuenta
          </Button>
        </Card>
      )}
    </div>
  );
}
