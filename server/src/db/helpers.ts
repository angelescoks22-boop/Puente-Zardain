import type { IUser, IUserAddress } from '../models/User.js';
import type { IOrder, IOrderItem } from '../models/Order.js';
import type { IProduct, IIngredient } from '../models/Product.js';
import type { ISettings } from '../models/Settings.js';
import type { IReview } from '../models/Review.js';
import type { IPendingOtp } from '../models/PendingOtp.js';
import type { IOrderFeedback } from '../models/OrderFeedback.js';
import type { IReward } from '../models/Reward.js';
import type { IBusinessMessage } from '../models/BusinessMessage.js';
import type { IConversation } from '../models/Conversation.js';
import type { IMessage } from '../models/Message.js';
import type { IOrderStatusLog } from '../models/OrderStatusLog.js';
import type { IDailyReport } from '../models/DailyReport.js';
import type { ISystemLog } from '../models/SystemLog.js';

export function num(value: unknown): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

export function toDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  return value instanceof Date ? value : new Date(String(value));
}

function mapAddresses(raw: unknown): IUserAddress[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => {
    const addr = a as Record<string, unknown>;
    return {
      id: String(addr.id ?? addr._id ?? crypto.randomUUID()),
      fullAddress: String(addr.fullAddress ?? ''),
      city: String(addr.city ?? ''),
      lat: num(addr.lat),
      lng: num(addr.lng),
      placeId: addr.placeId ? String(addr.placeId) : undefined,
      label: addr.label ? String(addr.label) : undefined,
      portal: addr.portal ? String(addr.portal) : undefined,
      floor: addr.floor ? String(addr.floor) : undefined,
      door: addr.door ? String(addr.door) : undefined,
      details: addr.details ? String(addr.details) : undefined,
      isDefault: Boolean(addr.isDefault),
    };
  });
}

export function serializeAddresses(addresses: IUserAddress[]): IUserAddress[] {
  return addresses.map((a) => ({
    ...a,
    id: a.id ?? crypto.randomUUID(),
  }));
}

export function mapUserRow(row: Record<string, unknown>): IUser {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    password: String(row.password),
    role: row.role as IUser['role'],
    address: row.address ? String(row.address) : undefined,
    addresses: mapAddresses(row.addresses),
    zardas: num(row.zardas),
    level: row.level as IUser['level'],
    levelProgress: num(row.level_progress),
    orderCount: num(row.order_count),
    streak: num(row.streak),
    lastOrderDate: toDate(row.last_order_date),
    isBlocked: Boolean(row.is_blocked),
    noShowCount: num(row.no_show_count),
    phoneVerified: Boolean(row.phone_verified),
    clientStatus: row.client_status as IUser['clientStatus'],
    favoriteProductId: row.favorite_product_id ? String(row.favorite_product_id) : undefined,
    profileAvatar: row.profile_avatar ? String(row.profile_avatar) : undefined,
    profileColor: row.profile_color ? String(row.profile_color) : undefined,
    profileTagline: row.profile_tagline ? String(row.profile_tagline) : undefined,
    profileFrame: row.profile_frame ? String(row.profile_frame) : undefined,
    birthday: toDate(row.birthday),
    birthdayRewardClaimedYear: row.birthday_reward_claimed_year != null
      ? num(row.birthday_reward_claimed_year)
      : undefined,
    birthdayFreeProductPending: Boolean(row.birthday_free_product_pending),
    createdAt: toDate(row.created_at)!,
    updatedAt: toDate(row.updated_at),
  };
}

export function mapOrderRow(row: Record<string, unknown>): IOrder {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    clientName: String(row.client_name),
    clientPhone: String(row.client_phone),
    items: (row.items as IOrderItem[]) ?? [],
    total: num(row.total),
    type: row.type as IOrder['type'],
    paymentMethod: row.payment_method as IOrder['paymentMethod'],
    cashPaidAmount: row.cash_paid_amount != null ? num(row.cash_paid_amount) : undefined,
    cashChange: row.cash_change != null ? num(row.cash_change) : undefined,
    address: row.address ? String(row.address) : undefined,
    deliveryAddress: row.delivery_address as IOrder['deliveryAddress'],
    deliveryLat: row.delivery_lat != null ? num(row.delivery_lat) : undefined,
    deliveryLng: row.delivery_lng != null ? num(row.delivery_lng) : undefined,
    status: row.status as IOrder['status'],
    queuePosition: num(row.queue_position),
    estimatedTimeMinutes: row.estimated_time_minutes != null ? num(row.estimated_time_minutes) : undefined,
    completedAt: toDate(row.completed_at),
    pickedUp: Boolean(row.picked_up),
    internalNotes: row.internal_notes ? String(row.internal_notes) : undefined,
    cancelReason: row.cancel_reason ? String(row.cancel_reason) : undefined,
    ticketSnapshot: row.ticket_snapshot as Record<string, unknown> | undefined,
    ticketGeneratedAt: toDate(row.ticket_generated_at),
    createdAt: toDate(row.created_at)!,
    updatedAt: toDate(row.updated_at),
  };
}

export function mapProductRow(row: Record<string, unknown>): IProduct {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    price: num(row.price),
    category: row.category as IProduct['category'],
    image: String(row.image ?? '🍔'),
    ingredients: (row.ingredients as IIngredient[]) ?? [],
    popular: Boolean(row.popular),
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

export function mapSettingsRow(row: Record<string, unknown>): ISettings {
  return {
    id: String(row.id),
    minOrderAmount: num(row.min_order_amount),
    deliveryArea: String(row.delivery_area),
    ordersOpen: Boolean(row.orders_open),
    businessStatus: row.business_status as ISettings['businessStatus'],
    prepTimeMinutes: num(row.prep_time_minutes),
    schedule: (row.schedule as ISettings['schedule']) ?? {
      openTime: '12:00',
      closeTime: '23:30',
      autoSchedule: false,
    },
    autoRules: (row.auto_rules as ISettings['autoRules']) ?? {
      saturatedOrderThreshold: 8,
      prepTimeBoostWhenSaturated: 5,
      autoSaturateEnabled: true,
    },
    promo: row.promo as ISettings['promo'],
    automation: (row.automation as ISettings['automation']) ?? {
      enabled: true,
      autoPromoEnabled: true,
      slowDayRatio: 0.6,
      busyDayRatio: 1.3,
      autoBonusZardas: false,
      autoBonusAmount: 10,
      chatAutoEnabled: true,
      chatAutoReplyEnabled: true,
      dailyReportEnabled: true,
      cleanupChatDays: 30,
      cleanupLogDays: 60,
    },
    menuVersion: row.menu_version ? String(row.menu_version) : undefined,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

export function mapReviewRow(row: Record<string, unknown>): IReview {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    productId: row.product_id ? String(row.product_id) : undefined,
    rating: num(row.rating),
    comment: String(row.comment),
    approved: Boolean(row.approved),
    verified: row.verified !== false,
    adminResponse: row.admin_response ? String(row.admin_response) : undefined,
    featured: Boolean(row.featured),
    createdAt: toDate(row.created_at)!,
  };
}

export function mapPendingOtpRow(row: Record<string, unknown>): IPendingOtp {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    phone: row.phone ? String(row.phone) : undefined,
    name: row.name ? String(row.name) : undefined,
    passwordHash: row.password_hash ? String(row.password_hash) : undefined,
    otp: String(row.otp ?? ''),
    attempts: num(row.attempts),
    expiresAt: toDate(row.expires_at)!,
    pendingAddress: row.pending_address as IPendingOtp['pendingAddress'],
  };
}

export function mapOrderFeedbackRow(row: Record<string, unknown>): IOrderFeedback {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    userId: String(row.user_id),
    rating: row.rating as IOrderFeedback['rating'],
    comment: row.comment ? String(row.comment) : undefined,
    createdAt: toDate(row.created_at)!,
  };
}

export function mapRewardRow(row: Record<string, unknown>): IReward {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    zardasCost: num(row.zardas_cost),
    icon: String(row.icon ?? '🎁'),
    active: Boolean(row.active),
    createdAt: toDate(row.created_at),
  };
}

export function mapBusinessMessageRow(row: Record<string, unknown>): IBusinessMessage {
  return {
    id: String(row.id),
    text: String(row.text),
    type: row.type as IBusinessMessage['type'],
    active: Boolean(row.active),
    createdAt: toDate(row.created_at),
  };
}

export function mapConversationRow(row: Record<string, unknown>): IConversation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    orderId: row.order_id ? String(row.order_id) : undefined,
    status: row.status as IConversation['status'],
    lastMessage: row.last_message ? String(row.last_message) : undefined,
    lastMessageAt: toDate(row.last_message_at),
    unreadByAdmin: num(row.unread_by_admin),
    unreadByUser: num(row.unread_by_user),
    createdAt: toDate(row.created_at)!,
    updatedAt: toDate(row.updated_at),
  };
}

export function mapMessageRow(row: Record<string, unknown>): IMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    sender: row.sender as IMessage['sender'],
    message: String(row.message),
    read: Boolean(row.read),
    isAutomated: Boolean(row.is_automated),
    createdAt: toDate(row.created_at)!,
  };
}

export function mapOrderStatusLogRow(row: Record<string, unknown>): IOrderStatusLog {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    fromStatus: String(row.from_status),
    toStatus: String(row.to_status),
    changedById: row.changed_by_id ? String(row.changed_by_id) : undefined,
    changedByName: String(row.changed_by_name),
    changedByRole: row.changed_by_role as IOrderStatusLog['changedByRole'],
    reason: row.reason ? String(row.reason) : undefined,
    createdAt: toDate(row.created_at)!,
  };
}

export function mapDailyReportRow(row: Record<string, unknown>): IDailyReport {
  const data = (row.data as Record<string, unknown>) ?? {};
  return {
    id: String(row.id),
    date: String(row.date).slice(0, 10),
    totalOrders: num(data.totalOrders),
    totalRevenue: num(data.totalRevenue),
    topProduct: String(data.topProduct ?? 'N/A'),
    peakHour: String(data.peakHour ?? 'N/A'),
    newClients: num(data.newClients),
    recurringClients: num(data.recurringClients),
    avgTicket: num(data.avgTicket),
    cancelledOrders: num(data.cancelledOrders),
    summary: String(row.summary ?? ''),
    createdAt: toDate(row.created_at)!,
  };
}

export function mapSystemLogRow(row: Record<string, unknown>): ISystemLog {
  return {
    id: String(row.id),
    level: row.level as ISystemLog['level'],
    message: String(row.message),
    meta: row.meta as Record<string, unknown> | undefined,
    createdAt: toDate(row.created_at)!,
  };
}

export function dailyReportToData(report: Omit<IDailyReport, 'id' | 'createdAt' | 'summary'> & { summary?: string }) {
  return {
    totalOrders: report.totalOrders,
    totalRevenue: report.totalRevenue,
    topProduct: report.topProduct,
    peakHour: report.peakHour,
    newClients: report.newClients,
    recurringClients: report.recurringClients,
    avgTicket: report.avgTicket,
    cancelledOrders: report.cancelledOrders,
  };
}
