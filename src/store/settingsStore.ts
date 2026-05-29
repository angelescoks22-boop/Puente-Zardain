import { create } from 'zustand';
import { getPublicSettings, getQueueEstimate } from '../api/products';
import { ensureAppSocket, onSettingsUpdate } from '../api/chatSocket';

export type BusinessStatus = 'open' | 'closed' | 'saturated';

export type BusinessSettings = {
  ordersOpen: boolean;
  businessStatus: BusinessStatus;
  minOrderAmount: number;
  deliveryArea: string;
  prepTimeMinutes: number;
  activeOrders: number;
  isOpen: boolean;
  isSaturated: boolean;
  lastUpdated: string;
};

type SettingsState = BusinessSettings & {
  loading: boolean;
  refresh: () => Promise<void>;
  startSync: () => () => void;
};

const DEFAULT: BusinessSettings = {
  ordersOpen: true,
  businessStatus: 'open',
  minOrderAmount: 15,
  deliveryArea: 'Arroyomolinos',
  prepTimeMinutes: 15,
  activeOrders: 0,
  isOpen: true,
  isSaturated: false,
  lastUpdated: new Date().toISOString(),
};

function applySettingsPayload(
  set: (partial: Partial<SettingsState>) => void,
  settings: Partial<PublicSettingsLike>,
  queue?: { prepTimeMinutes?: number; activeOrders?: number } | null,
) {
  const businessStatus = (settings.businessStatus ?? DEFAULT.businessStatus) as BusinessStatus;
  const ordersOpen = settings.ordersOpen ?? DEFAULT.ordersOpen;
  set({
    ordersOpen,
    businessStatus,
    minOrderAmount: settings.minOrderAmount ?? DEFAULT.minOrderAmount,
    deliveryArea: settings.deliveryArea ?? DEFAULT.deliveryArea,
    prepTimeMinutes: queue?.prepTimeMinutes ?? settings.prepTimeMinutes ?? DEFAULT.prepTimeMinutes,
    activeOrders: queue?.activeOrders ?? DEFAULT.activeOrders,
    isOpen: settings.isOpen ?? (ordersOpen && businessStatus !== 'closed'),
    isSaturated: settings.isSaturated ?? businessStatus === 'saturated',
    lastUpdated: new Date().toISOString(),
    loading: false,
  });
}

type PublicSettingsLike = {
  ordersOpen?: boolean;
  businessStatus?: BusinessStatus;
  minOrderAmount?: number;
  deliveryArea?: string;
  prepTimeMinutes?: number;
  isOpen?: boolean;
  isSaturated?: boolean;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT,
  loading: true,

  refresh: async () => {
    try {
      const [settings, queue] = await Promise.all([
        getPublicSettings(),
        getQueueEstimate().catch(() => null),
      ]);
      applySettingsPayload(set, settings, queue);
    } catch {
      set({ loading: false });
    }
  },

  startSync: () => {
    ensureAppSocket();
    void get().refresh();

    const interval = setInterval(() => {
      void get().refresh();
    }, 30_000);

    const stopSocket = onSettingsUpdate((payload) => {
      applySettingsPayload(set, payload as PublicSettingsLike);
      void get().refresh();
    });

    return () => {
      clearInterval(interval);
      stopSocket();
    };
  },
}));

export function isStoreOpen(settings: Pick<BusinessSettings, 'ordersOpen' | 'businessStatus' | 'isOpen'>) {
  if (settings.isOpen !== undefined) return settings.isOpen;
  return settings.ordersOpen && settings.businessStatus !== 'closed';
}

export function isStoreSaturated(settings: Pick<BusinessSettings, 'businessStatus' | 'isSaturated'>) {
  if (settings.isSaturated !== undefined) return settings.isSaturated;
  return settings.businessStatus === 'saturated';
}
