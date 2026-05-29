import { create } from 'zustand';

import type { CartItem, Product } from '../types';

import { MIN_ORDER_AMOUNT } from '../data/levels';

import { generateId } from '../utils/format';

import { validateCustomization } from '../utils/ingredients';

import { loadCartFromStorage, saveCartToStorage } from '../utils/cartStorage';



const initialItems = loadCartFromStorage();



type CartState = {

  items: CartItem[];

  wasRestoredFromStorage: boolean;

  addItem: (product: Product, quantity?: number, removedIngredients?: string[]) => void;

  removeItem: (itemId: string) => void;

  updateQuantity: (itemId: string, quantity: number) => void;

  clearCart: () => void;

  repeatOrder: (items: CartItem[]) => void;

  dismissRestoredNotice: () => void;

  total: () => number;

  itemCount: () => number;

  meetsMinimum: () => boolean;

  remainingForMinimum: () => number;

};



function persist(items: CartItem[]) {

  saveCartToStorage(items);

}



export const useCartStore = create<CartState>((set, get) => ({

  items: initialItems,

  wasRestoredFromStorage: initialItems.length > 0,



  addItem: (product, quantity = 1, removedIngredients = []) => {

    const validation = validateCustomization(product.ingredients, removedIngredients);

    if (!validation.valid) throw new Error(validation.error);



    const sig = `${product.id}:${removedIngredients.sort().join(',')}`;

    const existing = get().items.find(

      (i) => `${i.productId}:${i.removedIngredients.sort().join(',')}` === sig,

    );



    let next: CartItem[];

    if (existing) {

      next = get().items.map((i) =>

        i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i,

      );

    } else {

      const item: CartItem = {

        id: generateId('cart'),

        productId: product.id,

        product,

        quantity,

        removedIngredients,

        unitPrice: product.price,

      };

      next = [...get().items, item];

    }



    persist(next);

    set({ items: next, wasRestoredFromStorage: false });

  },



  removeItem: (itemId) => {

    const next = get().items.filter((i) => i.id !== itemId);

    persist(next);

    set({ items: next });

  },



  updateQuantity: (itemId, quantity) => {

    if (quantity <= 0) {

      get().removeItem(itemId);

      return;

    }

    const next = get().items.map((i) => (i.id === itemId ? { ...i, quantity } : i));

    persist(next);

    set({ items: next });

  },



  clearCart: () => {

    persist([]);

    set({ items: [], wasRestoredFromStorage: false });

  },



  repeatOrder: (items) => {

    const newItems = items.map((item) => ({

      ...item,

      id: generateId('cart'),

      product: item.product,

    }));

    persist(newItems);

    set({ items: newItems, wasRestoredFromStorage: false });

  },



  dismissRestoredNotice: () => set({ wasRestoredFromStorage: false }),



  total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),



  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),



  meetsMinimum: () => get().total() >= MIN_ORDER_AMOUNT,



  remainingForMinimum: () => Math.max(0, MIN_ORDER_AMOUNT - get().total()),

}));

