import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { getSmartRecommendation, recommendationFromProduct } from '../utils/recommendations';
import { getRecommendations } from '../api/products';
import { ApiError } from '../api/client';
import { loadMenuData } from '../utils/loadMenu';
import { useServerStore } from '../store/serverStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProductModal } from '../components/menu/ProductModal';
import { ErrorRetry } from '../components/ui/ErrorRetry';
import { formatPrice } from '../utils/format';
import type { Product } from '../types';

export function SuggestPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const favoriteProductIds = useAppStore((s) => s.favoriteProductIds);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);
  const serverOnline = useServerStore((s) => s.online);

  const formatLoadError = (reason: unknown) => {
    if (reason instanceof ApiError) return reason.message;
    if (reason instanceof Error) return reason.message;
    return 'No se pudo cargar la carta';
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [apiPicks, setApiPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random());
  const [altIndex, setAltIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [menuResult, picksResult] = await Promise.allSettled([
        loadMenuData(),
        getRecommendations(8),
      ]);

      if (menuResult.status === 'fulfilled') {
        setProducts(menuResult.value.products);
      } else {
        setProducts([]);
      }

      if (picksResult.status === 'fulfilled') {
        setApiPicks(picksResult.value);
      } else {
        setApiPicks([]);
      }

      const hasProducts = menuResult.status === 'fulfilled' && menuResult.value.products.length > 0;
      const hasPicks = picksResult.status === 'fulfilled' && picksResult.value.length > 0;

      if (!hasProducts && !hasPicks) {
        const reason =
          menuResult.status === 'rejected'
            ? formatLoadError(menuResult.reason)
            : picksResult.status === 'rejected'
              ? formatLoadError(picksResult.reason)
              : 'No hay productos en la carta';
        setError(reason);
      } else {
        setError('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar sugerencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!serverOnline || loading) return;
    if (error || products.length === 0) {
      void loadData();
    }
  }, [serverOnline]);

  useEffect(() => {
    if (loading) return;
    getRecommendations(8)
      .then(setApiPicks)
      .catch(() => {});
  }, [shuffleSeed, loading]);

  const baseRecommendation = useMemo(
    () => getSmartRecommendation(products, user, orders, favoriteProductIds),
    [products, user, orders, favoriteProductIds],
  );

  const recommendation = useMemo(() => {
    if (baseRecommendation) {
      const apiPick = apiPicks[altIndex % Math.max(apiPicks.length, 1)];
      if (altIndex > 0 && apiPick) {
        return recommendationFromProduct(apiPick, 'Otra sugerencia para ti');
      }
      return baseRecommendation;
    }

    const apiPick = apiPicks[altIndex % Math.max(apiPicks.length, 1)];
    if (apiPick) {
      return recommendationFromProduct(apiPick, 'Te recomendamos de la carta');
    }

    return null;
  }, [baseRecommendation, apiPicks, altIndex]);

  if (loading) {
    return (
      <div className="page suggest-page">
        <h1>🤔 No sé qué pedir</h1>
        <p>Cargando sugerencias…</p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="page suggest-page">
        <h1>🤔 No sé qué pedir</h1>
        <ErrorRetry
          message={error || 'No pudimos generar una sugerencia. Comprueba que el servidor esté en marcha.'}
          onRetry={() => void loadData()}
        />
        <Button variant="secondary" fullWidth onClick={() => navigate('/menu')}>
          Ver carta completa
        </Button>
      </div>
    );
  }

  const mainProduct = recommendation.products[0];

  const orderAll = () => {
    recommendation.products.forEach((p) => addItem(p, 1));
    showToast('¡Añadido al carrito!');
    navigate('/cart');
  };

  const nextOption = () => {
    setShuffleSeed(Math.random());
    setAltIndex((i) => i + 1);
  };

  return (
    <div className="page suggest-page">
      <h1>🤔 No sé qué pedir</h1>
      <p className="subtitle">{recommendation.reason}</p>

      <Card className="suggestion-card what-to-order-card">
        <span className="suggestion-emoji">{recommendation.emoji}</span>
        <h2>{recommendation.title}</h2>
        {recommendation.products.length > 1 && (
          <ul className="suggestion-bundle">
            {recommendation.products.map((p) => (
              <li key={p.id}>{p.image} {p.name}</li>
            ))}
          </ul>
        )}
        {recommendation.products.length === 1 && mainProduct.description && (
          <p>{mainProduct.description}</p>
        )}
        <strong>{formatPrice(recommendation.totalPrice)}</strong>
        <div className="suggestion-actions">
          <Button fullWidth size="lg" onClick={orderAll}>
            Pedir esto
          </Button>
          {recommendation.products.length === 1 && (
            <Button fullWidth variant="secondary" onClick={() => setShowModal(true)}>
              Personalizar
            </Button>
          )}
          <Button fullWidth variant="secondary" onClick={nextOption}>
            🔄 Otra opción
          </Button>
        </div>
      </Card>

      <Button variant="ghost" fullWidth onClick={() => navigate('/menu')}>
        Ver carta completa
      </Button>

      {mainProduct && (
        <ProductModal product={mainProduct} open={showModal} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
