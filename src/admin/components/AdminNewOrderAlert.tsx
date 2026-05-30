import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAdminNewOrder, type AdminNewOrderPayload } from '../hooks/useAdminSocket';
import {
  isAdminAudioUnlocked,
  unlockAdminAudio,
  startNewOrderAlarm,
  stopNewOrderAlarm,
} from '../utils/newOrderAlertSound';

function showBrowserNotification(payload: AdminNewOrderPayload) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification('🚨 Nuevo pedido — Puente Zardain', {
      body: `${payload.clientName} · ${payload.total.toFixed(2)}€ · ${payload.type === 'delivery' ? 'Domicilio' : 'Recogida'}`,
      tag: `order-${payload.orderId}`,
      requireInteraction: true,
    });
  } catch {
    /* ignore */
  }
}

export function AdminNewOrderAlert() {
  const navigate = useNavigate();
  const [alert, setAlert] = useState<AdminNewOrderPayload | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState(() => !isAdminAudioUnlocked());
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    return onAdminNewOrder((payload) => {
      if (seenRef.current.has(payload.orderId)) return;
      seenRef.current.add(payload.orderId);
      setAlert(payload);
      if (isAdminAudioUnlocked()) {
        startNewOrderAlarm();
      }
      showBrowserNotification(payload);
    });
  }, []);

  useEffect(() => {
    return () => stopNewOrderAlarm();
  }, []);

  const handleUnlock = async () => {
    unlockAdminAudio();
    setNeedsUnlock(false);
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (alert) startNewOrderAlarm();
  };

  const dismiss = () => {
    stopNewOrderAlarm();
    setAlert(null);
  };

  const goToOrders = () => {
    dismiss();
    navigate('/admin/orders');
  };

  return (
    <>
      {needsUnlock && (
        <div className="admin-audio-unlock-bar">
          <span>🔊 Activa el sonido para recibir alertas de pedidos nuevos</span>
          <button type="button" className="status-btn admin-audio-unlock-btn" onClick={handleUnlock}>
            Activar alertas
          </button>
        </div>
      )}

      {alert && (
        <div className="admin-new-order-overlay" role="alertdialog" aria-modal="true" aria-labelledby="new-order-title">
          <div className="admin-new-order-popup">
            <div className="admin-new-order-pulse" aria-hidden />
            <div className="admin-new-order-icon">🚨</div>
            <h2 id="new-order-title">¡Nuevo pedido!</h2>
            <p className="admin-new-order-client">{alert.clientName}</p>
            <div className="admin-new-order-details">
              <span><strong>{alert.total.toFixed(2)} €</strong></span>
              <span>{alert.type === 'delivery' ? '🛵 Domicilio' : '🏪 Recogida'}</span>
              <span>{alert.itemCount} producto{alert.itemCount !== 1 ? 's' : ''}</span>
              <span>#{alert.orderId.slice(-6).toUpperCase()}</span>
            </div>
            <div className="admin-new-order-actions">
              <button type="button" className="admin-new-order-primary" onClick={goToOrders}>
                Ver pedido
              </button>
              <button type="button" className="admin-new-order-secondary" onClick={dismiss}>
                Cerrar alerta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
