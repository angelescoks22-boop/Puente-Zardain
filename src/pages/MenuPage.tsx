import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Category, Product } from '../types';
import { CATEGORY_LABELS, MENU_CATEGORIES } from '../data/products';
import { getRecommendations } from '../api/products';
import type { ProductReviewStats } from '../api/products';
import { loadMenuData } from '../utils/loadMenu';
import { ProductCard } from '../components/menu/ProductCard';
import { ProductModal } from '../components/menu/ProductModal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ErrorRetry } from '../components/ui/ErrorRetry';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useOrderStore } from '../store/orderStore';
import { RecommendationStrip } from '../components/smart/BrowseRecommendations';
import { sortProductsByHabits, analyzeUserHabits } from '../utils/userHabits';
import { useSmartEta } from '../hooks/useSmartEta';

const CATEGORIES: Category[] = MENU_CATEGORIES;

const CATEGORY_STRIP_TITLES: Partial<Record<Category, string>> = {
  montados: '🥪 Recomendados en montados',
  bocadillos: '🥖 Recomendados en bocadillos',
  hamburguesas: '🍔 Recomendados en hamburguesas',
  raciones: '🍟 Recomendados en raciones',
};

function parseCategoryParam(value: string | null): Category | 'all' {
  if (value && CATEGORIES.includes(value as Category)) return value as Category;
  return 'all';
}

export function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [reviewStats, setReviewStats] = useState<ProductReviewStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>(() =>
    parseCategoryParam(searchParams.get('c')),
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [suggestionSeed, setSuggestionSeed] = useState(() => Math.random());
  const [apiSuggestions, setApiSuggestions] = useState<Product[]>([]);
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const favoriteProductIds = useAppStore((s) => s.favoriteProductIds);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const { label: etaLabel } = useSmartEta('delivery', 60000);

  useEffect(() => {
    const fromUrl = parseCategoryParam(searchParams.get('c'));
    setActiveCategory(fromUrl);
  }, [searchParams]);

  const loadMenu = (category?: Category | 'all') => {
    setLoading(true);
    setError('');
    const categoryArg = category && category !== 'all' ? category : undefined;
    loadMenuData(categoryArg)
      .then(({ products: p, reviewStats: stats }) => {
        setProducts(p);
        setReviewStats(stats);
      })
      .catch(() => setError('No se pudo cargar la carta. Pulsa Reintentar.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMenu(activeCategory);
  }, [activeCategory]);

  const habits = useMemo(
    () => analyzeUserHabits(user, orders, favoriteProductIds),
    [user, orders, favoriteProductIds],
  );

  const contextCategory = activeCategory === 'all' ? undefined : activeCategory;

  useEffect(() => {
    getRecommendations(6, contextCategory)
      .then(setApiSuggestions)
      .catch(() => setApiSuggestions([]));
  }, [contextCategory, suggestionSeed]);

  const sortedProducts = useMemo(
    () => sortProductsByHabits(products, habits),
    [products, habits],
  );

  const stripTitle =
    contextCategory && CATEGORY_STRIP_TITLES[contextCategory]
      ? CATEGORY_STRIP_TITLES[contextCategory]
      : 'Los clientes también piden…';

  const selectCategory = (cat: Category | 'all') => {
    setActiveCategory(cat);
    setSuggestionSeed(Math.random());
    if (cat === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ c: cat });
    }
  };

  return (
    <div className="page menu-page">
      <div className="menu-page-header">
        <h1>📋 Carta completa</h1>
        {etaLabel !== '—' && (
          <p className="menu-eta-hint">⏱️ {etaLabel} aprox.</p>
        )}
      </div>

      <RecommendationStrip
        products={products}
        suggestions={apiSuggestions}
        title={stripTitle}
      />

      <div className="category-tabs">
        <button
          type="button"
          className={activeCategory === 'all' ? 'active' : ''}
          onClick={() => selectCategory('all')}
        >
          Todo
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={activeCategory === cat ? 'active' : ''}
            onClick={() => selectCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="product-list">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        {error && !loading && <ErrorRetry message={error} onRetry={() => loadMenu(activeCategory)} />}
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
