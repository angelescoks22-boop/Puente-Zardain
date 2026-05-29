import type { CartItem, Product } from '../../types';
import { getCartSuggestions } from '../../utils/recommendations';
import { useCartStore } from '../../store/cartStore';
import { useAppStore } from '../../store/appStore';
import { formatPrice } from '../../utils/format';
import { MIN_ORDER_AMOUNT } from '../../data/levels';

type Props = {
  cartItems: CartItem[];
  products: Product[];
  minOrderAmount?: number;
};

export function CartSmartSuggestions({ cartItems, products, minOrderAmount = MIN_ORDER_AMOUNT }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);

  const suggestions = getCartSuggestions(cartItems, products, minOrderAmount);
  if (suggestions.length === 0) return null;

  return (
    <div className="cart-smart-suggestions">
      <p className="cart-suggest-label">Te puede interesar</p>
      {suggestions.map((s) => (
        <button
          key={s.id}
          type="button"
          className="cart-suggest-chip"
          onClick={() => {
            addItem(s.product, 1);
            showToast(`${s.product.name} añadido`);
          }}
        >
          <span>{s.product.image}</span>
          <span className="cart-suggest-text">
            <small>{s.message}</small>
            <strong>{s.product.name} · {formatPrice(s.product.price)}</strong>
          </span>
          <span className="cart-suggest-add">+</span>
        </button>
      ))}
    </div>
  );
}
