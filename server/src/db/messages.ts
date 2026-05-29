import { query } from '../config/db.js';
import type { IMessage, MessageSender } from '../models/Message.js';
import { mapMessageRow } from './helpers.js';

export async function create(data: {
  conversationId: string;
  sender: MessageSender;
  message: string;
  read?: boolean;
  isAutomated?: boolean;
}): Promise<IMessage> {
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender, message, read, is_automated)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.conversationId,
      data.sender,
      data.message,
      data.read ?? false,
      data.isAutomated ?? false,
    ],
  );
  return mapMessageRow(rows[0]);
}

export async function findByConversationId(conversationId: string): Promise<IMessage[]> {
  const { rows } = await query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId],
  );
  return rows.map(mapMessageRow);
}

export async function markReadForConversation(
  conversationId: string,
  senders: MessageSender[],
): Promise<void> {
  await query(
    `UPDATE messages SET read = true
     WHERE conversation_id = $1 AND sender = ANY($2::text[]) AND read = false`,
    [conversationId, senders],
  );
}

export async function deleteByConversationId(conversationId: string): Promise<number> {
  const { rowCount } = await query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
  return rowCount ?? 0;
}

export async function deleteManyOlderThan(before: Date): Promise<number> {
  const { rowCount } = await query('DELETE FROM messages WHERE created_at < $1', [before]);
  return rowCount ?? 0;
}
