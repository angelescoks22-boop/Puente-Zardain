import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';

export function OrderReadyOverlay() {
  const overlay = useAppStore((s) => s.orderReadyOverlay);
  const dismiss = useAppStore((s) => s.dismissOrderReady);
  const navigate = useNavigate();

  if (!overlay) return null;

  const isPickup = overlay.type === 'pickup';

  return (
    <div className="order-ready-overlay" role="dialog" aria-modal="true">
      <div className="order-ready-content ready-pop">
        <span className="order-ready-icon">✅</span>
        <h2>TU PEDIDO ESTÁ LISTO</h2>
        <p>
          {isPickup
            ? 'Pasa a recogerlo en el local cuando quieras'
            : 'El repartidor va en camino a tu dirección'}
        </p>
        <div className="order-ready-actions">
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              dismiss();
              navigate(`/order/${overlay.orderId}`);
            }}
          >
            Ver pedido
          </Button>
          <Button variant="ghost" fullWidth onClick={dismiss}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
