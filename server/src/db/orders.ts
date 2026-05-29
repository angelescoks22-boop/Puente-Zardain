import { query } from '../config/db.js';
import type { IOrder, IOrderItem, OrderStatus } from '../models/Order.js';
import { mapOrderRow } from './helpers.js';
import { addParam } from './sqlParams.js';

export type OrderFilter = {
  userId?: string;
  id?: string;
  status?: OrderStatus | { nin?: OrderStatus[]; in?: OrderStatus[]; ne?: OrderStatus };
  type?: 'delivery';
  createdAtGte?: Date;
  createdAtLt?: Date;
  createdAtBefore?: Date;
  completedAtGte?: Date;
  deliveryLatExists?: boolean;
};

function buildOrderWhere(filter: OrderFilter, params: unknown[]): string {
  const conditions: string[] = [];

  if (filter.userId) {
    conditions.push(`user_id = $${addParam(params, filter.userId)}`);
  }
  if (filter.id) {
    conditions.push(`id = $${addParam(params, filter.id)}`);
  }
  if (typeof filter.status === 'string') {
    conditions.push(`status = $${addParam(params, filter.status)}`);
  } else if (filter.status) {
    if (filter.status.nin?.length) {
      conditions.push(`status != ALL($${addParam(params, filter.status.nin)}::text[])`);
    }
    if (filter.status.in?.length) {
      conditions.push(`status = ANY($${addParam(params, filter.status.in)}::text[])`);
    }
    if (filter.status.ne) {
      conditions.push(`status != $${addParam(params, filter.status.ne)}`);
    }
  }
  if (filter.type === 'delivery') {
    conditions.push(`type = 'delivery'`);
  }
  if (filter.createdAtGte) {
    conditions.push(`created_at >= $${addParam(params, filter.createdAtGte)}`);
  }
  if (filter.createdAtLt) {
    conditions.push(`created_at < $${addParam(params, filter.createdAtLt)}`);
  }
  if (filter.createdAtBefore) {
    conditions.push(`created_at < $${addParam(params, filter.createdAtBefore)}`);
  }
  if (filter.completedAtGte) {
    conditions.push(`completed_at >= $${addParam(params, filter.completedAtGte)}`);
  }
  if (filter.deliveryLatExists) {
    conditions.push('delivery_lat IS NOT NULL AND delivery_lng IS NOT NULL');
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

export type CreateOrderInput = {
  userId: string;
  clientName: string;
  clientPhone: string;
  items: IOrderItem[];
  total: number;
  type: IOrder['type'];
  paymentMethod: IOrder['paymentMethod'];
  cashPaidAmount?: number;
  cashChange?: number;
  address?: string;
  deliveryAddress?: IOrder['deliveryAddress'];
  deliveryLat?: number;
  deliveryLng?: number;
  status: OrderStatus;
  queuePosition: number;
  estimatedTimeMinutes?: number;
};

export async function findById(id: string): Promise<IOrder | null> {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id]);
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

export async function findOne(filter: OrderFilter): Promise<IOrder | null> {
  const params: unknown[] = [];
  const where = buildOrderWhere(filter, params);
  const { rows } = await query(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT 1`, params);
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

export async function find(
  filter: OrderFilter = {},
  sort: 'createdAtDesc' | 'createdAtAsc' = 'createdAtDesc',
): Promise<IOrder[]> {
  const params: unknown[] = [];
  const where = buildOrderWhere(filter, params);
  const order = sort === 'createdAtAsc' ? 'created_at ASC' : 'created_at DESC';
  const { rows } = await query(`SELECT * FROM orders ${where} ORDER BY ${order}`, params);
  return rows.map(mapOrderRow);
}

export async function create(data: CreateOrderInput): Promise<IOrder> {
  const { rows } = await query(
    `INSERT INTO orders (
      user_id, client_name, client_phone, items, total, type, payment_method,
      cash_paid_amount, cash_change, address, delivery_address, delivery_lat, delivery_lng,
      status, queue_position, estimated_time_minutes
    ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      data.userId,
      data.clientName,
      data.clientPhone,
      JSON.stringify(data.items),
      data.total,
      data.type,
      data.paymentMethod,
      data.cashPaidAmount ?? null,
      data.cashChange ?? null,
      data.address ?? null,
      data.deliveryAddress ? JSON.stringify(data.deliveryAddress) : null,
      data.deliveryLat ?? null,
      data.deliveryLng ?? null,
      data.status,
      data.queuePosition,
      data.estimatedTimeMinutes ?? null,
    ],
  );
  return mapOrderRow(rows[0]);
}

export async function save(order: IOrder): Promise<IOrder> {
  const { rows } = await query(
    `UPDATE orders SET
      client_name = $2, client_phone = $3, items = $4::jsonb, total = $5, type = $6,
      payment_method = $7, cash_paid_amount = $8, cash_change = $9, address = $10,
      delivery_address = $11::jsonb, delivery_lat = $12, delivery_lng = $13, status = $14,
      queue_position = $15, estimated_time_minutes = $16, completed_at = $17,
      picked_up = $18, internal_notes = $19, cancel_reason = $20,
      ticket_snapshot = $21::jsonb, ticket_generated_at = $22, updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [
      order.id,
      order.clientName,
      order.clientPhone,
      JSON.stringify(order.items),
      order.total,
      order.type,
      order.paymentMethod,
      order.cashPaidAmount ?? null,
      order.cashChange ?? null,
      order.address ?? null,
      order.deliveryAddress ? JSON.stringify(order.deliveryAddress) : null,
      order.deliveryLat ?? null,
      order.deliveryLng ?? null,
      order.status,
      order.queuePosition,
      order.estimatedTimeMinutes ?? null,
      order.completedAt ?? null,
      order.pickedUp,
      order.internalNotes ?? '',
      order.cancelReason ?? null,
      order.ticketSnapshot ? JSON.stringify(order.ticketSnapshot) : null,
      order.ticketGeneratedAt ?? null,
    ],
  );
  return mapOrderRow(rows[0]);
}

export async function updateById(
  id: string,
  patch: Partial<Pick<IOrder, 'internalNotes' | 'status' | 'cancelReason'>>,
): Promise<IOrder | null> {
  const sets: string[] = [];
  const params: unknown[] = [id];

  if (patch.internalNotes !== undefined) {
    sets.push(`internal_notes = $${addParam(params, patch.internalNotes)}`);
  }
  if (patch.status !== undefined) {
    sets.push(`status = $${addParam(params, patch.status)}`);
  }
  if (patch.cancelReason !== undefined) {
    sets.push(`cancel_reason = $${addParam(params, patch.cancelReason)}`);
  }

  if (sets.length === 0) return findById(id);

  sets.push('updated_at = now()');
  const { rows } = await query(
    `UPDATE orders SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

export async function countDocuments(filter: OrderFilter = {}): Promise<number> {
  const params: unknown[] = [];
  const where = buildOrderWhere(filter, params);
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM orders ${where}`, params);
  return Number(rows[0]?.count ?? 0);
}

export async function exists(filter: OrderFilter): Promise<boolean> {
  const params: unknown[] = [];
  const where = buildOrderWhere(filter, params);
  const { rows } = await query(`SELECT 1 FROM orders ${where} LIMIT 1`, params);
  return rows.length > 0;
}

export async function countAheadInQueue(createdAt: Date): Promise<number> {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM orders
     WHERE status IN ('pending', 'accepted', 'preparing')
       AND created_at < $1`,
    [createdAt],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function distinctUserIds(filter: OrderFilter): Promise<string[]> {
  const params: unknown[] = [];
  const where = buildOrderWhere(filter, params);
  const { rows } = await query(`SELECT DISTINCT user_id FROM orders ${where}`, params);
  return rows.map((r) => String(r.user_id));
}

export async function aggregateProductStats(): Promise<
  Array<{ productName: string; total: number; revenue: number }>
> {
  const { rows } = await query(
    `SELECT
       item->>'productName' AS product_name,
       SUM((item->>'quantity')::int) AS total,
       SUM((item->>'quantity')::int * (item->>'unitPrice')::numeric) AS revenue
     FROM orders o, jsonb_array_elements(o.items) AS item
     WHERE o.status != 'cancelled'
     GROUP BY item->>'productName'
     ORDER BY total DESC`,
  );
  return rows.map((r) => ({
    productName: String(r.product_name),
    total: Number(r.total),
    revenue: Number(r.revenue),
  }));
}

export async function aggregateCancelledByUser(minCount: number): Promise<Array<{ userId: string; count: number }>> {
  const { rows } = await query(
    `SELECT user_id, COUNT(*)::int AS count
     FROM orders
     WHERE status = 'cancelled'
     GROUP BY user_id
     HAVING COUNT(*) >= $1
     ORDER BY count DESC`,
    [minCount],
  );
  return rows.map((r) => ({ userId: String(r.user_id), count: Number(r.count) }));
}

export async function aggregateDailySales(since: Date): Promise<
  Array<{ date: string; orders: number; revenue: number }>
> {
  const { rows } = await query(
    `SELECT
       DATE(created_at)::text AS date,
       COUNT(*)::int AS orders,
       COALESCE(SUM(total), 0)::numeric AS revenue
     FROM orders
     WHERE created_at >= $1 AND status != 'cancelled'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [since],
  );
  return rows.map((r) => ({
    date: String(r.date),
    orders: Number(r.orders),
    revenue: Number(r.revenue),
  }));
}
