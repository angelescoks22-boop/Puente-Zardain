import type { Category } from '../types';

export const CATEGORY_LABELS: Record<Category, string> = {
  raciones: 'Raciones',
  hamburguesas: 'Hamburguesas',
  montados: 'Montados',
  bocadillos: 'Bocadillos',
  tostas: 'Tostas',
  sandwiches: 'Sándwiches',
  ensaladas: 'Ensaladas',
  bebidas: 'Bebidas',
};

/** Todas las categorías de la carta (montados y bocadillos separados) */
export const MENU_CATEGORIES: Category[] = [
  'raciones',
  'hamburguesas',
  'montados',
  'bocadillos',
  'tostas',
  'sandwiches',
  'ensaladas',
  'bebidas',
];

export const MONTADOS_CATEGORY: Category = 'montados';
export const BOCADILLOS_CATEGORY: Category = 'bocadillos';

/** Emoji por categoría — montado ≠ bocadillo ≠ sándwich */
export const CATEGORY_EMOJI: Record<Category, string> = {
  raciones: '🍽️',
  hamburguesas: '🍔',
  montados: '🍞',
  bocadillos: '🥖',
  tostas: '🫓',
  sandwiches: '🥪',
  ensaladas: '🥗',
  bebidas: '🥤',
};

export function getCategoryEmoji(category: Category): string {
  return CATEGORY_EMOJI[category] ?? '🍽️';
}
