import { useEffect, useState } from 'react';
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

  const ingredients = product?.ingredients ?? [];

  useEffect(() => {
    if (open && product) {
      setQuantity(1);
      setRemoved([]);
      setError('');
    }
  }, [open, product?.id, product]);

  const toggleIngredient = (id: string) => {
    if (!product) return;
    setError('');
    if (removed.includes(id)) {
      setRemoved(removed.filter((r) => r !== id));
    } else if (canRemoveIngredient(id, ingredients, removed)) {
      setRemoved([...removed, id]);
    }
  };

  const handleAdd = () => {
    if (!product) return;
    const validation = validateCustomization(ingredients, removed);
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
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  if (!open || !product) return null;

  const customLabel = getCustomizationLabel(removed, ingredients);
  const optionalIngredients = ingredients.filter((i) => !i.required);

  return (
    <Modal open={open} onClose={onClose} title={product.name}>
      <div className="product-modal">
        <div className="product-modal-hero">{product.image}</div>
        <p>{product.description}</p>
        <p className="product-modal-price">{formatPrice(product.price)}</p>

        {optionalIngredients.length > 0 && (
          <div className="ingredients-section">
            <h4>Personalizar</h4>
            <p className="hint">Puedes quitar ingredientes opcionales</p>
            <div className="ingredients-list">
              {ingredients.map((ing) => (
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
            <button type="button" aria-label="Menos" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
            <span>{quantity}</span>
            <button type="button" aria-label="Más" onClick={() => setQuantity(quantity + 1)}>+</button>
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
