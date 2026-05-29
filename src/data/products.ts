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
