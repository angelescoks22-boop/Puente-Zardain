import { query } from '../config/db.js';
import type { IOrderFeedback, FeedbackRating } from '../models/OrderFeedback.js';
import { mapOrderFeedbackRow } from './helpers.js';
import { addParam } from './sqlParams.js';

export async function findByUserId(userId: string): Promise<IOrderFeedback[]> {
  const { rows } = await query('SELECT * FROM order_feedbacks WHERE user_id = $1', [userId]);
  return rows.map(mapOrderFeedbackRow);
}

export async function findOne(filter: { orderId?: string; userId?: string }): Promise<IOrderFeedback | null> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.orderId) {
    conditions.push(`order_id = $${addParam(params, filter.orderId)}`);
  }
  if (filter.userId) {
    conditions.push(`user_id = $${addParam(params, filter.userId)}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM order_feedbacks ${where} LIMIT 1`, params);
  return rows[0] ? mapOrderFeedbackRow(rows[0]) : null;
}

export async function create(data: {
  orderId: string;
  userId: string;
  rating: FeedbackRating;
  comment?: string;
}): Promise<IOrderFeedback> {
  const { rows } = await query(
    `INSERT INTO order_feedbacks (order_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.orderId, data.userId, data.rating, data.comment ?? null],
  );
  return mapOrderFeedbackRow(rows[0]);
}

export async function exists(filter: { orderId: string }): Promise<boolean> {
  const { rows } = await query('SELECT 1 FROM order_feedbacks WHERE order_id = $1 LIMIT 1', [filter.orderId]);
  return rows.length > 0;
}
