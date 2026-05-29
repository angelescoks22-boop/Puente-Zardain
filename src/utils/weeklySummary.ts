import type { Order, User } from '../types';

export type WeeklySummary = {
  orderCount: number;
  totalSpent: number;
  zardasEarned: number;
  favoriteProduct: string;
  favoriteProductCount: number;
};

const ZARDAS_PER_ORDER_EST = 15;

export function getWeeklySummary(user: User, orders: Order[]): WeeklySummary | null {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekOrders = orders.filter(
    (o) =>
      o.userId === user.id &&
      o.status !== 'cancelled' &&
      new Date(o.createdAt).getTime() >= weekAgo,
  );

  if (weekOrders.length === 0) return null;

  const productCounts = new Map<string, { name: string; count: number }>();
  let totalSpent = 0;
  weekOrders.forEach((o) => {
    totalSpent += o.total;
    o.items.forEach((i) => {
      const prev = productCounts.get(i.productId);
      productCounts.set(i.productId, {
        name: i.product.name,
        count: (prev?.count ?? 0) + i.quantity,
      });
    });
  });

  let favoriteProduct = '—';
  let favoriteProductCount = 0;
  productCounts.forEach(({ name, count }) => {
    if (count > favoriteProductCount) {
      favoriteProductCount = count;
      favoriteProduct = name;
    }
  });

  return {
    orderCount: weekOrders.length,
    totalSpent,
    zardasEarned: weekOrders.filter((o) => o.status === 'delivered').length * ZARDAS_PER_ORDER_EST,
    favoriteProduct,
    favoriteProductCount,
  };
}

export function shouldShowReengagement(user: User): boolean {
  if (!user.lastOrderDate || user.orderCount === 0) return false;
  const daysSince = (Date.now() - new Date(user.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 14;
}

export function daysSinceLastOrder(user: User): number {
  if (!user.lastOrderDate) return 0;
  return Math.floor((Date.now() - new Date(user.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
}
