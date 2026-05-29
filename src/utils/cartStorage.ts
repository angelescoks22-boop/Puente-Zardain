import type { CartItem } from '../types';

const CART_KEY = 'zardain_cart_v1';

export function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item?.product?.id &&
        item?.product?.name &&
        typeof item.quantity === 'number' &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function saveCartToStorage(items: CartItem[]) {
  if (items.length === 0) {
    localStorage.removeItem(CART_KEY);
    return;
  }
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}
