import type { Order } from '../../types';
import { TrustBadges } from '../ui/TrustBadges';
import { DeliveryAddressDisplay } from '../address/DeliveryAddressDisplay';

type Props = {
  order: Order;
  etaLabel?: string;
};

export function OrderConfirmationHero({ order, etaLabel }: Props) {
  return (
    <section className="order-confirmation-hero" aria-labelledby="order-confirmed-title">
      <div className="order-confirmation-icon" aria-hidden>
        ✅
      </div>
      <h2 id="order-confirmed-title">Pedido confirmado</h2>
      <p className="order-confirmation-sub">
        Pedido #{order.id.slice(-6)} · Te avisaremos en cada paso
      </p>

      <div className="order-confirmation-details">
        {etaLabel && etaLabel !== '—' && (
          <div className="order-confirmation-row">
            <span>⏱️ Tiempo estimado</span>
            <strong>{etaLabel}</strong>
          </div>
        )}
        {order.type === 'delivery' && (
          <div className="order-confirmation-row order-confirmation-address">
            <span>📍 Dirección</span>
            <DeliveryAddressDisplay
              address={order.address}
              deliveryAddress={order.deliveryAddress}
            />
          </div>
        )}
        {order.type === 'pickup' && (
          <div className="order-confirmation-row">
            <span>🏪 Recogida</span>
            <strong>En local · Arroyomolinos</strong>
          </div>
        )}
        <div className="order-confirmation-row">
          <span>💬 Chat</span>
          <strong>Disponible abajo — escríbenos si lo necesitas</strong>
        </div>
      </div>

      <TrustBadges compact />
    </section>
  );
}
