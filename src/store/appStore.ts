import { create } from 'zustand';
import type { FavoriteOrder, Notification } from '../types';
import * as productsApi from '../api/products';
import { generateId } from '../utils/format';

type AppState = {
  favoriteProductIds: string[];
  favoriteOrders: FavoriteOrder[];
  notifications: Notification[];
  businessMessages: import('../types').BusinessMessage[];
  toast: string | null;
  orderReadyOverlay: { orderId: string; type: 'pickup' | 'delivery' } | null;
  systemChatByOrder: Record<string, { id: string; text: string; at: string }[]>;
  loadFavorites: (userId: string) => Promise<void>;
  toggleFavorite: (userId: string, productId: string) => Promise<void>;
  saveFavoriteOrder: (userId: string, name: string, items: FavoriteOrder['items']) => Promise<void>;
  loadBusinessMessages: () => Promise<void>;
  addNotification: (title: string, message: string) => void;
  markNotificationsRead: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  showOrderReady: (orderId: string, type: 'pickup' | 'delivery') => void;
  dismissOrderReady: () => void;
  pushSystemChatMessage: (orderId: string, text: string) => void;
  getSystemChatMessages: (orderId: string) => { id: string; text: string; at: string }[];
};

export const useAppStore = create<AppState>((set, get) => ({
  favoriteProductIds: [],
  favoriteOrders: [],
  notifications: [],
  businessMessages: [],
  toast: null,
  orderReadyOverlay: null,
  systemChatByOrder: {},

  loadFavorites: async (userId) => {
    const [favoriteProductIds, favoriteOrders] = await Promise.all([
      productsApi.getFavoriteProducts(userId),
      productsApi.getFavoriteOrders(userId),
    ]);
    set({ favoriteProductIds, favoriteOrders });
  },

  toggleFavorite: async (userId, productId) => {
    const added = await productsApi.toggleFavoriteProduct(userId, productId);
    set((s) => ({
      favoriteProductIds: added
        ? [...s.favoriteProductIds, productId]
        : s.favoriteProductIds.filter((id) => id !== productId),
    }));
    get().showToast(added ? '❤️ Añadido a favoritos' : 'Eliminado de favoritos');
  },

  saveFavoriteOrder: async (userId, name, items) => {
    const fav = await productsApi.saveFavoriteOrder(userId, name, items);
    set((s) => ({ favoriteOrders: [fav, ...s.favoriteOrders] }));
    get().showToast('Pedido guardado en favoritos');
  },

  loadBusinessMessages: async () => {
    const businessMessages = await productsApi.getBusinessMessages();
    set({ businessMessages });
  },

  addNotification: (title, message) => {
    const notification: Notification = {
      id: generateId('notif'),
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ notifications: [notification, ...s.notifications] }));
  },

  markNotificationsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  showToast: (message) => {
    set({ toast: message });
    setTimeout(() => {
      if (get().toast === message) set({ toast: null });
    }, 2500);
  },

  clearToast: () => set({ toast: null }),

  showOrderReady: (orderId, type) => set({ orderReadyOverlay: { orderId, type } }),
  dismissOrderReady: () => {
    const id = get().orderReadyOverlay?.orderId;
    if (id) sessionStorage.setItem(`ready-dismissed-${id}`, '1');
    set({ orderReadyOverlay: null });
  },

  pushSystemChatMessage: (orderId, text) => {
    const entry = { id: generateId('sys'), text, at: new Date().toISOString() };
    set((s) => ({
      systemChatByOrder: {
        ...s.systemChatByOrder,
        [orderId]: [...(s.systemChatByOrder[orderId] ?? []), entry],
      },
    }));
  },

  getSystemChatMessages: (orderId) => get().systemChatByOrder[orderId] ?? [],
}));
