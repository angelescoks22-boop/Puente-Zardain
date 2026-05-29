import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Modal';
import { SkeletonList } from '../components/ui/Skeleton';
import { ErrorRetry } from '../components/ui/ErrorRetry';
import { formatDate, formatPrice } from '../utils/format';

export function HistoryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const isLoading = useOrderStore((s) => s.isLoading);
  const error = useOrderStore((s) => s.error);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const repeatOrder = useCartStore((s) => s.repeatOrder);
  const saveFavoriteOrder = useAppStore((s) => s.saveFavoriteOrder);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    if (user) fetchOrders(user.id);
  }, [user, fetchOrders]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="page">
        <h1>📜 Historial</h1>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="page">
        <ErrorRetry message={error} onRetry={() => user && fetchOrders(user.id)} />
      </div>
    );
  }

  const completed = orders.filter((o) => ['delivered', 'ready', 'cancelled'].includes(o.status));

  if (completed.length === 0) {
    return (
      <div className="page">
        <EmptyState icon="📜" title="Sin historial" description="Tus pedidos aparecerán aquí" />
      </div>
    );
  }

  return (
    <div className="page history-page">
      <h1>📜 Historial</h1>
      {completed.map((order) => (
        <Card key={order.id} className="history-item">
          <div className="history-header">
            <span>{formatDate(order.createdAt)}</span>
            <span className={`status-pill status-${order.status}`}>{order.status}</span>
          </div>
          <p>{order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}</p>
          <strong>{formatPrice(order.total)}</strong>
          <div className="history-actions">
            <Button
              size="sm"
              onClick={() => {
                repeatOrder(order.items);
                showToast('Pedido cargado en carrito');
                navigate('/cart');
              }}
            >
              🔄 Repetir
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => saveFavoriteOrder(user.id, `Pedido ${formatDate(order.createdAt)}`, order.items)}
            >
              ❤️ Guardar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
