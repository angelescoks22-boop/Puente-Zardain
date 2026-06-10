import { query } from '../config/db.js';
import type { IProduct } from '../models/Product.js';
import { mapProductRow } from './helpers.js';
import { addParam } from './sqlParams.js';

export type ProductFilter = {
  active?: boolean;
  category?: string | { nin?: string[] };
  id?: string;
};

function buildProductWhere(filter: ProductFilter, params: unknown[]): string {
  const conditions: string[] = [];

  if (filter.active != null) {
    conditions.push(`active = $${addParam(params, filter.active)}`);
  }
  if (typeof filter.category === 'string') {
    conditions.push(`category = $${addParam(params, filter.category)}`);
  } else if (filter.category?.nin?.length) {
    conditions.push(`category != ALL($${addParam(params, filter.category.nin)}::text[])`);
  }
  if (filter.id) {
    conditions.push(`id = $${addParam(params, filter.id)}`);
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

export async function findById(id: string): Promise<IProduct | null> {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] ? mapProductRow(rows[0]) : null;
}

export async function find(filter: ProductFilter = {}, sort?: string): Promise<IProduct[]> {
  const params: unknown[] = [];
  const where = buildProductWhere(filter, params);
  const order = sort ?? 'category ASC, name ASC';
  const { rows } = await query(`SELECT * FROM products ${where} ORDER BY ${order}`, params);
  return rows.map(mapProductRow);
}

export async function create(data: Partial<IProduct>): Promise<IProduct> {
  const { rows } = await query(
    `INSERT INTO products (name, description, price, category, image, ingredients, popular, featured, active)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
     RETURNING *`,
    [
      data.name,
      data.description ?? '',
      data.price,
      data.category,
      data.image ?? '🍔',
      JSON.stringify(data.ingredients ?? []),
      data.popular ?? false,
      data.featured ?? false,
      data.active ?? true,
    ],
  );
  return mapProductRow(rows[0]);
}

export async function updateById(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
  const existing = await findById(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const { rows } = await query(
    `UPDATE products SET
      name = $2, description = $3, price = $4, category = $5, image = $6,
      ingredients = $7::jsonb, popular = $8, featured = $9, active = $10, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      merged.name,
      merged.description,
      merged.price,
      merged.category,
      merged.image,
      JSON.stringify(merged.ingredients),
      merged.popular,
      merged.featured,
      merged.active,
    ],
  );
  return rows[0] ? mapProductRow(rows[0]) : null;
}

export async function softDelete(id: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE products SET active = false, updated_at = now() WHERE id = $1',
    [id],
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteById(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM products WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function deactivateByCategories(categories: string[]): Promise<void> {
  if (!categories.length) return;
  await query(
    'UPDATE products SET active = false, updated_at = now() WHERE category = ANY($1::text[])',
    [categories],
  );
}

export async function countDocuments(filter: ProductFilter = {}): Promise<number> {
  const params: unknown[] = [];
  const where = buildProductWhere(filter, params);
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM products ${where}`, params);
  return Number(rows[0]?.count ?? 0);
}

export async function deleteAll(): Promise<void> {
  await query('DELETE FROM products');
}

export async function insertMany(items: Partial<IProduct>[]): Promise<void> {
  for (const item of items) {
    await create(item);
  }
}

export async function existsByName(name: string): Promise<boolean> {
  const { rows } = await query('SELECT 1 FROM products WHERE name = $1 LIMIT 1', [name]);
  return rows.length > 0;
}
