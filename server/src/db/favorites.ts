import { query } from '../config/db.js';

export async function listFavoriteProductIds(userId: string): Promise<string[]> {
  const { rows } = await query(
    'SELECT product_id FROM user_favorite_products WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows.map((r) => String(r.product_id));
}

export async function toggleFavoriteProduct(userId: string, productId: string): Promise<boolean> {
  const { rows: deleted } = await query(
    `DELETE FROM user_favorite_products
     WHERE user_id = $1 AND product_id = $2
     RETURNING 1`,
    [userId, productId],
  );
  if (deleted.length > 0) return false;

  await query(
    'INSERT INTO user_favorite_products (user_id, product_id) VALUES ($1, $2)',
    [userId, productId],
  );
  return true;
}

export type FavoriteOrderRow = {
  id: string;
  name: string;
  items: unknown;
  createdAt: string;
};

export async function listFavoriteOrders(userId: string): Promise<FavoriteOrderRow[]> {
  const { rows } = await query(
    `SELECT id, name, items, created_at
     FROM user_favorite_orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    items: r.items,
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

export async function deleteFavoriteOrder(userId: string, favId: string): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM user_favorite_orders WHERE id = $1 AND user_id = $2',
    [favId, userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function createFavoriteOrder(
  userId: string,
  name: string,
  items: unknown,
): Promise<FavoriteOrderRow> {
  const { rows } = await query(
    `INSERT INTO user_favorite_orders (user_id, name, items)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, name, items, created_at`,
    [userId, name.trim().slice(0, 80), JSON.stringify(items)],
  );
  const r = rows[0];
  return {
    id: String(r.id),
    name: String(r.name),
    items: r.items,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}
