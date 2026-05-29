import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../utils/format';

export function PendingCartBanner() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const wasRestored = useCartStore((s) => s.wasRestoredFromStorage);
  const dismissRestoredNotice = useCartStore((s) => s.dismissRestoredNotice);
  const total = useCartStore((s) => s.total());
  const itemCount = useCartStore((s) => s.itemCount());

  if (!wasRestored || items.length === 0) return null;

  return (
    <div className="pending-cart-banner" role="status">
      <div className="pending-cart-banner-text">
        <strong>Tenías un pedido pendiente 👀</strong>
        <span>
          {itemCount} producto{itemCount !== 1 ? 's' : ''} · {formatPrice(total)}
        </span>
      </div>
      <div className="pending-cart-banner-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/cart')}>
          Continuar
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={dismissRestoredNotice}
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
