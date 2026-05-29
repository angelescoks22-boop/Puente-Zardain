import type { User, Order, Product } from '../../types';
import { ProductCard } from '../menu/ProductCard';
import { getPersonalizedSuggestions } from '../../utils/recommendations';
import type { ProductReviewStats } from '../../api/products';

type Props = {
  user: User | null;
  orders: Order[];
  products: Product[];
  reviewStats: ProductReviewStats;
  favoriteProductIds?: string[];
  onSelect: (product: Product) => void;
};

export function RecommendationsSection({
  user,
  orders,
  products,
  reviewStats,
  favoriteProductIds = [],
  onSelect,
}: Props) {
  if (products.length === 0) return null;

  const suggestions = getPersonalizedSuggestions(products, user, orders, favoriteProductIds, 4);
  const display = suggestions.length
    ? suggestions
    : products.filter((p) => p.popular).slice(0, 3);

  if (display.length === 0) return null;

  return (
    <section className="section recommendations-section">
      <div className="section-header">
        <h2>Para ti</h2>
        <span className="section-tag">Recomendado</span>
      </div>
      <p className="hint section-sub">Según lo que más gusta y tu historial</p>
      <div className="product-scroll">
        {display.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onSelect={onSelect}
            compact
            rating={reviewStats[p.id]?.average}
            reviewCount={reviewStats[p.id]?.count}
          />
        ))}
      </div>
    </section>
  );
}
