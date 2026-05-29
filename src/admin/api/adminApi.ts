import { useEffect, useState, useCallback } from 'react';

import { adminFetch, getToken, API_BASE } from '../../api/client';



export type BusinessStatus = 'open' | 'closed' | 'saturated';



export type AdminOrder = {

  id: string;

  clientName: string;

  clientPhone: string;

  address?: string;

  deliveryAddress?: {
    fullAddress: string;
    city: string;
    lat: number;
    lng: number;
    portal?: string;
    floor?: string;
    door?: string;
    details?: string;
  };

  deliveryLat?: number;

  deliveryLng?: number;

  items: { productName: string; quantity: number; removedIngredients: string[]; unitPrice: number }[];

  total: number;

  type: string;

  paymentMethod: string;

  cashPaidAmount?: number;

  cashChange?: number;

  status: string;

  queuePosition: number;

  internalNotes?: string;

  cancelReason?: string;

  elapsedMinutes?: number;

  isDelayed?: boolean;

  createdAt: string;

};



export type DashboardData = {

  live: {

    activeOrders: number;

    queueCount: number;

    avgPrepMinutes: number;

    ordersOpen: boolean;

    businessStatus: BusinessStatus;

    prepTimeTarget: number;

    effectivePrepMinutes: number;

    unreadChats: number;

  };

  revenue: { today: number; ordersToday: number; avgTicket: number };

  alerts: { id: string; type: string; severity: string; message: string; orderId?: string }[];

  insights: { id: string; icon: string; message: string; tone: string }[];

  vipClients: { id: string; name: string; orderCount: number; level: string; zardas: number }[];

  problematicClients: { id: string; name: string; phone: string; orderCount: number; clientStatus: string; noShowCount: number; isBlocked: boolean }[];

  dailySales: { _id: string; orders: number; revenue: number }[];

  ordersByHour?: { hour: string; count: number }[];
  todayReport?: {
    date: string;
    totalOrders: number;
    totalRevenue: number;
    topProduct: string;
    peakHour: string;
    newClients: number;
    recurringClients: number;
    avgTicket: number;
    summary: string;
    isLive?: boolean;
  };
  lastDailyReport?: {
    date: string;
    totalOrders: number;
    topProduct: string;
    peakHour: string;
    newClients: number;
    summary: string;
  } | null;
  updatedAt: string;

};



export type AdminCustomer = {

  id: string;

  name: string;

  phone: string;

  orderCount: number;

  level: string;

  zardas: number;

  clientStatus: string;

};

export type AdminCustomerAddress = {
  id: string;
  fullAddress: string;
  city: string;
  label?: string;
  isDefault?: boolean;
};

export type AdminReview = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  approved: boolean;
  verified?: boolean;
  adminResponse?: string;
  featured?: boolean;
  createdAt: string;
};



export type Analytics = {

  sales: { today: number; week: number; ordersToday: number; ordersWeek: number };

  peakHours: { hour: string; count: number }[];

  topProducts: { _id: string; total: number; revenue: number }[];

  leastProducts: { _id: string; total: number; revenue: number }[];

  clients: { new: number; recurring: number; total: number };

  predictions: { estimatedDailyOrders: number; topDemand: string };

};



export type Settings = {

  minOrderAmount: number;

  deliveryArea: string;

  ordersOpen: boolean;

  businessStatus: BusinessStatus;

  prepTimeMinutes: number;

  schedule: { openTime: string; closeTime: string; autoSchedule: boolean };

  autoRules: {

    saturatedOrderThreshold: number;

    prepTimeBoostWhenSaturated: number;

    autoSaturateEnabled: boolean;

  };

  promo?: { active: boolean; zardasMultiplier: number; label: string; autoManaged?: boolean };

  automation: {

    enabled: boolean;

    autoPromoEnabled: boolean;

    slowDayRatio: number;

    busyDayRatio: number;

    autoBonusZardas: boolean;

    autoBonusAmount: number;

    chatAutoEnabled: boolean;

    chatAutoReplyEnabled: boolean;

    dailyReportEnabled: boolean;

    cleanupChatDays: number;

    cleanupLogDays: number;

  };

};



export type OrderTimelineEntry = {

  id: string;

  fromStatus: string;

  toStatus: string;

  changedByName: string;

  changedByRole: string;

  reason?: string;

  createdAt: string;

};



export type MapOrder = {

  id: string;

  clientName: string;

  address?: string;

  status: string;

  total: number;

  lat: number;

  lng: number;

  createdAt: string;

};



export type SystemHealth = {

  ok: boolean;

  timestamp: string;

  services: { api: boolean; database: string; chat: string; socket: boolean };

  metrics: { activeOrders: number; autoRules: unknown };

};



export type SystemLogEntry = {

  id: string;

  level: 'info' | 'warn' | 'error';

  message: string;

  meta?: Record<string, unknown>;

  createdAt: string;

};



export const adminApi = {

  getDashboard: () => adminFetch<DashboardData>('/dashboard'),



  getOrders: (opts?: { active?: boolean; from?: string; to?: string; date?: string }) => {
    const params = new URLSearchParams();
    if (opts?.active) params.set('active', 'true');
    if (opts?.from) params.set('from', opts.from);
    if (opts?.to) params.set('to', opts.to);
    if (opts?.date) params.set('date', opts.date);
    const q = params.toString();
    return adminFetch<AdminOrder[]>(`/orders${q ? `?${q}` : ''}`);
  },



  updateOrderNotes: (id: string, internalNotes: string) =>

    adminFetch<AdminOrder>(`/orders/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ internalNotes }) }),



  updateOrderStatus: (id: string, status: string) =>

    adminFetch<AdminOrder>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),



  cancelOrder: (id: string, reason: string) =>

    adminFetch<AdminOrder>(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),



  getOrderTimeline: (id: string) => adminFetch<OrderTimelineEntry[]>(`/orders/${id}/timeline`),



  getMapOrders: () => adminFetch<MapOrder[]>('/orders/map'),



  getTicket: (id: string) => adminFetch<{ id: string; client: string; address: string; items: string[]; total: number; time: string; autoGenerated?: boolean }>(`/orders/${id}/ticket`),

  downloadTicket: async (id: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/admin/orders/${id}/ticket/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Error al descargar ticket');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${id.slice(-6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getDailyReports: () => adminFetch<{ date: string; totalOrders: number; topProduct: string; peakHour: string; newClients: number; summary: string }[]>('/reports/daily'),



  getQueue: () => adminFetch<{ count: number; estimatedMinutes: number; prepTimeMinutes: number }>('/orders/queue'),



  getCustomers: () => adminFetch<AdminCustomer[]>('/customers'),

  getCustomerDetail: (id: string) =>
    adminFetch<{
      user: AdminCustomer & { email?: string; address?: string; addresses?: AdminCustomerAddress[]; streak?: number; createdAt?: string };
      orders: AdminOrder[];
    }>(`/customers/${id}`),

  updateCustomerStatus: (id: string, clientStatus: string) =>

    adminFetch(`/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ clientStatus }) }),



  updateZardas: (id: string, delta: number) =>

    adminFetch(`/customers/${id}/zardas`, { method: 'PATCH', body: JSON.stringify({ delta }) }),



  getAnalytics: () => adminFetch<Analytics>('/analytics'),



  getReviews: (filter?: 'all' | 'pending' | 'approved' | 'good' | 'bad' | 'featured') =>
    adminFetch<AdminReview[]>(`/reviews${filter && filter !== 'all' ? `?filter=${filter}` : ''}`),

  approveReview: (id: string, approved: boolean) =>
    adminFetch(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ approved }) }),

  updateReview: (id: string, patch: { approved?: boolean; adminResponse?: string; featured?: boolean }) =>
    adminFetch(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),



  getProducts: () => adminFetch<Record<string, unknown>[]>('/products'),



  saveProduct: (data: Record<string, unknown>, id?: string) =>

    id

      ? adminFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })

      : adminFetch('/products', { method: 'POST', body: JSON.stringify(data) }),



  deleteProduct: (id: string) => adminFetch(`/products/${id}`, { method: 'DELETE' }),



  getRewards: () => adminFetch<Record<string, unknown>[]>('/rewards'),

  getRewardStats: () =>
    adminFetch<{
      totalRewards: number;
      activeRewards: number;
      totalZardasInCirculation: number;
      avgZardasPerClient: number;
      cheapestReward: number;
    }>('/rewards/stats'),



  saveReward: (data: Record<string, unknown>, id?: string) =>

    id

      ? adminFetch(`/rewards/${id}`, { method: 'PUT', body: JSON.stringify(data) })

      : adminFetch('/rewards', { method: 'POST', body: JSON.stringify(data) }),

  deleteReward: (id: string) => adminFetch<{ ok: true; id: string }>(`/rewards/${id}`, { method: 'DELETE' }),



  getSettings: () => adminFetch<Settings>('/settings'),



  updateSettings: (data: Partial<Settings>) =>

    adminFetch<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),



  toggleOrders: () => adminFetch<{ ordersOpen: boolean; businessStatus: BusinessStatus }>('/settings/toggle-orders', { method: 'POST' }),



  setBusinessStatus: (status: BusinessStatus) =>

    adminFetch<{ businessStatus: BusinessStatus; ordersOpen: boolean }>('/settings/business-status', { method: 'POST', body: JSON.stringify({ status }) }),



  setPrepTime: (prepTimeMinutes: number) =>

    adminFetch<{ prepTimeMinutes: number }>('/settings/prep-time', { method: 'POST', body: JSON.stringify({ prepTimeMinutes }) }),



  togglePromo: () => adminFetch<{ promo: Settings['promo'] }>('/settings/toggle-promo', { method: 'POST' }),



  getSystemHealth: () => adminFetch<SystemHealth>('/system/health'),



  getSystemLogs: (limit = 30) => adminFetch<SystemLogEntry[]>(`/system/logs?limit=${limit}`),



  runJobs: () => adminFetch<{ results: string[] }>('/system/run-jobs', { method: 'POST' }),



  getMessages: () => adminFetch<{ id: string; text: string; type: string; active: boolean }[]>('/messages'),



  createMessage: (data: { text: string; type: string; active: boolean }) =>

    adminFetch('/messages', { method: 'POST', body: JSON.stringify(data) }),



  updateMessage: (id: string, data: Record<string, unknown>) =>

    adminFetch(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),



  deleteMessage: (id: string) => adminFetch(`/messages/${id}`, { method: 'DELETE' }),

};



export function useAdminPoll<T>(fetcher: () => Promise<T>, intervalMs = 5000) {

  const [data, setData] = useState<T | undefined>(undefined);

  const [loading, setLoading] = useState(true);



  const refresh = useCallback(async () => {

    try {

      const result = await fetcher();

      setData(result);

    } finally {

      setLoading(false);

    }

  }, [fetcher]);



  useEffect(() => {

    refresh();

    const id = setInterval(refresh, intervalMs);

    return () => clearInterval(id);

  }, [refresh, intervalMs]);



  return { data, loading, refresh };

}



export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {

  open: '🟢 Abierto',

  closed: '🔴 Cerrado',

  saturated: '🟠 Saturado',

};


