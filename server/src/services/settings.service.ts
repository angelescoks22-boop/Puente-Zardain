import type { ISettings, BusinessStatus } from '../models/Settings.js';
import * as settingsRepo from '../db/settings.js';
import { getActiveOrderCount } from './queue.service.js';
import { notifySettingsUpdate } from './adminNotify.js';
import { AppError } from '../utils/logger.js';

export type PublicBusinessSettings = {
  ordersOpen: boolean;
  businessStatus: BusinessStatus;
  prepTimeMinutes: number;
  isOpen: boolean;
  isSaturated: boolean;
  minOrderAmount: number;
  deliveryArea: string;
};

export async function getOrCreateSettings(): Promise<ISettings> {
  return settingsRepo.getOrCreate();
}

export function isStoreOpen(settings: Pick<ISettings, 'ordersOpen' | 'businessStatus'>): boolean {
  return settings.ordersOpen && settings.businessStatus !== 'closed';
}

export function isStoreSaturated(settings: Pick<ISettings, 'businessStatus'>): boolean {
  return settings.businessStatus === 'saturated';
}

/** Tiempo estimado al crear pedido — lógica simple */
export function calculateOrderEstimatedMinutes(settings: ISettings): number {
  let time = settings.prepTimeMinutes ?? 15;
  if (isStoreSaturated(settings)) time += 10;
  return time;
}

/** Tiempo efectivo para cola (base + pedidos activos) */
export async function calculateQueuePrepMinutes(settings: ISettings): Promise<number> {
  const activeCount = await getActiveOrderCount();
  return calculateOrderEstimatedMinutes(settings) + Math.min(activeCount * 2, 20);
}

export function toPublicSettings(
  settings: ISettings,
  prepTimeMinutes?: number,
): PublicBusinessSettings {
  const prep = prepTimeMinutes ?? calculateOrderEstimatedMinutes(settings);
  return {
    ordersOpen: settings.ordersOpen,
    businessStatus: settings.businessStatus ?? 'open',
    prepTimeMinutes: prep,
    isOpen: isStoreOpen(settings),
    isSaturated: isStoreSaturated(settings),
    minOrderAmount: settings.minOrderAmount ?? 15,
    deliveryArea: settings.deliveryArea ?? 'Arroyomolinos',
  };
}

export async function getPublicSettingsPayload(): Promise<PublicBusinessSettings> {
  const settings = await getOrCreateSettings();
  const prepTimeMinutes = await calculateQueuePrepMinutes(settings);
  return toPublicSettings(settings, prepTimeMinutes);
}

export async function getQueueEstimatePayload() {
  const settings = await getOrCreateSettings();
  const activeCount = await getActiveOrderCount();
  const prepTime = await calculateQueuePrepMinutes(settings);
  const baseMin = prepTime + activeCount * 3;
  const baseMax = baseMin + Math.ceil(prepTime * 0.4);
  const deliveryExtra = 8;
  const publicSettings = toPublicSettings(settings, prepTime);

  return {
    ...publicSettings,
    activeOrders: activeCount,
    pickup: { min: baseMin, max: baseMax },
    delivery: { min: baseMin + deliveryExtra, max: baseMax + deliveryExtra },
  };
}

export async function assertOrdersAccepted(): Promise<ISettings> {
  const settings = await getOrCreateSettings();
  if (!isStoreOpen(settings)) {
    throw new AppError('Negocio cerrado', 403);
  }
  if (isStoreSaturated(settings)) {
    throw new AppError('Negocio saturado. Inténtalo en unos minutos.', 403, 'STORE_SATURATED');
  }
  return settings;
}

export async function setBusinessStatus(status: BusinessStatus) {
  const settings = await getOrCreateSettings();
  settings.businessStatus = status;
  if (status === 'closed') settings.ordersOpen = false;
  if (status === 'open') settings.ordersOpen = true;
  await settingsRepo.save(settings);
  await broadcastSettingsUpdate();
  return settings;
}

export async function toggleOrdersOpen() {
  const settings = await getOrCreateSettings();
  settings.ordersOpen = !settings.ordersOpen;
  if (!settings.ordersOpen) settings.businessStatus = 'closed';
  else if (settings.businessStatus === 'closed') settings.businessStatus = 'open';
  await settingsRepo.save(settings);
  await broadcastSettingsUpdate();
  return settings;
}

/** Emite settings_update a todos los clientes — fuente única */
export async function broadcastSettingsUpdate() {
  const payload = await getPublicSettingsPayload();
  notifySettingsUpdate({
    ...payload,
    at: new Date().toISOString(),
  });
}
