import type { Category, Product } from '../types';
import { getProducts, getProductReviewStats, type ProductReviewStats } from '../api/products';

export async function loadMenuData(category?: Category | 'all'): Promise<{
  products: Product[];
  reviewStats: ProductReviewStats;
}> {
  const categoryArg = category && category !== 'all' ? category : undefined;

  const [productsResult, statsResult] = await Promise.allSettled([
    getProducts(categoryArg),
    getProductReviewStats(),
  ]);

  if (productsResult.status === 'rejected') {
    throw productsResult.reason;
  }

  return {
    products: productsResult.value,
    reviewStats: statsResult.status === 'fulfilled' ? statsResult.value : {},
  };
}
