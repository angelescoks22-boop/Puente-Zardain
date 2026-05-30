import type { IProduct } from '../models/Product.js';
import * as productsRepo from '../db/products.js';
import { shuffle } from '../utils/shuffle.js';

const VALID_CATEGORIES = [
  'hamburguesas',
  'bocadillos',
  'montados',
  'raciones',
  'bebidas',
  'tostas',
  'sandwiches',
  'ensaladas',
] as const;

const DEPRECATED_CATEGORIES = ['combinados'];

export type ProductCategory = (typeof VALID_CATEGORIES)[number];

export function isValidCategory(value: string): value is ProductCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export function formatProduct(p: IProduct) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category,
    image: p.image,
    ingredients: p.ingredients ?? [],
    popular: p.popular,
    featured: p.featured,
    active: p.active,
  };
}

/** Todos los productos son iguales — excluye categorías obsoletas (combinados) */
export async function listProducts(category?: string) {
  if (category && DEPRECATED_CATEGORIES.includes(category)) {
    return { products: [], invalidCategory: true as const };
  }

  if (category) {
    if (!isValidCategory(category)) {
      return { products: [], invalidCategory: true as const };
    }
    const products = await productsRepo.find({ active: true, category });
    return { products, invalidCategory: false as const };
  }

  const products = await productsRepo.find({ active: true, category: { nin: DEPRECATED_CATEGORIES } });
  return { products, invalidCategory: false as const };
}

/** Recomendaciones con orden aleatorio real — sin combinados */
export async function getRecommendations(limit = 3, category?: string) {
  const { products, invalidCategory } = await listProducts(category);
  if (invalidCategory) return [];

  const popular = products.filter((p) => p.popular || p.featured);
  const pool = popular.length >= limit ? popular : products;
  return shuffle(pool).slice(0, limit).map(formatProduct);
}

/** Desactiva productos legacy de categorías eliminadas */
export async function deactivateDeprecatedProducts() {
  await productsRepo.deactivateByCategories(DEPRECATED_CATEGORIES);
}
