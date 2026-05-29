import { useState } from 'react';
import type { Product } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { canRemoveIngredient, getCustomizationLabel, validateCustomization } from '../../utils/ingredients';
import { formatPrice } from '../../utils/format';
import { useCartStore } from '../../store/cartStore';
import { useAppStore } from '../../store/appStore';
import { playAddToCartFeedback } from '../../utils/microinteractions';

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
};

export function ProductModal({ product, open, onClose }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState('');
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);

  if (!product) return null;

  const toggleIngredient = (id: string) => {
    setError('');
    if (removed.includes(id)) {
      setRemoved(removed.filter((r) => r !== id));
    } else if (canRemoveIngredient(id, product.ingredients, removed)) {
      setRemoved([...removed, id]);
    }
  };

  const handleAdd = () => {
    const validation = validateCustomization(product.ingredients, removed);
    if (!validation.valid) {
      setError(validation.error ?? 'Personalización no válida');
      return;
    }
    try {
      addItem(product, quantity, removed);
      showToast(`✅ ${product.name} añadido`);
      playAddToCartFeedback({
        emoji: product.image,
        sourceElement: document.querySelector('.product-modal-hero'),
      });
      setQuantity(1);
      setRemoved([]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const customLabel = getCustomizationLabel(removed, product.ingredients);

  return (
    <Modal open={open} onClose={onClose} title={product.name}>
      <div className="product-modal">
        <div className="product-modal-hero">{product.image}</div>
        <p>{product.description}</p>
        <p className="product-modal-price">{formatPrice(product.price)}</p>

        {product.ingredients.some((i) => !i.required) && (
          <div className="ingredients-section">
            <h4>Personalizar</h4>
            <p className="hint">Puedes quitar ingredientes opcionales</p>
            <div className="ingredients-list">
              {product.ingredients.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  className={`ingredient-chip ${removed.includes(ing.id) ? 'removed' : ''} ${ing.required ? 'required' : ''}`}
                  onClick={() => !ing.required && toggleIngredient(ing.id)}
                  disabled={ing.required}
                >
                  {ing.required ? '🔒' : removed.includes(ing.id) ? '❌' : '✓'} {ing.name}
                </button>
              ))}
            </div>
            {customLabel && <p className="custom-label">{customLabel}</p>}
          </div>
        )}

        <div className="quantity-row">
          <span>Cantidad</span>
          <div className="quantity-controls">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <Button fullWidth size="lg" className="cart-add-flash" onClick={handleAdd}>
          Añadir · {formatPrice(product.price * quantity)}
        </Button>
      </div>
    </Modal>
  );
}
