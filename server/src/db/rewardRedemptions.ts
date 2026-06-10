import { query } from '../config/db.js';

export type RewardRedemptionRow = {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  zardasCost: number;
  status: string;
  createdAt: string;
};

export async function findPendingByUser(userId: string): Promise<RewardRedemptionRow[]> {
  const { rows } = await query(
    `SELECT id, user_id, reward_id, reward_name, zardas_cost, status, created_at
     FROM user_reward_redemptions
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function findByIdForUser(id: string, userId: string): Promise<RewardRedemptionRow | null> {
  const { rows } = await query(
    `SELECT id, user_id, reward_id, reward_name, zardas_cost, status, created_at
     FROM user_reward_redemptions
     WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function fulfillRedemption(id: string, userId: string): Promise<RewardRedemptionRow | null> {
  const { rows } = await query(
    `UPDATE user_reward_redemptions SET status = 'fulfilled'
     WHERE id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id, user_id, reward_id, reward_name, zardas_cost, status, created_at`,
    [id, userId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): RewardRedemptionRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    rewardId: String(r.reward_id),
    rewardName: String(r.reward_name),
    zardasCost: Number(r.zardas_cost),
    status: String(r.status),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function createRedemption(data: {
  userId: string;
  rewardId: string;
  rewardName: string;
  zardasCost: number;
}): Promise<RewardRedemptionRow> {
  const { rows } = await query(
    `INSERT INTO user_reward_redemptions (user_id, reward_id, reward_name, zardas_cost, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id, user_id, reward_id, reward_name, zardas_cost, status, created_at`,
    [data.userId, data.rewardId, data.rewardName, data.zardasCost],
  );
  return mapRow(rows[0]);
}
