import type { CartItem, Order, Product, User, Category } from '../types';
import { getCategoryEmoji } from '../data/products';
import {
  analyzeUserHabits,
  getCategoriesForNow,
  getHabitGreeting,
  getMealPeriod,
} from './userHabits';
import {
  cartHasCategory,
  getAlsoOrderedWith,
  pickBestDrink,
  pickBestSide,
} from './pairings';
import { shuffle, scoreWithJitter } from './shuffle';

export type SmartRecommendation = {
  id: string;
  title: string;
  reason: string;
  products: Product[];
  totalPrice: number;
  emoji: string;
};

export type CartSuggestion = {
  id: string;
  message: string;
  product: Product;
  type: 'missing_drink' | 'pairs_well' | 'complete_meal' | 'reach_minimum';
};

function pickFromCategory(products: Product[], category: string, exclude: Set<string>): Product | null {
  const pool = products.filter((p) => p.category === category && !exclude.has(p.id));
  return pool.find((p) => p.popular) ?? pool[0] ?? null;
}

function pickFromHistory(products: Product[], topIds: string[], exclude: Set<string>): Product | null {
  for (const id of topIds) {
    const p = products.find((pr) => pr.id === id && !exclude.has(id));
    if (p) return p;
  }
  return null;
}

export function recommendationFromProduct(product: Product, reason: string): SmartRecommendation {
  const emoji =
    product.category === 'montados' || product.category === 'tostas'
      ? getCategoryEmoji(product.category)
      : product.image || getCategoryEmoji(product.category);

  return {
    id: `pick-${product.id}`,
    title: product.name,
    reason,
    products: [product],
    totalPrice: product.price,
    emoji,
  };
}

export function getSmartRecommendation(
  products: Product[],
  user: User | null,
  orders: Order[],
  favoriteProductIds: string[] = [],
): SmartRecommendation | null {
  if (products.length === 0) return null;

  const habits = analyzeUserHabits(user, orders, favoriteProductIds);
  const period = getMealPeriod();
  const categories = getCategoriesForNow();
  const used = new Set<string>();
  const bundle: Product[] = [];

  const fromHistory = pickFromHistory(products, habits.topProductIds, used);
  if (fromHistory) {
    bundle.push(fromHistory);
    used.add(fromHistory.id);
  }

  if (bundle.length === 0) {
    const mainCat = habits.favoriteCategory ?? categories[0] ?? 'hamburguesas';
    const main = pickFromCategory(products, mainCat, used)
      ?? products.find((p) => categories.includes(p.category) && !used.has(p.id))
      ?? products.find((p) => p.popular)
      ?? products.find((p) => !used.has(p.id));
    if (main) {
      bundle.push(main);
      used.add(main.id);
    }
  }

  const main = bundle[0];
  if (!main) return null;

  if (!cartHasCategory([{ product: main }], 'bebidas')) {
    const drink = pickBestDrink(products);
    if (drink && !used.has(drink.id)) {
      bundle.push(drink);
      used.add(drink.id);
    }
  }

  const needsSide = ['hamburguesas', 'bocadillos', 'montados', 'sandwiches'].includes(main.category);
  if (needsSide && period !== 'morning' && habits.avgItemsPerOrder >= 2) {
    const side = pickBestSide(products);
    if (side && !used.has(side.id)) {
      bundle.push(side);
      used.add(side.id);
    }
  }

  const totalPrice = bundle.reduce((s, p) => s + p.price, 0);
  const names = bundle.map((p) => p.name).join(' + ');

  let reason = getHabitGreeting(habits, user?.name);
  if (habits.topProductIds.includes(main.id)) {
    reason = `Como sueles pedir — te recomendamos ${names.toLowerCase()}`;
  } else if (period === 'lunch' || period === 'dinner') {
    reason = `Ideal para ${period === 'lunch' ? 'comer' : 'cenar'} ahora`;
  }

  const emoji =
    main.category === 'montados' || main.category === 'tostas'
      ? getCategoryEmoji(main.category)
      : main.image || getCategoryEmoji(main.category);

  return {
    id: `rec-${bundle.map((p) => p.id).join('-')}`,
    title: names,
    reason,
    products: bundle,
    totalPrice,
    emoji,
  };
}

export function getCartSuggestions(
  cartItems: CartItem[],
  allProducts: Product[],
  minOrderAmount: number,
): CartSuggestion[] {
  const suggestions: CartSuggestion[] = [];
  const inCart = new Set(cartItems.map((i) => i.product.id));
  const total = cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  if (cartItems.length > 0 && !cartHasCategory(cartItems, 'bebidas')) {
    const drink = pickBestDrink(allProducts);
    if (drink && !inCart.has(drink.id)) {
      suggestions.push({
        id: `drink-${drink.id}`,
        message: '¿Quieres añadir bebida?',
        product: drink,
        type: 'missing_drink',
      });
    }
  }

  const hasMain = cartItems.some((i) =>
    ['hamburguesas', 'bocadillos', 'montados', 'sandwiches', 'tostas'].includes(i.product.category),
  );
  const hasSide = cartHasCategory(cartItems, 'raciones');
  if (hasMain && !hasSide) {
    const side = pickBestSide(allProducts);
    if (side && !inCart.has(side.id)) {
      suggestions.push({
        id: `side-${side.id}`,
        message: 'Combina bien con patatas',
        product: side,
        type: 'complete_meal',
      });
    }
  }

  if (total > 0 && total < minOrderAmount) {
    const remaining = minOrderAmount - total;
    const affordable = allProducts
      .filter((p) => !inCart.has(p.id) && p.price >= remaining * 0.8 && p.price <= remaining + 3)
      .sort((a, b) => a.price - b.price)[0];
    if (affordable) {
      suggestions.push({
        id: `min-${affordable.id}`,
        message: `Completa el mínimo con esto (+${affordable.price.toFixed(2)}€)`,
        product: affordable,
        type: 'reach_minimum',
      });
    }
  }

  if (cartItems.length === 1) {
    const pairs = getAlsoOrderedWith(cartItems[0].product, allProducts, 1);
    pairs.forEach((p) => {
      if (!inCart.has(p.id) && !suggestions.some((s) => s.product.id === p.id)) {
        suggestions.push({
          id: `pair-${p.id}`,
          message: 'Los clientes también piden…',
          product: p,
          type: 'pairs_well',
        });
      }
    });
  }

  return suggestions.slice(0, 3);
}

export function getPopularProducts(products: Product[], limit = 4): Product[] {
  return products.filter((p) => p.popular || p.featured).slice(0, limit);
}

export function getPersonalizedSuggestions(
  products: Product[],
  user: User | null,
  orders: Order[],
  favoriteProductIds: string[] = [],
  limit = 4,
  randomSeed = Math.random(),
  contextCategory?: Category,
): Product[] {
  const habits = analyzeUserHabits(user, orders, favoriteProductIds);
  const periodCats = getCategoriesForNow();
  const used = new Set<string>();

  const poolProducts = contextCategory
    ? products.filter((p) => p.category === contextCategory)
    : products;

  const scored = poolProducts.map((product) => {
    let score = 0;
    const historyIdx = habits.topProductIds.indexOf(product.id);
    if (historyIdx >= 0) score += 80 - historyIdx * 12;
    if (product.popular) score += 25;
    if (product.featured) score += 15;
    if (periodCats.includes(product.category)) score += 10;
    if (habits.favoriteCategory === product.category) score += 12;
    if (contextCategory && product.category === contextCategory) score += 60;
    return { product, score: scoreWithJitter(score, () => randomSeed + product.id.length * 0.01) };
  });

  scored.sort((a, b) => b.score - a.score);
  const pool = shuffle(
    scored.filter((entry) => entry.score > 15).map((entry) => entry.product),
    () => randomSeed,
  );

  const result: Product[] = [];
  for (const product of pool) {
    if (result.length >= limit) break;
    if (used.has(product.id)) continue;
    used.add(product.id);
    result.push(product);
  }

  if (result.length < limit) {
    for (const product of shuffle(poolProducts, () => randomSeed + 0.5)) {
      if (result.length >= limit) break;
      if (used.has(product.id)) continue;
      used.add(product.id);
      result.push(product);
    }
  }

  return result;
}

export function getShuffledRecommendationPool(
  products: Product[],
  user: User | null,
  orders: Order[],
  favoriteProductIds: string[] = [],
  excludeIds: Set<string> = new Set(),
  randomSeed = Math.random(),
): Product[] {
  const habits = analyzeUserHabits(user, orders, favoriteProductIds);
  const periodCats = getCategoriesForNow();

  const scored = products
    .filter((p) => !excludeIds.has(p.id))
    .map((product) => {
      let score = 0;
      if (habits.topProductIds.includes(product.id)) score += 50;
      if (product.popular) score += 30;
      if (product.featured) score += 20;
      if (periodCats.includes(product.category)) score += 15;
      return { product, score: scoreWithJitter(score, () => randomSeed + product.price) };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.product);

  return shuffle(scored, () => randomSeed);
}

export function getUsualOrder(orders: Order[], userId: string): import('../types').CartItem[] | null {
  const userOrders = orders
    .filter((o) => o.userId === userId && o.status === 'delivered')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (userOrders.length === 0) return null;

  const signatureCounts = new Map<string, { count: number; items: import('../types').CartItem[] }>();

  userOrders.forEach((order) => {
    const sig = order.items
      .map((i) => `${i.productId}:${i.removedIngredients.sort().join(',')}:${i.quantity}`)
      .sort()
      .join('|');
    const existing = signatureCounts.get(sig);
    if (existing) existing.count += 1;
    else signatureCounts.set(sig, { count: 1, items: order.items });
  });

  let best: import('../types').CartItem[] | null = null;
  let maxCount = 0;
  signatureCounts.forEach(({ count, items }) => {
    if (count > maxCount) {
      maxCount = count;
      best = items;
    }
  });

  return maxCount >= 2 ? best : userOrders[0]?.items ?? null;
}

export function getFavoriteProductName(products: Product[], favoriteProductId?: string): string {
  if (!favoriteProductId) return '—';
  return products.find((p) => p.id === favoriteProductId)?.name ?? '—';
}
