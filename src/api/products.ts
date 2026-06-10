import type { BusinessMessage, Review, Reward } from '../types';
import { apiFetch } from './client';

export type PublicSettings = {
  ordersOpen: boolean;
  businessStatus: 'open' | 'closed' | 'saturated';
  minOrderAmount: number;
  deliveryArea: string;
  prepTimeMinutes: number;
  isOpen: boolean;
  isSaturated: boolean;
};

/** GET /api/products — opcional ?category=montados|bocadillos|hamburguesas|... */
export async function getProducts(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<import('../types').Product[]>(`/products${query}`);
}

export async function getProductById(id: string) {
  const products = await getProducts();
  return products.find((p) => p.id === id) ?? null;
}

/** GET /api/products/recommendations — shuffle real desde backend */
export async function getRecommendations(limit = 3, category?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (category) params.set('category', category);
  return apiFetch<import('../types').Product[]>(`/products/recommendations?${params}`);
}

export async function getBusinessMessages(): Promise<BusinessMessage[]> {
  return apiFetch<BusinessMessage[]>('/products/messages');
}

export async function getReviews(limit = 50): Promise<Review[]> {
  return apiFetch<Review[]>(`/reviews?limit=${limit}`);
}

export type ProductReviewStats = Record<string, { average: number; count: number }>;

export async function getProductReviewStats(): Promise<ProductReviewStats> {
  return apiFetch<ProductReviewStats>('/reviews/stats/products');
}

export async function submitReview(
  _userId: string,
  _userName: string,
  rating: number,
  comment: string,
  _hasOrders: boolean,
  _isFirstReview: boolean,
): Promise<Review> {
  const res = await apiFetch<{ id: string; approved: boolean; firstReviewBonus: boolean }>('/reviews', {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
  return {
    id: res.id,
    userId: _userId,
    userName: _userName,
    rating,
    comment,
    approved: res.approved,
    verified: true,
    createdAt: new Date().toISOString(),
  };
}

export async function getFavoriteProducts(_userId: string): Promise<string[]> {
  return apiFetch<string[]>('/favorites/products');
}

export async function toggleFavoriteProduct(_userId: string, productId: string): Promise<boolean> {
  const res = await apiFetch<{ added: boolean }>(`/favorites/products/${productId}/toggle`, {
    method: 'POST',
  });
  return res.added;
}

export async function getFavoriteOrders(_userId: string) {
  return apiFetch<import('../types').FavoriteOrder[]>('/favorites/orders');
}

export async function saveFavoriteOrder(
  _userId: string,
  name: string,
  items: import('../types').FavoriteOrder['items'],
) {
  return apiFetch<import('../types').FavoriteOrder>('/favorites/orders', {
    method: 'POST',
    body: JSON.stringify({ name, items }),
  });
}

export async function deleteFavoriteOrder(_userId: string, favId: string) {
  return apiFetch<{ ok: boolean }>(`/favorites/orders/${favId}`, { method: 'DELETE' });
}

export async function getPendingRedemptions() {
  return apiFetch<{
    id: string;
    rewardId: string;
    rewardName: string;
    zardasCost: number;
    status: string;
    createdAt: string;
  }[]>('/rewards/redemptions');
}

export async function redeemReward(_rewardId: string): Promise<{
  user: import('../types').User;
  message: string;
}> {
  const res = await apiFetch<{
    user: import('../types').User;
    message: string;
  }>('/rewards/redeem', {
    method: 'POST',
    body: JSON.stringify({ rewardId: _rewardId }),
  });
  return res;
}

/** GET /api/settings/public */
export async function getPublicSettings(): Promise<PublicSettings> {
  return apiFetch<PublicSettings>('/settings/public');
}

export async function getQueueEstimate() {
  return apiFetch<import('../utils/estimateTime').QueueEstimate>('/settings/queue-estimate');
}

export async function getRewards(): Promise<Reward[]> {
  return apiFetch<Reward[]>('/products/rewards');
}
