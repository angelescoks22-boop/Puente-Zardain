import { query } from '../config/db.js';
import type { IUser, IUserAddress, UserRole, UserLevel } from '../models/User.js';
import { mapUserRow, serializeAddresses } from './helpers.js';
import { addParam } from './sqlParams.js';

export type CreateUserInput = {
  name: string;
  phone: string;
  email: string;
  password: string;
  passwordUserSet?: boolean;
  role?: UserRole;
  address?: string;
  addresses?: IUserAddress[];
  zardas?: number;
  level?: UserLevel;
  phoneVerified?: boolean;
};

export async function findById(id: string): Promise<IUser | null> {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function findOneByEmail(email: string): Promise<IUser | null> {
  const { rows } = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function findOneByPhoneOrEmail(phone: string, email: string): Promise<IUser | null> {
  const { rows } = await query(
    'SELECT * FROM users WHERE phone = $1 OR email = $2 LIMIT 1',
    [phone, email.toLowerCase()],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function findOneByIdentifier(identifier: string): Promise<IUser | null> {
  const { rows } = await query(
    'SELECT * FROM users WHERE email = $1 OR phone = $2 LIMIT 1',
    [identifier.toLowerCase(), identifier],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function findByRole(role: UserRole, sort?: { orderCount?: -1 | 1 }, limit?: number): Promise<IUser[]> {
  const order = sort?.orderCount === -1 ? 'ORDER BY order_count DESC' : '';
  const limitClause = limit ? `LIMIT ${limit}` : '';
  const { rows } = await query(`SELECT * FROM users WHERE role = $1 ${order} ${limitClause}`, [role]);
  return rows.map(mapUserRow);
}

export async function findProblematicClients(problematicIds: string[], limit = 15): Promise<IUser[]> {
  const { rows } = await query(
    `SELECT * FROM users
     WHERE role = 'client'
       AND (
         client_status IN ('problematic', 'blocked')
         OR id = ANY($1::uuid[])
         OR no_show_count >= 1
       )
     LIMIT $2`,
    [problematicIds, limit],
  );
  return rows.map(mapUserRow);
}

export async function create(data: CreateUserInput): Promise<IUser> {
  const addresses = serializeAddresses(data.addresses ?? []);
  const { rows } = await query(
    `INSERT INTO users (
      name, phone, email, password, password_user_set, role, address, addresses, zardas, level, phone_verified
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
    RETURNING *`,
    [
      data.name,
      data.phone,
      data.email.toLowerCase(),
      data.password,
      data.passwordUserSet ?? false,
      data.role ?? 'client',
      data.address ?? null,
      JSON.stringify(addresses),
      data.zardas ?? 0,
      data.level ?? 'hierro',
      data.phoneVerified ?? false,
    ],
  );
  return mapUserRow(rows[0]);
}

export async function updatePassword(
  userId: string,
  passwordHash: string,
  passwordUserSet = true,
): Promise<IUser | null> {
  const { rows } = await query(
    `UPDATE users SET password = $2, password_user_set = $3, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [userId, passwordHash, passwordUserSet],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function markPasswordUserSet(userId: string): Promise<void> {
  await query('UPDATE users SET password_user_set = true, updated_at = now() WHERE id = $1', [userId]);
}

export async function save(user: IUser): Promise<IUser> {
  const addresses = serializeAddresses(user.addresses ?? []);
  const { rows } = await query(
    `UPDATE users SET
      name = $2, phone = $3, email = $4, address = $5, addresses = $6::jsonb,
      zardas = $7, level = $8, level_progress = $9, order_count = $10, streak = $11,
      last_order_date = $12, is_blocked = $13, no_show_count = $14, phone_verified = $15,
      client_status = $16, favorite_product_id = $17, profile_avatar = $18, profile_color = $19,
      profile_tagline = $20, profile_frame = $21,
      birthday = $22, birthday_reward_claimed_year = $23, birthday_free_product_pending = $24,
      updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [
      user.id,
      user.name,
      user.phone,
      user.email,
      user.address ?? null,
      JSON.stringify(addresses),
      user.zardas,
      user.level,
      user.levelProgress,
      user.orderCount,
      user.streak,
      user.lastOrderDate ?? null,
      user.isBlocked,
      user.noShowCount,
      user.phoneVerified,
      user.clientStatus,
      user.favoriteProductId ?? null,
      user.profileAvatar ?? '😊',
      user.profileColor ?? '#e85d04',
      user.profileTagline ?? null,
      user.profileFrame ?? 'none',
      user.birthday ?? null,
      user.birthdayRewardClaimedYear ?? null,
      user.birthdayFreeProductPending ?? false,
    ],
  );
  return mapUserRow(rows[0]);
}

export async function updateById(id: string, patch: Partial<Pick<IUser, 'clientStatus' | 'isBlocked' | 'zardas'>>): Promise<IUser | null> {
  const sets: string[] = [];
  const params: unknown[] = [id];

  if (patch.clientStatus !== undefined) {
    sets.push(`client_status = $${addParam(params, patch.clientStatus)}`);
  }
  if (patch.isBlocked !== undefined) {
    sets.push(`is_blocked = $${addParam(params, patch.isBlocked)}`);
  }
  if (patch.zardas !== undefined) {
    sets.push(`zardas = $${addParam(params, patch.zardas)}`);
  }

  if (sets.length === 0) return findById(id);

  sets.push('updated_at = now()');
  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function incrementZardas(id: string, amount: number): Promise<void> {
  await query('UPDATE users SET zardas = zardas + $2, updated_at = now() WHERE id = $1', [id, amount]);
}

export async function decrementZardasIfEnough(id: string, amount: number): Promise<IUser | null> {
  const { rows } = await query(
    `UPDATE users SET zardas = zardas - $2, updated_at = now()
     WHERE id = $1 AND zardas >= $2
     RETURNING *`,
    [id, amount],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function claimBirthdayRewardAtomic(
  userId: string,
  year: number,
  zardasAmount: number,
): Promise<IUser | null> {
  const { rows } = await query(
    `UPDATE users SET
      zardas = zardas + $3,
      birthday_reward_claimed_year = $2,
      birthday_free_product_pending = true,
      updated_at = now()
     WHERE id = $1
       AND birthday IS NOT NULL
       AND (birthday_reward_claimed_year IS NULL OR birthday_reward_claimed_year <> $2)
     RETURNING *`,
    [userId, year, zardasAmount],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function consumeBirthdayFreeProduct(userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE users SET birthday_free_product_pending = false, updated_at = now()
     WHERE id = $1 AND birthday_free_product_pending = true`,
    [userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function incrementZardasForIds(ids: string[], amount: number): Promise<number> {
  if (ids.length === 0) return 0;
  const { rowCount } = await query(
    `UPDATE users SET zardas = zardas + $2, updated_at = now()
     WHERE id = ANY($1::uuid[]) AND role = 'client'`,
    [ids, amount],
  );
  return rowCount ?? 0;
}

export async function countDocuments(filter: {
  role?: UserRole;
  createdAtGte?: Date;
  createdAtLt?: Date;
  orderCountGte?: number;
  ids?: string[];
}): Promise<number> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.role) {
    conditions.push(`role = $${addParam(params, filter.role)}`);
  }
  if (filter.createdAtGte) {
    conditions.push(`created_at >= $${addParam(params, filter.createdAtGte)}`);
  }
  if (filter.createdAtLt) {
    conditions.push(`created_at < $${addParam(params, filter.createdAtLt)}`);
  }
  if (filter.orderCountGte != null) {
    conditions.push(`order_count >= $${addParam(params, filter.orderCountGte)}`);
  }
  if (filter.ids?.length) {
    conditions.push(`id = ANY($${addParam(params, filter.ids)}::uuid[])`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM users ${where}`, params);
  return Number(rows[0]?.count ?? 0);
}

export async function findOneByRole(role: UserRole): Promise<IUser | null> {
  const { rows } = await query('SELECT * FROM users WHERE role = $1 LIMIT 1', [role]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function existsByRole(role: UserRole): Promise<boolean> {
  const { rows } = await query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', [role]);
  return rows.length > 0;
}
