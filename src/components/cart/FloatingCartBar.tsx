import { useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../utils/format';

const HIDDEN_PREFIXES = ['/cart', '/checkout', '/order/', '/auth'];

export function FloatingCartBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());
  const itemCount = useCartStore((s) => s.itemCount());

  const hidden = HIDDEN_PREFIXES.some((path) => location.pathname.startsWith(path));
  if (hidden || items.length === 0) return null;

  return (
    <button
      type="button"
      className="floating-cart-bar"
      onClick={() => navigate('/cart')}
      aria-label={`Ver carrito, ${itemCount} productos, total ${formatPrice(total)}`}
    >
      <span className="floating-cart-icon">🛒</span>
      <span className="floating-cart-info">
        <strong>{itemCount} en el carrito</strong>
        <span>{formatPrice(total)}</span>
      </span>
      <span className="floating-cart-cta">Ver carrito →</span>
    </button>
  );
}
