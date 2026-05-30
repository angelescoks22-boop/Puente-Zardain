import { query } from '../config/db.js';
import type { IBusinessMessage } from '../models/BusinessMessage.js';
import { mapBusinessMessageRow } from './helpers.js';

export async function find(filter: { active?: boolean } = {}, sortDesc = true): Promise<IBusinessMessage[]> {
  const params: unknown[] = [];
  let where = '';
  if (filter.active != null) {
    where = 'WHERE active = $1';
    params.push(filter.active);
  }
  const order = sortDesc ? 'created_at DESC' : 'created_at ASC';
  const { rows } = await query(`SELECT * FROM business_messages ${where} ORDER BY ${order}`, params);
  return rows.map(mapBusinessMessageRow);
}

export async function findById(id: string): Promise<IBusinessMessage | null> {
  const { rows } = await query('SELECT * FROM business_messages WHERE id = $1', [id]);
  return rows[0] ? mapBusinessMessageRow(rows[0]) : null;
}

/** Solo un aviso activo a la vez en la web del cliente */
export async function deactivateAllExcept(id: string): Promise<void> {
  await query('UPDATE business_messages SET active = false WHERE id <> $1 AND active = true', [id]);
}

export async function create(data: Partial<IBusinessMessage>): Promise<IBusinessMessage> {
  const active = data.active ?? true;
  const msg = await query(
    `INSERT INTO business_messages (text, type, active)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [String(data.text ?? '').trim(), data.type ?? 'info', active],
  );
  const created = mapBusinessMessageRow(msg.rows[0]);
  if (active) {
    await deactivateAllExcept(created.id);
  }
  return created;
}

export async function updateById(id: string, data: Partial<IBusinessMessage>): Promise<IBusinessMessage | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  if (merged.active) {
    await deactivateAllExcept(id);
  }
  const { rows } = await query(
    'UPDATE business_messages SET text = $2, type = $3, active = $4 WHERE id = $1 RETURNING *',
    [id, merged.text.trim(), merged.type, merged.active],
  );
  return rows[0] ? mapBusinessMessageRow(rows[0]) : null;
}

export async function deleteById(id: string): Promise<void> {
  await query('DELETE FROM business_messages WHERE id = $1', [id]);
}

export async function countDocuments(): Promise<number> {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM business_messages');
  return Number(rows[0]?.count ?? 0);
}

export async function insertMany(items: Partial<IBusinessMessage>[]): Promise<void> {
  for (const item of items) {
    await create(item);
  }
}
