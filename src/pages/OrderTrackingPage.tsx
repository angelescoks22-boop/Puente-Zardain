import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useOrderStore } from '../store/orderStore';
import { useOrderSocket } from '../hooks/useOrderSocket';
import { useSmartEta, getOrderEtaMinutes } from '../hooks/useSmartEta';
import { OrderTracker } from '../components/order/OrderTracker';
import { OrderChatPanel } from '../components/chat/OrderChatPanel';
import { OrderTicketDownload } from '../components/order/OrderTicketDownload';
import { OrderFeedbackPanel } from '../components/order/OrderFeedbackPanel';
import { Card } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { ErrorRetry } from '../components/ui/ErrorRetry';
import { formatDate, formatPrice } from '../utils/format';
import { getCustomizationLabel } from '../utils/ingredients';
import { DeliveryAddressDisplay } from '../components/address/DeliveryAddressDisplay';
import { OrderConfirmationHero } from '../components/order/OrderConfirmationHero';
import { TrustBadges } from '../components/ui/TrustBadges';
import * as ordersApi from '../api/orders';

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const justConfirmed = Boolean((location.state as { confirmed?: boolean } | null)?.confirmed);
  const activeOrder = useOrderStore((s) => s.activeOrder);
  const orders = useOrderStore((s) => s.orders);
  const refreshActiveOrder = useOrderStore((s) => s.refreshActiveOrder);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const order = orders.find((o) => o.id === orderId) ?? (activeOrder?.id === orderId ? activeOrder : null);

  useOrderSocket();
  const { estimate } = useSmartEta(order?.type ?? 'delivery', 30000);
  const etaLabel = order && estimate
    ? getOrderEtaMinutes(order.queuePosition, estimate, order.type)?.label
    : undefined;

  const loadOrder = async () => {
    if (!orderId) return;
    setError('');
    setLoading(true);
    try {
      const fetched = await ordersApi.getOrderById(orderId);
      if (!fetched) {
        setError('Pedido no encontrado');
      } else {
        await refreshActiveOrder(orderId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pedido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrder();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !order) {
    return <PageLoader label="Cargando pedido..." />;
  }

  if (error && !order) {
    return (
      <div className="page">
        <ErrorRetry message={error} onRetry={loadOrder} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page">
        <ErrorRetry message="Pedido no encontrado" onRetry={() => window.history.back()} retryLabel="Volver" />
      </div>
    );
  }

  const showFeedback = ['delivered', 'ready'].includes(order.status);
  const showConfirmation = justConfirmed || order.status === 'received';

  return (
    <div className="page order-page">
      {showConfirmation && <OrderConfirmationHero order={order} etaLabel={etaLabel} />}

      <h1>{showConfirmation ? '📦 Tu pedido' : '📦 Seguimiento'}</h1>
      <p className="order-id">Pedido #{order.id.slice(-6)} · {formatDate(order.createdAt)}</p>

      <OrderTracker
        status={order.status}
        queuePosition={order.queuePosition}
        type={order.type}
        etaLabel={etaLabel}
      />

      <Card>
        <h3>Detalle</h3>
        {order.items.map((item) => (
          <div key={item.id} className="checkout-line">
            <span>
              {item.quantity}x {item.product.name}
              {item.removedIngredients.length > 0 && (
                <small> ({getCustomizationLabel(item.removedIngredients, item.product.ingredients)})</small>
              )}
            </span>
            <span>{formatPrice(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
        <div className="checkout-total">
          <strong>Total</strong>
          <strong>{formatPrice(order.total)}</strong>
        </div>
        <div className="hint order-delivery-meta">
          {order.type === 'pickup' ? (
            <span>🏪 Recogida en local</span>
          ) : (
            <div className="order-delivery-row">
              <span>🛵 Entrega:</span>
              <DeliveryAddressDisplay
                address={order.address}
                deliveryAddress={order.deliveryAddress}
              />
            </div>
          )}
          <span className="order-payment-meta">
            {order.paymentMethod === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'}
            {order.paymentMethod === 'cash' && order.cashPaidAmount != null && order.cashChange != null && (
              <span className="order-cash-detail">
                {' '}· Pagas {formatPrice(order.cashPaidAmount)} · Cambio {formatPrice(order.cashChange)}
              </span>
            )}
          </span>
        </div>
      </Card>

      <OrderTicketDownload orderId={order.id} />

      {order.status === 'ready' && order.type === 'pickup' && (
        <div className="ready-banner">🎉 ¡Tu pedido está listo! Pasa a recogerlo</div>
      )}

      {showFeedback && (
        <Card>
          <OrderFeedbackPanel
            orderId={order.id}
            alreadySubmitted={order.feedbackSubmitted}
          />
        </Card>
      )}

      <OrderChatPanel orderId={order.id} />

      {!showConfirmation && <TrustBadges compact className="order-trust-footer" />}
    </div>
  );
}
