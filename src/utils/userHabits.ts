import type { Category, Order, Product, User } from '../types';

export type MealPeriod = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'late';

export type UserHabits = {
  favoriteCategory: Category | null;
  topProductIds: string[];
  preferredPeriod: MealPeriod | null;
  orderFrequency: 'new' | 'occasional' | 'regular' | 'frequent';
  avgItemsPerOrder: number;
};

export function getMealPeriod(date = new Date()): MealPeriod {
  const h = date.getHours();
  if (h >= 7 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 20) return 'afternoon';
  if (h >= 20 && h < 24) return 'dinner';
  return 'late';
}

const PERIOD_LABELS: Record<MealPeriod, string> = {
  morning: 'desayuno',
  lunch: 'comida',
  afternoon: 'merienda',
  dinner: 'cena',
  late: 'cena tardía',
};

const PERIOD_CATEGORIES: Record<MealPeriod, Category[]> = {
  morning: ['montados', 'bocadillos', 'sandwiches', 'tostas', 'bebidas'],
  lunch: ['hamburguesas', 'bocadillos', 'montados', 'raciones', 'ensaladas', 'bebidas'],
  afternoon: ['montados', 'bocadillos', 'raciones', 'tostas', 'sandwiches', 'bebidas'],
  dinner: ['hamburguesas', 'raciones', 'tostas', 'ensaladas', 'bebidas'],
  late: ['hamburguesas', 'bocadillos', 'raciones', 'bebidas'],
};

export function getCategoriesForNow(date = new Date()): Category[] {
  return PERIOD_CATEGORIES[getMealPeriod(date)];
}

export function getPeriodLabel(date = new Date()): string {
  return PERIOD_LABELS[getMealPeriod(date)];
}

export function analyzeUserHabits(
  user: User | null,
  orders: Order[],
  favoriteProductIds: string[] = [],
): UserHabits {
  if (!user) {
    return {
      favoriteCategory: null,
      topProductIds: [],
      preferredPeriod: getMealPeriod(),
      orderFrequency: 'new',
      avgItemsPerOrder: 0,
    };
  }

  const userOrders = orders.filter((o) => o.userId === user.id && o.status !== 'cancelled');
  const categoryCount = new Map<Category, number>();
  const productCount = new Map<string, number>();
  const periodCount = new Map<MealPeriod, number>();
  let totalItems = 0;

  userOrders.forEach((order) => {
    const period = getMealPeriod(new Date(order.createdAt));
    periodCount.set(period, (periodCount.get(period) ?? 0) + 1);
    totalItems += order.items.length;
    order.items.forEach((item) => {
      productCount.set(item.productId, (productCount.get(item.productId) ?? 0) + item.quantity);
      categoryCount.set(item.product.category, (categoryCount.get(item.product.category) ?? 0) + item.quantity);
    });
  });

  const topProductIds = [...productCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  favoriteProductIds.forEach((id) => {
    if (!topProductIds.includes(id)) topProductIds.unshift(id);
  });

  const favoriteCategory =
    [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const preferredPeriod =
    [...periodCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? getMealPeriod();

  let orderFrequency: UserHabits['orderFrequency'] = 'new';
  if (userOrders.length >= 8 || user.orderCount >= 8) orderFrequency = 'frequent';
  else if (userOrders.length >= 3 || user.orderCount >= 3) orderFrequency = 'regular';
  else if (userOrders.length >= 1) orderFrequency = 'occasional';

  return {
    favoriteCategory,
    topProductIds: topProductIds.slice(0, 5),
    preferredPeriod,
    orderFrequency,
    avgItemsPerOrder: userOrders.length ? totalItems / userOrders.length : 0,
  };
}

/** Orden invisible: favoritos y categoría habitual primero */
export function sortProductsByHabits(products: Product[], habits: UserHabits): Product[] {
  const score = (p: Product) => {
    let s = 0;
    const topIdx = habits.topProductIds.indexOf(p.id);
    if (topIdx >= 0) s += 100 - topIdx * 10;
    if (p.category === habits.favoriteCategory) s += 20;
    if (getCategoriesForNow().includes(p.category)) s += 10;
    if (p.popular) s += 5;
    if (p.featured) s += 3;
    return s;
  };
  return [...products].sort((a, b) => score(b) - score(a));
}

export function getHabitGreeting(habits: UserHabits, userName?: string): string {
  const name = userName?.split(' ')[0];
  if (habits.orderFrequency === 'frequent' && name) {
    return `Como siempre, ${name} — esto encaja contigo`;
  }
  if (habits.orderFrequency === 'regular') {
    return 'Basado en lo que sueles pedir';
  }
  return `Perfecto para ${getPeriodLabel()}`;
}
