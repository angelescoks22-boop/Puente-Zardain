export type BusinessStatus = 'open' | 'closed' | 'saturated';

export interface ISettings {
  id: string;
  minOrderAmount: number;
  deliveryArea: string;
  ordersOpen: boolean;
  businessStatus: BusinessStatus;
  prepTimeMinutes: number;
  schedule: {
    openTime: string;
    closeTime: string;
    autoSchedule: boolean;
  };
  autoRules: {
    saturatedOrderThreshold: number;
    prepTimeBoostWhenSaturated: number;
    autoSaturateEnabled: boolean;
  };
  promo?: {
    active: boolean;
    zardasMultiplier: number;
    label: string;
    autoManaged?: boolean;
  };
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
  menuVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
