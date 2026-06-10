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

import { getQueueEstimate, getPendingRedemptions } from '../api/products';

import type { QueueEstimate } from '../utils/estimateTime';

import { useSettingsStore, isStoreOpen, isStoreSaturated } from '../store/settingsStore';
import type { OrderType, PaymentMethod, ValidatedAddress } from '../types';
import { formatPrice } from '../utils/format';
import { ApiError } from '../api/client';
import { getCurrentUser } from '../api/auth';
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
  const meetsMinimum = useCartStore((s) => s.meetsMinimum());
  const remainingForMinimum = useCartStore((s) => s.remainingForMinimum());

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
  const [queueError, setQueueError] = useState(false);
  const [pendingRedemptions, setPendingRedemptions] = useState<
    { id: string; rewardName: string }[]
  >([]);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    if (!defaultSaved) return;
    setValidatedAddress({
      fullAddress: defaultSaved.fullAddress,
      city: defaultSaved.city,
      lat: defaultSaved.lat,
      lng: defaultSaved.lng,
      placeId: defaultSaved.placeId,
    });
    setDeliveryDetails(pickDeliveryDetails(defaultSaved));
  }, [defaultSaved]);

  useEffect(() => {
    const loadQueue = () => {
      getQueueEstimate()
        .then((q) => {
          setQueueEstimate(q);
          setQueueError(false);
        })
        .catch(() => setQueueError(true));
    };
    loadQueue();
    const interval = setInterval(loadQueue, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    getPendingRedemptions()
      .then((list) => {
        setPendingRedemptions(list);
        if (list.length === 1) setSelectedRedemptionId(list[0].id);
      })
      .catch(() => setPendingRedemptions([]));
  }, [user]);



  if (!user) return null;

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

  const scrollToCheckoutError = () => {
    window.requestAnimationFrame(() => {
      document.querySelector('.checkout-error-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleSubmit = async () => {
    setError('');

    if (!storeOpen) {
      setError('El local está cerrado — no puedes confirmar pedidos ahora');
      scrollToCheckoutError();
      return;
    }

    if (storeSaturated) {
      setError('El local está saturado — inténtalo en unos minutos');
      scrollToCheckoutError();
      return;
    }

    if (user.isBlocked) {
      setError('Tu cuenta está bloqueada. Contacta con el local.');
      scrollToCheckoutError();
      return;
    }

    if (!meetsMinimum) {
      setError(`Pedido mínimo ${settings.minOrderAmount}€ — te faltan ${formatPrice(remainingForMinimum)}`);
      scrollToCheckoutError();
      return;
    }

    if (paymentMethod === 'cash') {
      if (!cashPaidAmount.trim() || Number.isNaN(cashPaidValue)) {
        setError('Indica con cuánto vas a pagar en efectivo');
        scrollToCheckoutError();
        return;
      }
      if (cashPaidValue < total) {
        setError(`Debes pagar al menos ${formatPrice(total)}`);
        scrollToCheckoutError();
        return;
      }
    }

    if (orderType === 'delivery') {
      if (!validatedAddress) {
        setError('Selecciona una dirección válida en Arroyomolinos (toca una sugerencia de la lista)');
        scrollToCheckoutError();
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
        redemptionId: selectedRedemptionId ?? undefined,

      });

      try {
        const freshUser = await getCurrentUser();
        if (freshUser) setUser(freshUser);
      } catch {
        // non-critical
      }



      clearCart();

      addNotification('Pedido recibido', `Tu pedido #${order.id.slice(-6)} está en cola`);

      showToast('¡Pedido confirmado!');



      navigate(`/order/${order.id}`, { state: { confirmed: true } });

    } catch (e) {
      let msg = 'Error al enviar pedido. Inténtalo de nuevo.';
      if (e instanceof ApiError) {
        if (e.status === 0) msg = e.message;
        else if (e.status === 401) msg = 'Tu sesión ha expirado. Vuelve a entrar.';
        else if (e.status === 403) msg = e.message;
        else msg = e.message || msg;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      setError(msg);
      scrollToCheckoutError();
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
            showOptionalDetails
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



      {pendingRedemptions.length > 0 && (
        <Card>
          <h3>🎁 Recompensa canjeada</h3>
          <p className="hint">Se aplicará automáticamente a este pedido</p>
          <div className="option-group">
            <button
              type="button"
              className={`option-btn ${!selectedRedemptionId ? 'active' : ''}`}
              onClick={() => setSelectedRedemptionId(null)}
            >
              No usar ahora
            </button>
            {pendingRedemptions.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`option-btn ${selectedRedemptionId === r.id ? 'active' : ''}`}
                onClick={() => setSelectedRedemptionId(r.id)}
              >
                {r.rewardName}
              </button>
            ))}
          </div>
        </Card>
      )}

      {queueError && !queueEstimate && (
        <p className="hint">No se pudo cargar el tiempo estimado de cola.</p>
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

            💳 Tarjeta al recibir

          </button>

        </div>

        {paymentMethod === 'card' && (
          <p className="hint">Pagarás con tarjeta cuando recibas el pedido (datáfono en local).</p>
        )}

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
        <div className="checkout-error-banner">
          <ErrorRetry
            message={error}
            onRetry={handleSubmit}
          />
        </div>
      )}



      <Button
        fullWidth
        size="lg"
        onClick={handleSubmit}
        disabled={loading || !storeOpen || storeSaturated || !meetsMinimum}
      >
        {loading
          ? 'Procesando...'
          : !storeOpen
            ? 'Local cerrado'
            : storeSaturated
              ? 'Local saturado'
              : !meetsMinimum
                ? `Mínimo ${settings.minOrderAmount}€`
                : 'Confirmar pedido'}
      </Button>

      <TrustBadges compact className="checkout-trust-badges" />
    </div>

  );

}

