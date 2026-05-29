import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { getProducts } from '../api/products';
import { ProductCard } from '../components/menu/ProductCard';
import { ProductModal } from '../components/menu/ProductModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Modal';
import type { Product } from '../types';
import { generateId } from '../utils/format';

export function FavoritesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const favoriteProductIds = useAppStore((s) => s.favoriteProductIds);
  const favoriteOrders = useAppStore((s) => s.favoriteOrders);
  const loadFavorites = useAppStore((s) => s.loadFavorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const repeatOrder = useCartStore((s) => s.repeatOrder);
  const showToast = useAppStore((s) => s.showToast);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (user) loadFavorites(user.id);
  }, [user, loadFavorites]);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const favProducts = products.filter((p) => favoriteProductIds.includes(p.id));

  return (
    <div className="page favorites-page">
      <h1>❤️ Favoritos</h1>

      {favoriteOrders.length > 0 && (
        <section className="section">
          <h2>Pedidos guardados</h2>
          {favoriteOrders.map((fav) => (
            <Card key={fav.id} className="fav-order">
              <h3>{fav.name}</h3>
              <p>{fav.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}</p>
              <Button
                fullWidth
                onClick={() => {
                  repeatOrder(
                    fav.items.map((i) => ({ ...i, id: generateId('cart') })),
                  );
                  showToast('¡Pedido cargado!');
                  navigate('/cart');
                }}
              >
                Pedir lo de siempre
              </Button>
            </Card>
          ))}
        </section>
      )}

      <section className="section">
        <h2>Productos</h2>
        {favProducts.length === 0 ? (
          <EmptyState icon="🤍" title="Sin productos favoritos" description="Marca productos con ❤️ en la carta" />
        ) : (
          <div className="product-list">
            {favProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelect={setSelectedProduct}
                isFavorite
                onToggleFavorite={() => toggleFavorite(user.id, p.id)}
              />
            ))}
          </div>
        )}
      </section>

      <ProductModal product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
