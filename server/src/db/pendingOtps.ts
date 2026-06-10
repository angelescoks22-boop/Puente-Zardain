import { query } from '../config/db.js';
import type { IPendingOtp } from '../models/PendingOtp.js';
import { mapPendingOtpRow } from './helpers.js';

export type UpsertPendingOtpInput = {
  email: string;
  otp: string;
  attempts?: number;
  expiresAt: Date;
  phone?: string;
  name?: string;
  passwordHash?: string;
  passwordUserSet?: boolean;
  pendingAddress?: IPendingOtp['pendingAddress'];
};

export async function upsertByEmail(data: UpsertPendingOtpInput): Promise<IPendingOtp> {
  const email = data.email.toLowerCase().trim();
  const { rows } = await query(
    `INSERT INTO pending_otps (email, phone, name, password_hash, password_user_set, otp, attempts, expires_at, pending_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (email) DO UPDATE SET
       phone = COALESCE(EXCLUDED.phone, pending_otps.phone),
       name = COALESCE(EXCLUDED.name, pending_otps.name),
       password_hash = COALESCE(EXCLUDED.password_hash, pending_otps.password_hash),
       password_user_set = COALESCE(EXCLUDED.password_user_set, pending_otps.password_user_set),
       pending_address = COALESCE(EXCLUDED.pending_address, pending_otps.pending_address),
       otp = EXCLUDED.otp,
       attempts = EXCLUDED.attempts,
       expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [
      email,
      data.phone ?? null,
      data.name ?? null,
      data.passwordHash ?? null,
      data.passwordUserSet ?? false,
      data.otp,
      data.attempts ?? 0,
      data.expiresAt,
      data.pendingAddress ? JSON.stringify(data.pendingAddress) : null,
    ],
  );
  return mapPendingOtpRow(rows[0]);
}

export async function findByEmail(email: string): Promise<IPendingOtp | null> {
  const { rows } = await query('SELECT * FROM pending_otps WHERE email = $1', [email.toLowerCase().trim()]);
  return rows[0] ? mapPendingOtpRow(rows[0]) : null;
}

export async function updateAttempts(email: string, attempts: number): Promise<void> {
  await query('UPDATE pending_otps SET attempts = $2 WHERE email = $1', [email.toLowerCase().trim(), attempts]);
}

export async function deleteByEmail(email: string): Promise<void> {
  await query('DELETE FROM pending_otps WHERE email = $1', [email.toLowerCase().trim()]);
}
