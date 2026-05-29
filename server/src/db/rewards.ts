import { query } from '../config/db.js';
import type { IReward } from '../models/Reward.js';
import { mapRewardRow } from './helpers.js';

export async function find(filter: { active?: boolean } = {}): Promise<IReward[]> {
  const params: unknown[] = [];
  let where = '';
  if (filter.active != null) {
    where = 'WHERE active = $1';
    params.push(filter.active);
  }
  const { rows } = await query(`SELECT * FROM rewards ${where} ORDER BY zardas_cost ASC`, params);
  return rows.map(mapRewardRow);
}

export async function findById(id: string): Promise<IReward | null> {
  const { rows } = await query('SELECT * FROM rewards WHERE id = $1', [id]);
  return rows[0] ? mapRewardRow(rows[0]) : null;
}

export async function create(data: Partial<IReward>): Promise<IReward> {
  const { rows } = await query(
    `INSERT INTO rewards (name, description, zardas_cost, icon, active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.name,
      data.description ?? '',
      data.zardasCost,
      data.icon ?? '🎁',
      data.active ?? true,
    ],
  );
  return mapRewardRow(rows[0]);
}

export async function updateById(id: string, data: Partial<IReward>): Promise<IReward | null> {
  const existing = await findById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  const { rows } = await query(
    `UPDATE rewards SET name = $2, description = $3, zardas_cost = $4, icon = $5, active = $6
     WHERE id = $1 RETURNING *`,
    [id, merged.name, merged.description, merged.zardasCost, merged.icon, merged.active],
  );
  return rows[0] ? mapRewardRow(rows[0]) : null;
}

export async function deleteById(id: string): Promise<IReward | null> {
  const existing = await findById(id);
  if (!existing) return null;
  await query('DELETE FROM rewards WHERE id = $1', [id]);
  return existing;
}

export async function countDocuments(): Promise<number> {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM rewards');
  return Number(rows[0]?.count ?? 0);
}

export async function insertMany(items: Partial<IReward>[]): Promise<void> {
  for (const item of items) {
    await create(item);
  }
}
