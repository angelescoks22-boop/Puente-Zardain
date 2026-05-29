import { query } from '../config/db.js';

export async function insertRevokedToken(tokenHash: string, expiresAt: Date): Promise<void> {
  await query(
    `INSERT INTO revoked_tokens (token_hash, expires_at)
     VALUES ($1, $2)
     ON CONFLICT (token_hash) DO NOTHING`,
    [tokenHash, expiresAt],
  );
}

export async function isTokenRevoked(tokenHash: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1 FROM revoked_tokens
     WHERE token_hash = $1 AND expires_at > now()
     LIMIT 1`,
    [tokenHash],
  );
  return rows.length > 0;
}

export async function cleanupExpiredRevokedTokens(): Promise<number> {
  const { rowCount } = await query(
    `DELETE FROM revoked_tokens WHERE expires_at <= now()`,
  );
  return rowCount ?? 0;
}
