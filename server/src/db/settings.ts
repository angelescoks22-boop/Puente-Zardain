import { query } from '../config/db.js';
import type { ISettings } from '../models/Settings.js';
import { mapSettingsRow } from './helpers.js';

const DEFAULT_SETTINGS = {
  minOrderAmount: 15,
  deliveryArea: 'Arroyomolinos',
  ordersOpen: true,
  businessStatus: 'open',
  prepTimeMinutes: 15,
  schedule: { openTime: '12:00', closeTime: '23:30', autoSchedule: false },
  autoRules: { saturatedOrderThreshold: 8, prepTimeBoostWhenSaturated: 5, autoSaturateEnabled: true },
  automation: {
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
};

export async function getSingleton(): Promise<ISettings | null> {
  const { rows } = await query('SELECT * FROM settings ORDER BY created_at ASC LIMIT 1');
  return rows[0] ? mapSettingsRow(rows[0]) : null;
}

export async function getOrCreate(): Promise<ISettings> {
  const existing = await getSingleton();
  if (existing) return existing;
  return create({});
}

export async function create(data: Partial<ISettings> = {}): Promise<ISettings> {
  const merged = { ...DEFAULT_SETTINGS, ...data };
  const { rows } = await query(
    `INSERT INTO settings (
      min_order_amount, delivery_area, orders_open, business_status, prep_time_minutes,
      schedule, auto_rules, promo, automation, menu_version
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10)
    RETURNING *`,
    [
      merged.minOrderAmount,
      merged.deliveryArea,
      merged.ordersOpen,
      merged.businessStatus,
      merged.prepTimeMinutes,
      JSON.stringify(merged.schedule),
      JSON.stringify(merged.autoRules),
      merged.promo ? JSON.stringify(merged.promo) : null,
      JSON.stringify(merged.automation),
      merged.menuVersion ?? null,
    ],
  );
  return mapSettingsRow(rows[0]);
}

export async function save(settings: ISettings): Promise<ISettings> {
  const { rows } = await query(
    `UPDATE settings SET
      min_order_amount = $2, delivery_area = $3, orders_open = $4, business_status = $5,
      prep_time_minutes = $6, schedule = $7::jsonb, auto_rules = $8::jsonb, promo = $9::jsonb,
      automation = $10::jsonb, menu_version = $11, updated_at = now()
    WHERE id = $1 RETURNING *`,
    [
      settings.id,
      settings.minOrderAmount,
      settings.deliveryArea,
      settings.ordersOpen,
      settings.businessStatus,
      settings.prepTimeMinutes,
      JSON.stringify(settings.schedule),
      JSON.stringify(settings.autoRules),
      settings.promo ? JSON.stringify(settings.promo) : null,
      JSON.stringify(settings.automation),
      settings.menuVersion ?? null,
    ],
  );
  return mapSettingsRow(rows[0]);
}

export async function upsertMenuVersion(menuVersion: string): Promise<ISettings> {
  const existing = await getSingleton();
  if (existing) {
    existing.menuVersion = menuVersion;
    return save(existing);
  }
  return create({ menuVersion });
}

export async function mergeUpdate(data: Partial<ISettings>): Promise<ISettings> {
  const existing = await getOrCreate();
  const merged = { ...existing, ...data };
  return save(merged);
}
