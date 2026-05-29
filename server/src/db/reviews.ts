import { query } from '../config/db.js';
import type { IReview } from '../models/Review.js';
import { mapReviewRow } from './helpers.js';
import { addParam } from './sqlParams.js';

export type ReviewFilter = {
  approved?: boolean;
  userId?: string;
  ratingGte?: number;
  ratingLte?: number;
  featured?: boolean;
};

function buildReviewWhere(filter: ReviewFilter, params: unknown[]): string {
  const conditions: string[] = [];

  if (filter.approved != null) {
    conditions.push(`approved = $${addParam(params, filter.approved)}`);
  }
  if (filter.userId) {
    conditions.push(`user_id = $${addParam(params, filter.userId)}`);
  }
  if (filter.ratingGte != null) {
    conditions.push(`rating >= $${addParam(params, filter.ratingGte)}`);
  }
  if (filter.ratingLte != null) {
    conditions.push(`rating <= $${addParam(params, filter.ratingLte)}`);
  }
  if (filter.featured != null) {
    conditions.push(`featured = $${addParam(params, filter.featured)}`);
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

export async function find(
  filter: ReviewFilter = {},
  sort: 'verifiedRatingCreated' | 'createdDesc' = 'createdDesc',
  limit?: number,
): Promise<IReview[]> {
  const params: unknown[] = [];
  const where = buildReviewWhere(filter, params);
  const order =
    sort === 'verifiedRatingCreated'
      ? 'verified DESC, rating DESC, created_at DESC'
      : 'created_at DESC';
  const limitClause = limit ? `LIMIT ${limit}` : '';
  const { rows } = await query(`SELECT * FROM reviews ${where} ORDER BY ${order} ${limitClause}`, params);
  return rows.map(mapReviewRow);
}

export async function create(data: {
  userId: string;
  userName: string;
  productId?: string;
  rating: number;
  comment: string;
  approved?: boolean;
  verified?: boolean;
}): Promise<IReview> {
  const { rows } = await query(
    `INSERT INTO reviews (user_id, user_name, product_id, rating, comment, approved, verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.userId,
      data.userName,
      data.productId ?? null,
      data.rating,
      data.comment,
      data.approved ?? false,
      data.verified ?? true,
    ],
  );
  return mapReviewRow(rows[0]);
}

export async function updateById(
  id: string,
  patch: Partial<Pick<IReview, 'approved' | 'adminResponse' | 'featured'>>,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [id];

  if (patch.approved != null) {
    sets.push(`approved = $${addParam(params, patch.approved)}`);
  }
  if (patch.adminResponse !== undefined) {
    sets.push(`admin_response = $${addParam(params, patch.adminResponse || null)}`);
  }
  if (patch.featured != null) {
    sets.push(`featured = $${addParam(params, patch.featured)}`);
  }

  if (sets.length === 0) return;
  await query(`UPDATE reviews SET ${sets.join(', ')} WHERE id = $1`, params);
}

export async function countDocuments(filter: ReviewFilter = {}): Promise<number> {
  const params: unknown[] = [];
  const where = buildReviewWhere(filter, params);
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM reviews ${where}`, params);
  return Number(rows[0]?.count ?? 0);
}

export async function aggregateProductStats(): Promise<Array<{ productId: string; average: number; count: number }>> {
  const { rows } = await query(
    `SELECT product_id, AVG(rating)::float AS average, COUNT(*)::int AS count
     FROM reviews
     WHERE approved = true AND product_id IS NOT NULL
     GROUP BY product_id`,
  );
  return rows.map((r) => ({
    productId: String(r.product_id),
    average: Number(r.average),
    count: Number(r.count),
  }));
}
