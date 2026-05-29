import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Modal';
import { formatPrice } from '../utils/format';
import { getCustomizationLabel } from '../utils/ingredients';
import { MIN_ORDER_AMOUNT } from '../data/levels';
import { CartSmartSuggestions } from '../components/smart/CartSmartSuggestions';
import { getProducts, getPublicSettings } from '../api/products';
import type { Product } from '../types';

export function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const showToast = useAppStore((s) => s.showToast);
  const meetsMinimum = useCartStore((s) => s.meetsMinimum());
  const remaining = useCartStore((s) => s.remainingForMinimum());
  const [products, setProducts] = useState<Product[]>([]);
  const [minOrder, setMinOrder] = useState(MIN_ORDER_AMOUNT);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
    getPublicSettings().then((s) => setMinOrder(s.minOrderAmount)).catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon="🛒"
          title="Tu carrito está vacío"
          description="Explora la carta y añade tus favoritos"
          action={{ label: 'Ver carta', onClick: () => navigate('/menu') }}
        />
      </div>
    );
  }

  return (
    <div className="page cart-page">
      <h1>🛒 Carrito</h1>

      <CartSmartSuggestions cartItems={items} products={products} minOrderAmount={minOrder} />

      <div className="cart-items">
        {items.map((item) => (
          <Card key={item.id} className="cart-item">
            <div className="cart-item-main">
              <span className="cart-item-img">{item.product.image}</span>
              <div>
                <h3>{item.product.name}</h3>
                {item.removedIngredients.length > 0 && (
                  <small>{getCustomizationLabel(item.removedIngredients, item.product.ingredients)}</small>
                )}
                <p>{formatPrice(item.unitPrice)}</p>
              </div>
            </div>
            <div className="cart-item-actions">
              <div className="quantity-controls">
                <button type="button" onClick={() => {
                  updateQuantity(item.id, item.quantity - 1);
                  if (item.quantity - 1 > 0) showToast('Cantidad actualizada');
                }}>−</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => {
                  updateQuantity(item.id, item.quantity + 1);
                  showToast('Cantidad actualizada');
                }}>+</button>
              </div>
              <button type="button" className="remove-btn" onClick={() => {
                removeItem(item.id);
                showToast('Producto eliminado');
              }}>
                Eliminar
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="cart-summary">
        {!meetsMinimum && (
          <p className="min-order-warning">
            Pedido mínimo {minOrder}€ — te faltan {formatPrice(remaining)}
          </p>
        )}
        <div className="cart-total">
          <span>Total</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <Button
          fullWidth
          size="lg"
          disabled={!meetsMinimum}
          onClick={() => navigate('/checkout')}
        >
          Continuar pedido
        </Button>
      </div>
    </div>
  );
}
