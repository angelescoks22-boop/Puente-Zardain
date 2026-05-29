import type { Category, Product } from '../types';

/** Combinaciones que funcionan bien juntas */
const CATEGORY_PAIRS: Partial<Record<Category, Category[]>> = {
  hamburguesas: ['bebidas', 'raciones'],
  bocadillos: ['bebidas', 'raciones'],
  montados: ['bebidas', 'raciones'],
  raciones: ['bebidas', 'hamburguesas'],
  tostas: ['bebidas', 'raciones'],
  sandwiches: ['bebidas', 'raciones'],
  ensaladas: ['bebidas', 'raciones'],
  bebidas: ['hamburguesas', 'bocadillos', 'raciones'],
};

/** Productos que suelen ir juntos (por nombre aproximado en carta) */
const POPULAR_PAIRS: [string, string][] = [
  ['hamburguesa', 'patatas'],
  ['hamburguesa', 'refresco'],
  ['montado', 'cerveza'],
  ['bocadillo', 'agua'],
  ['bocadillo', 'cerveza'],
  ['alitas', 'cerveza'],
  ['tosta', 'cerveza'],
  ['sándwich', 'refresco'],
];

export function cartHasCategory(items: { product: Product }[], category: Category): boolean {
  return items.some((i) => i.product.category === category);
}

export function cartMainCategories(items: { product: Product }[]): Category[] {
  const cats = new Set(items.map((i) => i.product.category));
  return [...cats].filter((c) => c !== 'bebidas');
}

export function getPairingProducts(
  cartItems: { product: Product }[],
  allProducts: Product[],
  limit = 2,
): Product[] {
  const inCart = new Set(cartItems.map((i) => i.product.id));
  const mains = cartMainCategories(cartItems);
  const suggestions: Product[] = [];

  for (const main of mains) {
    const pairCats = CATEGORY_PAIRS[main] ?? [];
    for (const cat of pairCats) {
      const candidate = allProducts.find((p) => p.category === cat && !inCart.has(p.id));
      if (candidate && !suggestions.some((s) => s.id === candidate.id)) {
        suggestions.push(candidate);
      }
    }
  }

  if (suggestions.length < limit) {
    const mainNames = cartItems.map((i) => i.product.name.toLowerCase()).join(' ');
    for (const [a, b] of POPULAR_PAIRS) {
      if (mainNames.includes(a)) {
        const match = allProducts.find(
          (p) => p.name.toLowerCase().includes(b) && !inCart.has(p.id),
        );
        if (match && !suggestions.some((s) => s.id === match.id)) {
          suggestions.push(match);
        }
      }
    }
  }

  return suggestions.slice(0, limit);
}

export function getAlsoOrderedWith(
  product: Product,
  allProducts: Product[],
  limit = 3,
): Product[] {
  const name = product.name.toLowerCase();
  const pairCats = CATEGORY_PAIRS[product.category] ?? ['bebidas'];
  const keywords: string[] = [];

  if (name.includes('hamburg')) keywords.push('patatas', 'refresco');
  if (name.includes('bocad') || name.includes('montado')) keywords.push('agua', 'cerveza', 'patatas');
  if (name.includes('alita')) keywords.push('cerveza');
  if (name.includes('tosta')) keywords.push('cerveza', 'vino');
  if (name.includes('sándwich') || name.includes('sandwich')) keywords.push('refresco', 'agua');

  const results: Product[] = [];
  for (const cat of pairCats) {
    const items = allProducts.filter((p) => p.category === cat && p.id !== product.id);
    const sorted = items.sort((a, b) => {
      const aMatch = keywords.some((k) => a.name.toLowerCase().includes(k)) ? 1 : 0;
      const bMatch = keywords.some((k) => b.name.toLowerCase().includes(k)) ? 1 : 0;
      return bMatch - aMatch || (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
    });
    results.push(...sorted.slice(0, 1));
  }

  return [...new Map(results.map((p) => [p.id, p])).values()].slice(0, limit);
}

export function pickBestDrink(products: Product[]): Product | null {
  const drinks = products.filter((p) => p.category === 'bebidas');
  const hour = new Date().getHours();
  const prefer = hour >= 20 ? ['cerveza', 'cola'] : ['agua', 'refresco', 'cola'];
  for (const key of prefer) {
    const match = drinks.find((d) => d.name.toLowerCase().includes(key));
    if (match) return match;
  }
  return drinks.find((d) => d.popular) ?? drinks[0] ?? null;
}

export function pickBestSide(products: Product[]): Product | null {
  const sides = products.filter((p) => p.category === 'raciones');
  return sides.find((p) => p.name.toLowerCase().includes('patata')) ?? sides.find((p) => p.popular) ?? sides[0] ?? null;
}
