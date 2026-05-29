import { formatPrice } from '../../utils/format';
import { getCustomizationLabel } from '../../utils/ingredients';
import { getEtaForType } from '../../utils/estimateTime';
import type { QueueEstimate } from '../../utils/estimateTime';
import type { CartItem, OrderType, ValidatedAddress } from '../../types';
import { DeliveryAddressDisplay } from '../address/DeliveryAddressDisplay';
import { Card } from '../ui/Card';

type Props = {
  items: CartItem[];
  total: number;
  orderType: OrderType;
  validatedAddress: ValidatedAddress | null;
  queueEstimate: QueueEstimate | null;
};

export function CheckoutOrderSummary({
  items,
  total,
  orderType,
  validatedAddress,
  queueEstimate,
}: Props) {
  const eta = queueEstimate ? getEtaForType(queueEstimate, orderType) : null;

  return (
    <Card className="checkout-summary-pro">
      <h3>📦 Resumen del pedido</h3>

      <div className="summary-block">
        <span className="summary-label">🍔 Productos</span>
        {items.map((item) => (
          <div key={item.id} className="checkout-line">
            <span>
              {item.quantity}x {item.product.name}
              {item.removedIngredients.length > 0 && (
                <small className="mods">
                  {' '}
                  ({getCustomizationLabel(item.removedIngredients, item.product.ingredients)})
                </small>
              )}
            </span>
            <span>{formatPrice(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>

      {orderType === 'delivery' && (
        <div className="summary-block">
          <span className="summary-label">📍 Dirección</span>
          {validatedAddress ? (
            <DeliveryAddressDisplay deliveryAddress={validatedAddress} />
          ) : (
            <p className="summary-value">Selecciona una dirección válida</p>
          )}
        </div>
      )}

      {orderType === 'pickup' && (
        <div className="summary-block">
          <span className="summary-label">🏪 Recogida</span>
          <p className="summary-value">En local · Arroyomolinos</p>
        </div>
      )}

      {eta && (
        <div className="summary-block eta-block">
          <span className="summary-label">⏱️ Tiempo estimado</span>
          <p className="eta-value">{eta.label}</p>
          {queueEstimate && queueEstimate.activeOrders > 0 && (
            <p className="hint">
              {queueEstimate.activeOrders} pedido{queueEstimate.activeOrders !== 1 ? 's' : ''} en cola ahora
            </p>
          )}
        </div>
      )}

      <div className="checkout-total">
        <strong>💰 Total</strong>
        <strong>{formatPrice(total)}</strong>
      </div>
    </Card>
  );
}
