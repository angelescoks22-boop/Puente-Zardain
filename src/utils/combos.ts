import type { Product } from '../types';
import { formatPrice } from './format';

export type Combo = {
  id: string;
  name: string;
  tagline: string;
  productNames: string[];
  discount: number;
  emoji: string;
};

function findProduct(products: Product[], query: string): Product | undefined {
  const q = query.toLowerCase();
  return products.find((p) => p.name.toLowerCase().includes(q));
}

export const COMBOS: Combo[] = [
  {
    id: 'combo-zardain',
    name: 'Combo Zardaín',
    tagline: 'Hamburguesa Zardaín + patatas + refresco',
    productNames: ['Hamburguesa Zardaín', 'Patatas CheeseBacon', 'Refrescos'],
    discount: 1.5,
    emoji: '🍔🍟🥤',
  },
  {
    id: 'combo-chispon',
    name: 'Combo Chispón',
    tagline: 'Hamburguesa Chispón + alitas + cerveza',
    productNames: ['Hamburguesa Chispón', 'Alitas de pollo', 'Cerveza doble'],
    discount: 2.0,
    emoji: '🍔🍗🍺',
  },
  {
    id: 'combo-bocata',
    name: 'Combo Bocata',
    tagline: 'Bocadillo de lomo + patatas + agua',
    productNames: ['Bocadillo de lomo', 'Patatas CheeseBacon', 'Agua'],
    discount: 1.0,
    emoji: '🥪🍟💧',
  },
];

export function resolveCombo(combo: Combo, products: Product[]) {
  const items = combo.productNames
    .map((name) => findProduct(products, name))
    .filter((p): p is Product => !!p);
  if (items.length !== combo.productNames.length) return null;
  const subtotal = items.reduce((s, p) => s + p.price, 0);
  const total = Math.max(0, subtotal - combo.discount);
  return { items, subtotal, total, savings: combo.discount };
}

export function formatComboPrice(total: number, savings: number) {
  return `${formatPrice(total)} · ahorras ${formatPrice(savings)}`;
}
