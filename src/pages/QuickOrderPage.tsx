import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecommendations, getProductReviewStats } from '../api/products';
import type { ProductReviewStats } from '../api/products';
import type { Product } from '../types';
import { ProductCard } from '../components/menu/ProductCard';
import { ProductModal } from '../components/menu/ProductModal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ErrorRetry } from '../components/ui/ErrorRetry';

export function QuickOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviewStats, setReviewStats] = useState<ProductReviewStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([getRecommendations(12), getProductReviewStats()])
      .then(([p, stats]) => {
        setProducts(p);
        setReviewStats(stats);
      })
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page quick-order-page">
      <div className="quick-order-header">
        <Link to="/welcome" className="quick-back">← Volver</Link>
        <h1>🍔 Algo rápido</h1>
        <p className="quick-order-sub">Lo más pedido · elige y listo</p>
      </div>

      <div className="quick-order-tip chat-bubble chat-bubble--bot">
        ⚡ Recomendaciones del backend — orden diferente en cada carga.
      </div>

      <div className="product-list">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        {error && !loading && <ErrorRetry message={error} onRetry={load} />}
        {!loading && !error && products.map((product, index) => (
          <div
            key={product.id}
            className="quick-product-wrap"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <ProductCard
              product={product}
              onSelect={setSelectedProduct}
              rating={reviewStats[product.id]?.average}
              reviewCount={reviewStats[product.id]?.count}
            />
          </div>
        ))}
      </div>

      <ProductModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
