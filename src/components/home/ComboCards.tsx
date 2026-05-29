import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { COMBOS, resolveCombo, formatComboPrice } from '../../utils/combos';
import { useCartStore } from '../../store/cartStore';
import { useAppStore } from '../../store/appStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

type Props = {
  products: Product[];
};

export function ComboCards({ products }: Props) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);

  const combos = COMBOS.map((c) => ({ combo: c, resolved: resolveCombo(c, products) })).filter(
    (x) => x.resolved,
  );

  if (combos.length === 0) return null;

  const handleAddCombo = (productList: Product[]) => {
    productList.forEach((p) => addItem(p, 1, []));
    showToast('🍔 Combo añadido al carrito');
    navigate('/cart');
  };

  return (
    <section className="section combo-section">
      <div className="section-header">
        <h2>🍔 Combos</h2>
        <span className="section-tag">Ahorra</span>
      </div>
      <div className="combo-scroll">
        {combos.map(({ combo, resolved }) => (
          <Card key={combo.id} className="combo-card">
            <span className="combo-emoji">{combo.emoji}</span>
            <strong>{combo.name}</strong>
            <p className="hint">{combo.tagline}</p>
            <p className="combo-price">
              {formatComboPrice(resolved!.total, resolved!.savings)}
            </p>
            <Button size="sm" fullWidth onClick={() => handleAddCombo(resolved!.items)}>
              Añadir combo
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
