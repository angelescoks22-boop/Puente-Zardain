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

export async function create(data: Partial<IBusinessMessage>): Promise<IBusinessMessage> {
  const { rows } = await query(
    `INSERT INTO business_messages (text, type, active)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.text, data.type ?? 'info', data.active ?? true],
  );
  return mapBusinessMessageRow(rows[0]);
}

export async function updateById(id: string, data: Partial<IBusinessMessage>): Promise<void> {
  const existing = (await find()).find((m) => m.id === id);
  if (!existing) return;
  const merged = { ...existing, ...data };
  await query(
    'UPDATE business_messages SET text = $2, type = $3, active = $4 WHERE id = $1',
    [id, merged.text, merged.type, merged.active],
  );
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
