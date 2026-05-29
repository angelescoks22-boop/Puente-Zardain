import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1",
);
console.log('Tablas:', rows.length ? rows.map((r) => r.table_name).join(', ') : '(ninguna)');

if (rows.length === 0) {
  console.log('Aplicando schema.sql...');
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema aplicado OK');
} else {
  console.log('Comprobando migraciones...');
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_paid_amount numeric;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_change numeric;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_response text;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
    ALTER TABLE pending_otps ALTER COLUMN phone DROP NOT NULL;
    ALTER TABLE pending_otps DROP CONSTRAINT IF EXISTS pending_otps_phone_key;
    ALTER TABLE pending_otps ADD COLUMN IF NOT EXISTS email text;
    UPDATE pending_otps SET email = COALESCE(email, phone || '@pending.local') WHERE email IS NULL;
    DELETE FROM pending_otps WHERE email IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_otps_email ON pending_otps (email);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_tagline text DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_frame text DEFAULT 'none';
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens (expires_at);
  `);
  console.log('Migraciones OK');
}

await pool.end();
