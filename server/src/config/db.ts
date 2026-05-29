import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool() {
  if (!pool) {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL no configurada en server/.env');
    }
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return pool;
}

export async function connectDB() {
  const client = getPool();
  await client.query('SELECT 1');
  console.log('✅ PostgreSQL (Supabase) conectado');
}

export async function disconnectDB() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params);
}
