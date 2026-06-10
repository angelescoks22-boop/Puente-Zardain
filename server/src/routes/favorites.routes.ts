import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as favoritesRepo from '../db/favorites.js';
import * as productsRepo from '../db/products.js';
import { AppError } from '../utils/logger.js';
import { paramStr } from '../utils/params.js';

const router = Router();
router.use(authenticate);

const saveOrderSchema = z.object({
  name: z.string().min(1).max(80),
  items: z.array(z.object({
    productId: z.string(),
    product: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      category: z.string(),
      image: z.string(),
      ingredients: z.array(z.unknown()).optional(),
    }),
    quantity: z.number().int().positive(),
    removedIngredients: z.array(z.string()).default([]),
    unitPrice: z.number(),
  })).min(1),
});

router.get('/products', asyncHandler(async (req: AuthRequest, res) => {
  const ids = await favoritesRepo.listFavoriteProductIds(req.userId!);
  res.json(ids);
}));

const uuidSchema = z.string().uuid('ID no válido');

router.post('/products/:productId/toggle', asyncHandler(async (req: AuthRequest, res) => {
  const productId = paramStr(req.params.productId).trim();
  if (!productId) {
    return res.status(400).json({ message: 'Producto no válido' });
  }
  const product = await productsRepo.findById(productId);
  if (!product || !product.active) {
    throw new AppError('Producto no disponible', 404);
  }
  const added = await favoritesRepo.toggleFavoriteProduct(req.userId!, productId);
  res.json({ added });
}));

router.get('/orders', asyncHandler(async (req: AuthRequest, res) => {
  const orders = await favoritesRepo.listFavoriteOrders(req.userId!);
  res.json(orders);
}));

router.post('/orders', validateBody(saveOrderSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { name, items } = req.body as z.infer<typeof saveOrderSchema>;
  const fav = await favoritesRepo.createFavoriteOrder(req.userId!, name, items);
  res.status(201).json(fav);
}));

router.delete('/orders/:id', asyncHandler(async (req: AuthRequest, res) => {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Favorito no válido' });
  }
  const deleted = await favoritesRepo.deleteFavoriteOrder(req.userId!, parsed.data);
  if (!deleted) {
    throw new AppError('Pedido favorito no encontrado', 404);
  }
  res.json({ ok: true });
}));

export default router;
