import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getPublicSettingsPayload, getQueueEstimatePayload } from '../services/settings.service.js';

const router = Router();

/** Estado global del negocio (público) */
router.get('/public', asyncHandler(async (_req, res) => {
  res.json(await getPublicSettingsPayload());
}));

/** Estimación de cola y tiempos */
router.get('/queue-estimate', asyncHandler(async (_req, res) => {
  res.json(await getQueueEstimatePayload());
}));

export default router;
