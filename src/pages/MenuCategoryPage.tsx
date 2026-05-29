import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Category, Product } from '../types';
import { CATEGORY_LABELS } from '../data/products';
import { getProducts, getProductReviewStats } from '../api/products';
import type { ProductReviewStats } from '../api/products';
import { ProductCard } from '../components/menu/ProductCard';
import { ProductModal } from '../components/menu/ProductModal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ErrorRetry } from '../components/ui/ErrorRetry';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useOrderStore } from '../store/orderStore';
import { sortProductsByHabits, analyzeUserHabits } from '../utils/userHabits';
import { useSmartEta } from '../hooks/useSmartEta';

type Props = {
  lockCategory: Category;
  title: string;
  subtitle: string;
};

export function MenuCategoryPage({ lockCategory, title, subtitle }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviewStats, setReviewStats] = useState<ProductReviewStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const favoriteProductIds = useAppStore((s) => s.favoriteProductIds);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const { label: etaLabel } = useSmartEta('delivery', 60000);

  const loadMenu = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([getProducts(), getProductReviewStats()])
      .then(([p, stats]) => {
        setProducts(p.filter((item) => item.category === lockCategory));
        setReviewStats(stats);
      })
      .catch(() => setError('Error al cargar la carta'))
      .finally(() => setLoading(false));
  }, [lockCategory]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const habits = useMemo(
    () => analyzeUserHabits(user, orders, favoriteProductIds),
    [user, orders, favoriteProductIds],
  );

  const sortedProducts = useMemo(
    () => sortProductsByHabits(products, habits),
    [products, habits],
  );

  return (
    <div className="page menu-page">
      <div className="menu-page-header">
        <h1>{title}</h1>
        <p className="hint">{subtitle}</p>
        {etaLabel !== '—' && <p className="menu-eta-hint">⏱️ {etaLabel} aprox.</p>}
      </div>

      <div className="menu-category-links">
        <Link to="/montados" className={lockCategory === 'montados' ? 'active' : ''}>
          🥪 {CATEGORY_LABELS.montados}
        </Link>
        <Link to="/bocadillos" className={lockCategory === 'bocadillos' ? 'active' : ''}>
          🥖 {CATEGORY_LABELS.bocadillos}
        </Link>
        <Link to="/menu">📋 Carta completa</Link>
      </div>

      <div className="product-list">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        {error && !loading && <ErrorRetry message={error} onRetry={loadMenu} />}
        {!loading && !error && sortedProducts.length === 0 && (
          <p className="hint">No hay productos en esta categoría.</p>
        )}
        {!loading && !error && sortedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={setSelectedProduct}
            isFavorite={favoriteProductIds.includes(product.id)}
            onToggleFavorite={user ? () => toggleFavorite(user.id, product.id) : undefined}
            rating={reviewStats[product.id]?.average}
            reviewCount={reviewStats[product.id]?.count}
          />
        ))}
      </div>

      <ProductModal product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
