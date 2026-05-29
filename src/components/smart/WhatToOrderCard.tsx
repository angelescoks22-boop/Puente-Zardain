import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order, Product, User } from '../../types';
import { getSmartRecommendation } from '../../utils/recommendations';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatPrice } from '../../utils/format';
import { useCartStore } from '../../store/cartStore';
import { useAppStore } from '../../store/appStore';

type Props = {
  products: Product[];
  user: User | null;
  orders: Order[];
  favoriteProductIds?: string[];
  compact?: boolean;
};

export function WhatToOrderCard({ products, user, orders, favoriteProductIds = [], compact }: Props) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useAppStore((s) => s.showToast);

  const recommendation = useMemo(
    () => getSmartRecommendation(products, user, orders, favoriteProductIds),
    [products, user, orders, favoriteProductIds],
  );

  if (!recommendation) return null;

  const handleOrder = () => {
    recommendation.products.forEach((p) => addItem(p, 1));
    showToast('¡Añadido al carrito!');
    navigate('/cart');
  };

  if (compact) {
    return (
      <button type="button" className="what-to-order-btn" onClick={() => navigate('/ai-recommendation')}>
        <span>🤔</span>
        <span>No sé qué pedir</span>
      </button>
    );
  }

  return (
    <Card className="what-to-order-card">
      <div className="what-to-order-header">
        <span className="what-to-order-emoji">{recommendation.emoji}</span>
        <div>
          <h3>No sé qué pedir</h3>
          <p className="what-to-order-reason">{recommendation.reason}</p>
        </div>
      </div>
      <div className="what-to-order-body">
        <strong>{recommendation.title}</strong>
        <span className="what-to-order-price">{formatPrice(recommendation.totalPrice)}</span>
      </div>
      <div className="what-to-order-actions">
        <Button fullWidth onClick={handleOrder}>
          Pedir esto
        </Button>
        <Button fullWidth variant="secondary" onClick={() => navigate('/ai-recommendation')}>
          Ver otra opción
        </Button>
      </div>
    </Card>
  );
}
