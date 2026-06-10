import { create } from 'zustand';
import type { FavoriteOrder, Notification } from '../types';
import * as productsApi from '../api/products';
import { ensureAppSocket, onBusinessMessagesUpdate } from '../api/chatSocket';
import { generateId } from '../utils/format';
import { loadNotifications, saveNotifications } from '../utils/notificationsStorage';

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
  deleteFavoriteOrder: (userId: string, favId: string) => Promise<void>;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  loadBusinessMessages: () => Promise<void>;
  startBusinessMessagesSync: () => () => void;
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
  notifications: loadNotifications(),
  businessMessages: [],
  toast: null,
  orderReadyOverlay: null,
  systemChatByOrder: {},

  loadFavorites: async (userId) => {
    try {
      const [favoriteProductIds, favoriteOrders] = await Promise.all([
        productsApi.getFavoriteProducts(userId),
        productsApi.getFavoriteOrders(userId),
      ]);
      set({ favoriteProductIds, favoriteOrders });
    } catch {
      get().showToast('No se pudieron cargar los favoritos');
    }
  },

  toggleFavorite: async (userId, productId) => {
    const prev = get().favoriteProductIds;
    const wasFavorite = prev.includes(productId);
    set({
      favoriteProductIds: wasFavorite
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    });
    try {
      const added = await productsApi.toggleFavoriteProduct(userId, productId);
      set((s) => ({
        favoriteProductIds: added
          ? [...new Set([...s.favoriteProductIds, productId])]
          : s.favoriteProductIds.filter((id) => id !== productId),
      }));
      get().showToast(added ? '❤️ Añadido a favoritos' : 'Eliminado de favoritos');
    } catch (e) {
      set({ favoriteProductIds: prev });
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar favoritos';
      get().showToast(msg);
    }
  },

  saveFavoriteOrder: async (userId, name, items) => {
    try {
      const fav = await productsApi.saveFavoriteOrder(userId, name, items);
      set((s) => ({ favoriteOrders: [fav, ...s.favoriteOrders] }));
      get().showToast('Pedido guardado en favoritos');
    } catch {
      get().showToast('No se pudo guardar el pedido');
    }
  },

  deleteFavoriteOrder: async (userId, favId) => {
    const prev = get().favoriteOrders;
    set({ favoriteOrders: prev.filter((f) => f.id !== favId) });
    try {
      await productsApi.deleteFavoriteOrder(userId, favId);
      get().showToast('Pedido eliminado de favoritos');
    } catch {
      set({ favoriteOrders: prev });
      get().showToast('No se pudo eliminar el favorito');
    }
  },

  removeNotification: (id) => {
    set((s) => {
      const notifications = s.notifications.filter((n) => n.id !== id);
      saveNotifications(notifications);
      return { notifications };
    });
  },

  clearNotifications: () => {
    set({ notifications: [] });
    saveNotifications([]);
  },

  loadBusinessMessages: async () => {
    try {
      const businessMessages = await productsApi.getBusinessMessages();
      set({ businessMessages });
    } catch {
      set({ businessMessages: [] });
    }
  },

  startBusinessMessagesSync: () => {
    ensureAppSocket();
    void get().loadBusinessMessages();

    const interval = setInterval(() => {
      void get().loadBusinessMessages();
    }, 30_000);

    const stopSocket = onBusinessMessagesUpdate(() => {
      void get().loadBusinessMessages();
    });

    return () => {
      clearInterval(interval);
      stopSocket();
    };
  },

  addNotification: (title, message) => {
    const notification: Notification = {
      id: generateId('notif'),
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => {
      const notifications = [notification, ...s.notifications].slice(0, 50);
      saveNotifications(notifications);
      return { notifications };
    });
  },

  markNotificationsRead: () => {
    set((s) => {
      const notifications = s.notifications.map((n) => ({ ...n, read: true }));
      saveNotifications(notifications);
      return { notifications };
    });
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
