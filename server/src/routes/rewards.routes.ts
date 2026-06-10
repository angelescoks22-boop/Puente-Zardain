import { Router } from 'express';
import { z } from 'zod';
import * as rewardsRepo from '../db/rewards.js';
import * as usersRepo from '../db/users.js';
import * as rewardRedemptionsRepo from '../db/rewardRedemptions.js';
import { authenticate, AuthRequest, formatUser } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/logger.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const rewards = await rewardsRepo.find({ active: true });
  res.json(rewards.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    zardasCost: r.zardasCost,
    icon: r.icon,
  })));
}));

router.get('/redemptions', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const redemptions = await rewardRedemptionsRepo.findPendingByUser(req.userId!);
  res.json(redemptions);
}));

const redeemSchema = z.object({
  rewardId: z.string().uuid('Recompensa no válida'),
});

router.post('/redeem', authenticate, validateBody(redeemSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { rewardId } = req.body as z.infer<typeof redeemSchema>;
  const reward = await rewardsRepo.findById(rewardId);
  if (!reward || !reward.active) {
    throw new AppError('Recompensa no disponible', 404);
  }

  const user = await usersRepo.decrementZardasIfEnough(req.userId!, reward.zardasCost);
  if (!user) {
    throw new AppError('Zardas insuficientes', 400, 'INSUFFICIENT_ZARDAS');
  }

  const redemption = await rewardRedemptionsRepo.createRedemption({
    userId: user.id,
    rewardId: reward.id,
    rewardName: reward.name,
    zardasCost: reward.zardasCost,
  });

  res.json({
    ok: true,
    redemption,
    user: formatUser(user),
    message: `Canjeado: ${reward.name}. Se aplicará en tu próximo pedido.`,
  });
}));

export default router;
