import { useCallback, useMemo } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';
import { formatDurationMinutes } from '../../utils/format';

const STATUS_EMOJI: Record<string, string> = {
  pending: '⏳',
  accepted: '✅',
  preparing: '👨‍🍳',
  ready: '🎉',
  on_the_way: '🛵',
};

function getKitchenNextStatus(type: string, current: string): string | null {
  if (current === 'accepted') return 'preparing';
  if (current === 'preparing') return 'ready';
  if (current === 'ready') return type === 'delivery' ? 'on_the_way' : 'delivered';
  return null;
}

export function AdminKitchenPage() {
  const fetcher = useCallback(() => adminApi.getOrders({ active: true }), []);
  const { data: orders, refresh } = useAdminPoll(fetcher, 3000);

  const kitchenOrders = useMemo(() => {
    const list =
      orders?.filter((o) => ['accepted', 'preparing', 'ready'].includes(o.status)) ?? [];
    return [...list].sort((a, b) => {
      if (a.isDelayed && !b.isDelayed) return -1;
      if (!a.isDelayed && b.isDelayed) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders]);

  const advance = async (id: string, type: string, current: string) => {
    const next = getKitchenNextStatus(type, current);
    if (next) {
      await adminApi.updateOrderStatus(id, next);
      refresh();
    }
  };

  return (
    <div className="kitchen-page">
      <div className="kitchen-header">
        <div>
          <h2>🍳 Vista Cocina</h2>
          <p className="hint">Pedidos en preparación · actualización cada 3s · prioridad: retrasos primero</p>
        </div>
        <div className="kitchen-count-badge">{kitchenOrders.length} en cocina</div>
      </div>

      <div className="kitchen-grid">
        {kitchenOrders.length === 0 && (
          <div className="kitchen-card kitchen-card--empty"><p>Sin pedidos en cocina 🎉</p></div>
        )}
        {kitchenOrders.map((order) => {
          const next = getKitchenNextStatus(order.type, order.status);
          return (
            <div
              key={order.id}
              className={`kitchen-card status-${order.status} ${order.isDelayed ? 'order-delayed' : ''}`}
            >
              <div className="kitchen-card-top">
                <div className="big-status">{STATUS_EMOJI[order.status]}</div>
                {order.isDelayed && <span className="delay-badge">🚨 Retraso</span>}
              </div>
              <div className="client-name">{order.clientName}</div>
              <p>#{order.id.slice(-6).toUpperCase()} · {order.type === 'pickup' ? '🏪 Recogida' : '🛵 Domicilio'}</p>
              {order.elapsedMinutes != null && (
                <p className="kitchen-elapsed">⏱️ {formatDurationMinutes(order.elapsedMinutes)} en cola</p>
              )}
              <ul className="kitchen-items">
                {order.items.map((item, i) => (
                  <li key={i}>
                    {item.quantity}x {item.productName}
                    {item.removedIngredients.length > 0 && (
                      <span className="kitchen-mod">SIN: {item.removedIngredients.join(', ')}</span>
                    )}
                  </li>
                ))}
              </ul>
              {next && (
                <button
                  type="button"
                  className="status-btn kitchen-advance-btn"
                  onClick={() => advance(order.id, order.type, order.status)}
                >
                  {order.status === 'ready'
                    ? order.type === 'delivery'
                      ? '🛵 En camino'
                      : '✓ Entregado'
                    : '→ Siguiente estado'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
