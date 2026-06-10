import type { IProduct } from '../models/Product.js';
import { AppError } from './logger.js';

export type OrderLineInput = {
  productId: string;
  quantity: number;
  removedIngredients?: string[];
  unitPrice?: number;
};

export function validateRemovedIngredients(
  product: IProduct,
  removedIngredients: string[],
): void {
  const ids = new Set((product.ingredients ?? []).map((i) => i.id));
  for (const rid of removedIngredients) {
    if (!ids.has(rid)) {
      throw new AppError(`Ingrediente no válido en ${product.name}`, 400);
    }
    const ing = product.ingredients.find((i) => i.id === rid);
    if (ing?.required) {
      throw new AppError(`No puedes quitar "${ing.name}" de ${product.name}`, 400);
    }
  }
}

export function buildPricedLine(
  product: IProduct,
  quantity: number,
  removedIngredients: string[],
) {
  validateRemovedIngredients(product, removedIngredients);
  const unitPrice = Math.round(Number(product.price) * 100) / 100;
  return {
    productId: product.id,
    productName: product.name,
    productImage: product.image,
    quantity,
    removedIngredients,
    unitPrice,
  };
}

export function calculateOrderTotal(
  lines: { quantity: number; unitPrice: number }[],
): number {
  const sum = lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
  return Math.round(sum * 100) / 100;
}

export function assertTotalMatches(computed: number, clientTotal: number): void {
  if (Math.abs(computed - clientTotal) > 0.02) {
    throw new AppError('El total del pedido no coincide. Actualiza el carrito e inténtalo de nuevo.', 400);
  }
}
