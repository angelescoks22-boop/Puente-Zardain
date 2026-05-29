import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { getSmartRecommendation } from '../utils/recommendations';
import { getProducts, getRecommendations } from '../api/products';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProductModal } from '../components/menu/ProductModal';
import { formatPrice } from '../utils/format';
import type { Product } from '../types';

export function SuggestPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const favoriteProductIds = useAppStore((s) => s.favoriteProductIds);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);

  const [products, setProducts] = useState<Product[]>([]);
  const [apiPicks, setApiPicks] = useState<Product[]>([]);
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random());
  const [altIndex, setAltIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    getRecommendations(8)
      .then(setApiPicks)
      .catch(() => setApiPicks([]));
  }, [shuffleSeed]);

  const baseRecommendation = useMemo(
    () => getSmartRecommendation(products, user, orders, favoriteProductIds),
    [products, user, orders, favoriteProductIds],
  );

  const recommendation = useMemo(() => {
    if (!baseRecommendation) return null;

    const apiPick = apiPicks[altIndex % Math.max(apiPicks.length, 1)];
    if (altIndex > 0 && apiPick) {
      return {
        ...baseRecommendation,
        id: `api-${apiPick.id}-${altIndex}-${shuffleSeed}`,
        title: apiPick.name,
        reason: 'Sugerencia del backend — orden aleatorio',
        products: [apiPick],
        totalPrice: apiPick.price,
        emoji: apiPick.image,
      };
    }

    return baseRecommendation;
  }, [baseRecommendation, apiPicks, altIndex, shuffleSeed]);

  if (!recommendation) {
    return (
      <div className="page suggest-page">
        <h1>🤔 No sé qué pedir</h1>
        <p>Cargando sugerencias…</p>
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
