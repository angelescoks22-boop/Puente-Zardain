import { query } from '../config/db.js';
import type { ISystemLog } from '../models/SystemLog.js';
import { mapSystemLogRow } from './helpers.js';

export async function create(
  level: ISystemLog['level'],
  message: string,
  meta?: Record<string, unknown>,
): Promise<ISystemLog> {
  const { rows } = await query(
    'INSERT INTO system_logs (level, message, meta) VALUES ($1, $2, $3::jsonb) RETURNING *',
    [level, message, meta ? JSON.stringify(meta) : null],
  );
  return mapSystemLogRow(rows[0]);
}

export async function persistSystemLog(
  level: ISystemLog['level'],
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await create(level, message, meta);
  } catch {
    // noop — avoid recursive logging failures
  }
}

export async function findRecent(limit = 30): Promise<ISystemLog[]> {
  const { rows } = await query(
    'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT $1',
    [limit],
  );
  return rows.map(mapSystemLogRow);
}

export async function deleteOlderThan(before: Date): Promise<number> {
  const { rowCount } = await query('DELETE FROM system_logs WHERE created_at < $1', [before]);
  return rowCount ?? 0;
}
