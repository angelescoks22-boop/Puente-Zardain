import { query } from '../config/db.js';
import type { IConversation, ConversationStatus } from '../models/Conversation.js';
import { mapConversationRow } from './helpers.js';
import { addParam } from './sqlParams.js';

export async function findById(id: string): Promise<IConversation | null> {
  const { rows } = await query('SELECT * FROM conversations WHERE id = $1', [id]);
  return rows[0] ? mapConversationRow(rows[0]) : null;
}

export async function findByOrderId(orderId: string): Promise<IConversation | null> {
  const { rows } = await query('SELECT * FROM conversations WHERE order_id = $1 LIMIT 1', [orderId]);
  return rows[0] ? mapConversationRow(rows[0]) : null;
}

export async function findGeneralForUser(userId: string): Promise<IConversation | null> {
  const { rows } = await query(
    `SELECT * FROM conversations
     WHERE user_id = $1 AND order_id IS NULL AND status IN ('active', 'open')
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapConversationRow(rows[0]) : null;
}

export async function find(filter: {
  userId?: string;
  unreadByAdminGt?: number;
} = {}, sort: 'lastMessageDesc' | 'createdDesc' = 'lastMessageDesc'): Promise<IConversation[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.userId) {
    conditions.push(`user_id = $${addParam(params, filter.userId)}`);
  }
  if (filter.unreadByAdminGt != null) {
    conditions.push(`unread_by_admin > $${addParam(params, filter.unreadByAdminGt)}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order =
    sort === 'lastMessageDesc'
      ? 'last_message_at DESC NULLS LAST, created_at DESC'
      : 'created_at DESC';

  const { rows } = await query(`SELECT * FROM conversations ${where} ORDER BY ${order}`, params);
  return rows.map(mapConversationRow);
}

export async function create(data: {
  userId: string;
  userName: string;
  orderId?: string;
  status?: ConversationStatus;
}): Promise<IConversation> {
  const { rows } = await query(
    `INSERT INTO conversations (user_id, user_name, order_id, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.userId, data.userName, data.orderId ?? null, data.status ?? 'active'],
  );
  return mapConversationRow(rows[0]);
}

export async function save(conversation: IConversation): Promise<IConversation> {
  const { rows } = await query(
    `UPDATE conversations SET
      status = $2, last_message = $3, last_message_at = $4,
      unread_by_admin = $5, unread_by_user = $6, updated_at = now()
    WHERE id = $1 RETURNING *`,
    [
      conversation.id,
      conversation.status,
      conversation.lastMessage ?? null,
      conversation.lastMessageAt ?? null,
      conversation.unreadByAdmin,
      conversation.unreadByUser,
    ],
  );
  return mapConversationRow(rows[0]);
}

export async function findOldClosed(before: Date, limit = 50): Promise<IConversation[]> {
  const { rows } = await query(
    `SELECT * FROM conversations
     WHERE status = 'closed' AND updated_at < $1
     ORDER BY updated_at ASC LIMIT $2`,
    [before, limit],
  );
  return rows.map(mapConversationRow);
}

export async function deleteById(id: string): Promise<void> {
  await query('DELETE FROM conversations WHERE id = $1', [id]);
}
