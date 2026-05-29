import { Router } from 'express';
import * as reviewsRepo from '../db/reviews.js';
import * as ordersRepo from '../db/orders.js';
import * as usersRepo from '../db/users.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 50);
  const minRating = Number(req.query.minRating);
  const filter: reviewsRepo.ReviewFilter = { approved: true };
  if (!Number.isNaN(minRating) && minRating > 0) {
    filter.ratingGte = minRating;
  }

  const reviews = await reviewsRepo.find(filter, 'verifiedRatingCreated', limit);
  res.json(reviews.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    productId: r.productId,
    rating: r.rating,
    comment: r.comment,
    approved: r.approved,
    verified: r.verified !== false,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get('/stats/products', async (_req, res) => {
  const stats = await reviewsRepo.aggregateProductStats();
  const map: Record<string, { average: number; count: number }> = {};
  for (const s of stats) {
    map[s.productId] = {
      average: Math.round(s.average * 10) / 10,
      count: s.count,
    };
  }
  res.json(map);
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  const { rating, comment, productId } = req.body;
  const hasOrders = await ordersRepo.exists({ userId: req.userId, status: { ne: 'cancelled' } });
  if (!hasOrders) return res.status(403).json({ message: 'Solo puedes opinar si has hecho pedidos' });

  const existing = await reviewsRepo.countDocuments({ userId: req.userId });
  const isFirst = existing === 0;

  const review = await reviewsRepo.create({
    userId: req.userId!,
    userName: req.user!.name,
    productId: productId || undefined,
    rating,
    comment: comment.trim(),
    approved: false,
    verified: true,
  });

  if (isFirst) {
    await usersRepo.incrementZardas(req.userId!, 30);
  }

  res.status(201).json({
    id: review.id,
    approved: false,
    firstReviewBonus: isFirst,
  });
});

export default router;
