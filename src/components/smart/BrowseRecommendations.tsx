import type { Product } from '../../types';
import { getAlsoOrderedWith } from '../../utils/pairings';
import { formatPrice } from '../../utils/format';
import { useCartStore } from '../../store/cartStore';
import { useAppStore } from '../../store/appStore';

type Props = {
  selectedProduct: Product | null;
  products: Product[];
};

export function BrowseRecommendations({ selectedProduct, products }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);

  if (!selectedProduct) return null;

  const also = getAlsoOrderedWith(selectedProduct, products, 2);
  if (also.length === 0) return null;

  return (
    <div className="browse-recs">
      <p className="browse-recs-label">Esto combina bien con {selectedProduct.name}</p>
      <div className="browse-recs-row">
        {also.map((p) => (
          <button
            key={p.id}
            type="button"
            className="browse-rec-chip"
            onClick={() => {
              addItem(p, 1);
              showToast(`${p.name} añadido al carrito`);
            }}
          >
            <span>{p.image}</span>
            <span>{p.name}</span>
            <small>{formatPrice(p.price)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

type StripProps = {
  products: Product[];
  suggestions: Product[];
  title?: string;
};

export function RecommendationStrip({ products, suggestions, title = 'Los clientes también piden…' }: StripProps) {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);

  const display = suggestions.filter((s) => products.some((p) => p.id === s.id));
  if (display.length === 0) return null;

  return (
    <section className="rec-strip">
      <h3>{title}</h3>
      <div className="rec-strip-scroll">
        {display.map((p) => (
          <button
            key={p.id}
            type="button"
            className="rec-strip-item"
            onClick={() => {
              addItem(p, 1);
              showToast(`${p.name} añadido`);
            }}
          >
            <span className="rec-strip-emoji">{p.image}</span>
            <span className="rec-strip-name">{p.name}</span>
            <span className="rec-strip-price">{formatPrice(p.price)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
