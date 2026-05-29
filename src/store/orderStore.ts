import { create } from 'zustand';
import type { Order } from '../types';
import * as ordersApi from '../api/orders';

type OrderState = {
  orders: Order[];
  activeOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  fetchOrders: (userId: string) => Promise<void>;
  fetchActiveOrder: (userId: string) => Promise<void>;
  createOrder: (input: Parameters<typeof ordersApi.createOrder>[0]) => Promise<Order>;
  refreshActiveOrder: (orderId: string) => Promise<void>;
  clearError: () => void;
};

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  activeOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const orders = await ordersApi.getOrdersByUser(userId);
      set({ orders, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Error al cargar pedidos',
      });
    }
  },

  fetchActiveOrder: async (userId) => {
    try {
      const activeOrder = await ordersApi.getActiveOrder(userId);
      set({ activeOrder });
    } catch {
      // non-critical
    }
  },

  createOrder: async (input) => {
    set({ error: null });
    const order = await ordersApi.createOrder(input);
    set((s) => ({ orders: [order, ...s.orders], activeOrder: order }));
    return order;
  },

  refreshActiveOrder: async (orderId) => {
    const order = await ordersApi.getOrderById(orderId);
    if (order) {
      set({ activeOrder: order });
      set((s) => ({
        orders: s.orders.map((o) => (o.id === orderId ? order : o)),
      }));
    }
  },

  clearError: () => set({ error: null }),
}));
