import { query } from '../config/db.js';
import type { IOrderStatusLog } from '../models/OrderStatusLog.js';
import { mapOrderStatusLogRow } from './helpers.js';

export async function findByOrderId(orderId: string): Promise<IOrderStatusLog[]> {
  const { rows } = await query(
    'SELECT * FROM order_status_logs WHERE order_id = $1 ORDER BY created_at ASC',
    [orderId],
  );
  return rows.map(mapOrderStatusLogRow);
}

export async function logOrderStatusChange(params: {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  changedByName: string;
  changedByRole?: 'admin' | 'system';
  changedById?: string;
  reason?: string;
}): Promise<IOrderStatusLog> {
  const { rows } = await query(
    `INSERT INTO order_status_logs (
      order_id, from_status, to_status, changed_by_id, changed_by_name, changed_by_role, reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      params.orderId,
      params.fromStatus,
      params.toStatus,
      params.changedById ?? null,
      params.changedByName,
      params.changedByRole ?? 'admin',
      params.reason ?? null,
    ],
  );
  return mapOrderStatusLogRow(rows[0]);
}
