import { useState, useMemo, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';

import { useCartStore } from '../store/cartStore';

import { useOrderStore } from '../store/orderStore';

import { useAppStore } from '../store/appStore';

import { Button } from '../components/ui/Button';

import { Card } from '../components/ui/Card';

import { ErrorRetry } from '../components/ui/ErrorRetry';
import { DeliveryAddressForm } from '../components/address/DeliveryAddressForm';
import { TrustBadges } from '../components/ui/TrustBadges';

import { CheckoutOrderSummary } from '../components/checkout/CheckoutOrderSummary';

import { getQueueEstimate } from '../api/products';

import type { QueueEstimate } from '../utils/estimateTime';

import { useSettingsStore, isStoreOpen, isStoreSaturated } from '../store/settingsStore';
import type { OrderType, PaymentMethod, ValidatedAddress } from '../types';
import { formatPrice } from '../utils/format';
import {
  EMPTY_DELIVERY_DETAILS,
  pickDeliveryDetails,
  sanitizeDeliveryDetailsFields,
} from '../utils/deliveryAddress';



export function CheckoutPage() {

  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);

  const setUser = useAuthStore((s) => s.setUser);

  const items = useCartStore((s) => s.items);

  const total = useCartStore((s) => s.total());

  const clearCart = useCartStore((s) => s.clearCart);

  const createOrder = useOrderStore((s) => s.createOrder);

  const addNotification = useAppStore((s) => s.addNotification);

  const showToast = useAppStore((s) => s.showToast);
  const settings = useSettingsStore();
  const storeOpen = isStoreOpen(settings);
  const storeSaturated = isStoreSaturated(settings);



  const defaultSaved = useMemo(

    () => user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0],

    [user?.addresses],

  );



  const [orderType, setOrderType] = useState<OrderType>('pickup');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashPaidAmount, setCashPaidAmount] = useState('');

  const [validatedAddress, setValidatedAddress] = useState<ValidatedAddress | null>(

    defaultSaved

      ? {

          fullAddress: defaultSaved.fullAddress,

          city: defaultSaved.city,

          lat: defaultSaved.lat,

          lng: defaultSaved.lng,

          placeId: defaultSaved.placeId,

        }

      : null,

  );

  const [deliveryDetails, setDeliveryDetails] = useState(() =>
    defaultSaved ? pickDeliveryDetails(defaultSaved) : EMPTY_DELIVERY_DETAILS,
  );

  const [queueEstimate, setQueueEstimate] = useState<QueueEstimate | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');



  useEffect(() => {

    getQueueEstimate().then(setQueueEstimate).catch(() => {});

    const interval = setInterval(() => {

      getQueueEstimate().then(setQueueEstimate).catch(() => {});

    }, 45000);

    return () => clearInterval(interval);

  }, []);



  if (!user) {

    navigate('/auth');

    return null;

  }



  if (items.length === 0) {

    navigate('/cart');

    return null;

  }



  const deliveryPayload = validatedAddress

    ? { ...validatedAddress, ...sanitizeDeliveryDetailsFields(deliveryDetails) }

    : null;



  const cashPaidValue = parseFloat(cashPaidAmount.replace(',', '.'));
  const cashChange =
    paymentMethod === 'cash' &&
    !Number.isNaN(cashPaidValue) &&
    cashPaidValue >= total
      ? Math.round((cashPaidValue - total) * 100) / 100
      : null;

  const handleSubmit = async () => {
    setError('');

    if (!storeOpen) {
      setError('El local está cerrado — no puedes confirmar pedidos ahora');
      return;
    }

    if (paymentMethod === 'cash') {
      if (!cashPaidAmount.trim() || Number.isNaN(cashPaidValue)) {
        setError('Indica con cuánto vas a pagar en efectivo');
        return;
      }
      if (cashPaidValue < total) {
        setError(`Debes pagar al menos ${formatPrice(total)}`);
        return;
      }
    }

    if (orderType === 'delivery') {
      if (!validatedAddress) {
        setError('Selecciona una dirección válida en Arroyomolinos');
        return;
      }
    }



    setLoading(true);

    try {

      const order = await createOrder({

        userId: user.id,

        items: items.map((i) => ({

          productId: i.productId,

          quantity: i.quantity,

          removedIngredients: i.removedIngredients,

          unitPrice: i.unitPrice,

        })),

        total,

        type: orderType,

        paymentMethod,

        cashPaidAmount: paymentMethod === 'cash' ? cashPaidValue : undefined,

        address: orderType === 'delivery' ? deliveryPayload?.fullAddress : undefined,

        deliveryAddress: orderType === 'delivery' ? deliveryPayload ?? undefined : undefined,

      });



      const updatedUser = useAuthStore.getState().user;

      if (updatedUser) setUser(updatedUser);



      clearCart();

      addNotification('Pedido recibido', `Tu pedido #${order.id.slice(-6)} está en cola`);

      showToast('¡Pedido confirmado!');



      navigate(`/order/${order.id}`, { state: { confirmed: true } });

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Error al enviar pedido');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="page checkout-page">

      <h1>🚚 Finalizar pedido</h1>

      {!storeOpen && (
        <div className="business-msg msg-warning">
          ⏸️ El local está cerrado — no puedes confirmar pedidos ahora
        </div>
      )}

      {storeSaturated && storeOpen && (
        <div className="business-msg msg-warning">
          🔥 Mucho volumen — el tiempo de entrega puede ser mayor de lo habitual
        </div>
      )}

      <CheckoutOrderSummary

        items={items}

        total={total}

        orderType={orderType}

        validatedAddress={deliveryPayload}

        queueEstimate={queueEstimate}

      />



      <Card>

        <h3>Tipo de pedido</h3>

        <div className="option-group">

          <button

            type="button"

            className={`option-btn ${orderType === 'pickup' ? 'active' : ''}`}

            onClick={() => setOrderType('pickup')}

          >

            🏪 Recogida en local

          </button>

          <button

            type="button"

            className={`option-btn ${orderType === 'delivery' ? 'active' : ''}`}

            onClick={() => setOrderType('delivery')}

          >

            🛵 Entrega a domicilio

          </button>

        </div>

      </Card>



      {orderType === 'delivery' && (

        <Card className="delivery-card">

          <DeliveryAddressForm

            validatedAddress={validatedAddress}

            onValidatedAddressChange={setValidatedAddress}

            details={deliveryDetails}

            onDetailsChange={setDeliveryDetails}

            disabled={loading}

          />

          {user.addresses && user.addresses.length > 1 && (

            <div className="saved-address-quick">

              <p className="hint">Usar guardada:</p>

              <div className="option-group">

                {user.addresses.map((addr) => (

                  <button

                    key={addr.id}

                    type="button"

                    className={`option-btn ${validatedAddress?.fullAddress === addr.fullAddress ? 'active' : ''}`}

                    onClick={() => {

                      setValidatedAddress({

                        fullAddress: addr.fullAddress,

                        city: addr.city,

                        lat: addr.lat,

                        lng: addr.lng,

                        placeId: addr.placeId,

                      });

                      setDeliveryDetails(pickDeliveryDetails(addr));

                    }}

                  >

                    {addr.label ?? addr.fullAddress.split(',')[0]}

                  </button>

                ))}

              </div>

            </div>

          )}

        </Card>

      )}



      <Card>

        <h3>Forma de pago</h3>

        <p className="hint">Pago al recoger o entregar — sin pago online</p>

        <div className="option-group">

          <button

            type="button"

            className={`option-btn ${paymentMethod === 'cash' ? 'active' : ''}`}

            onClick={() => setPaymentMethod('cash')}

          >

            💵 Efectivo

          </button>

          <button

            type="button"

            className={`option-btn ${paymentMethod === 'card' ? 'active' : ''}`}

            onClick={() => setPaymentMethod('card')}

          >

            💳 Tarjeta

          </button>

        </div>

        {paymentMethod === 'cash' && (
          <div className="cash-change-block">
            <label className="cash-change-label">
              ¿Con cuánto vas a pagar?
              <input
                type="number"
                className="input"
                min={total}
                step="0.01"
                inputMode="decimal"
                placeholder={`Mínimo ${formatPrice(total)}`}
                value={cashPaidAmount}
                onChange={(e) => setCashPaidAmount(e.target.value)}
                disabled={loading}
              />
            </label>
            {cashChange != null && cashChange >= 0 && (
              <p className="cash-change-notice" role="status">
                {orderType === 'delivery' ? (
                  <>💶 El repartidor llevará cambio de <strong>{formatPrice(cashChange)}</strong></>
                ) : (
                  <>💶 Prepara <strong>{formatPrice(cashPaidValue)}</strong> — te devolveremos <strong>{formatPrice(cashChange)}</strong></>
                )}
              </p>
            )}
          </div>
        )}

      </Card>



      {error && (

        <ErrorRetry

          message={error.includes('pedido') ? error : `Error al enviar pedido: ${error}`}

          onRetry={handleSubmit}

        />

      )}



      <Button fullWidth size="lg" onClick={handleSubmit} disabled={loading || !storeOpen}>
        {loading ? 'Procesando...' : storeOpen ? 'Confirmar pedido' : 'Local cerrado'}
      </Button>

      <TrustBadges compact className="checkout-trust-badges" />
    </div>

  );

}

