import { Router } from 'express';

import * as businessMessagesRepo from '../db/businessMessages.js';
import * as rewardsRepo from '../db/rewards.js';

import { getPublicSettingsPayload, getQueueEstimatePayload } from '../services/settings.service.js';

import { formatProduct, getRecommendations, listProducts } from '../services/products.service.js';

import { asyncHandler } from '../middleware/errorHandler.js';

import { AppError } from '../utils/logger.js';



const router = Router();



/**

 * GET /api/products

 * GET /api/products?category=hamburguesas|montados|bocadillos|...

 */

router.get('/', asyncHandler(async (req, res) => {

  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  const { products, invalidCategory } = await listProducts(category);

  if (invalidCategory) {

    throw new AppError('Categoría no válida', 400);

  }

  res.json(products.map(formatProduct));

}));



/** GET /api/products/recommendations?limit=3&category=montados */

router.get('/recommendations', asyncHandler(async (req, res) => {

  const limit = Math.min(Number(req.query.limit) || 3, 12);

  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  const items = await getRecommendations(limit, category);

  res.json(items);

}));



router.get('/messages', asyncHandler(async (_req, res) => {

  const messages = await businessMessagesRepo.find({ active: true });

  res.json(messages.map((m) => ({

    id: m.id,

    text: m.text,

    type: m.type,

    active: m.active,

  })));

}));



router.get('/rewards', asyncHandler(async (_req, res) => {

  const rewards = await rewardsRepo.find({ active: true });

  res.json(rewards.map((r) => ({

    id: r.id,

    name: r.name,

    description: r.description,

    zardasCost: r.zardasCost,

    icon: r.icon,

  })));

}));



/** Compat frontend — misma fuente que /api/settings/public */

router.get('/settings/public', asyncHandler(async (_req, res) => {

  res.json(await getPublicSettingsPayload());

}));



router.get('/queue-estimate', asyncHandler(async (_req, res) => {

  res.json(await getQueueEstimatePayload());

}));



export default router;

