import type { Review } from '../types';

export type DisplayReview = Review & {
  isFallback?: boolean;
};

export const HOME_REVIEW_MIN = 3;
export const HOME_REVIEW_MAX = 5;
export const HOME_POSITIVE_MIN_RATING = 4;
export const FALLBACK_REVIEW_MAX = 3;

export const FALLBACK_REVIEWS: DisplayReview[] = [
  {
    id: 'fallback-1',
    userId: 'fallback',
    userName: 'Laura M.',
    rating: 5,
    comment: 'Pedido online genial, sin llamadas. 10/10.',
    approved: true,
    verified: false,
    createdAt: '2026-01-15T12:00:00.000Z',
    isFallback: true,
  },
  {
    id: 'fallback-2',
    userId: 'fallback',
    userName: 'Carlos R.',
    rating: 5,
    comment: 'Muy rápido y buen trato. Repetiré seguro.',
    approved: true,
    verified: false,
    createdAt: '2026-01-10T12:00:00.000Z',
    isFallback: true,
  },
  {
    id: 'fallback-3',
    userId: 'fallback',
    userName: 'Ana G.',
    rating: 5,
    comment: 'Todo perfecto, la comida llegó caliente.',
    approved: true,
    verified: false,
    createdAt: '2026-01-05T12:00:00.000Z',
    isFallback: true,
  },
];

export function isPositiveReview(review: Pick<Review, 'rating'>): boolean {
  return review.rating >= HOME_POSITIVE_MIN_RATING;
}

/** Verificadas → no verificadas → mejor rating → más recientes */
export function sortHomeReviews(reviews: Review[]): Review[] {
  return [...reviews].sort((a, b) => {
    const verifiedDiff = Number(b.verified) - Number(a.verified);
    if (verifiedDiff !== 0) return verifiedDiff;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function filterPositiveReviews(reviews: Review[]): Review[] {
  return sortHomeReviews(reviews.filter(isPositiveReview));
}

export function buildHomeReviews(allReviews: Review[]): DisplayReview[] {
  const realPositive = filterPositiveReviews(allReviews);
  const realForHome = realPositive.slice(0, HOME_REVIEW_MAX).map((review) => ({
    ...review,
    isFallback: false,
  }));

  if (realForHome.length >= HOME_REVIEW_MIN) {
    return realForHome;
  }

  const fallbackNeeded = Math.min(
    FALLBACK_REVIEW_MAX,
    HOME_REVIEW_MIN - realForHome.length,
    HOME_REVIEW_MAX - realForHome.length,
  );

  const fallbacks = FALLBACK_REVIEWS.slice(0, fallbackNeeded);
  return [...realForHome, ...fallbacks];
}

export function getHomeReviewStats(allReviews: Review[]) {
  const positive = filterPositiveReviews(allReviews);
  const verifiedPositive = positive.filter((review) => review.verified);

  if (positive.length === 0) {
    return { average: 5, count: 0, positiveCount: 0, verifiedCount: 0 };
  }

  const average =
    Math.round((positive.reduce((sum, review) => sum + review.rating, 0) / positive.length) * 10) /
    10;

  return {
    average,
    count: allReviews.length,
    positiveCount: positive.length,
    verifiedCount: verifiedPositive.length,
  };
}

export function truncateReviewComment(comment: string, maxLength = 140): string {
  const trimmed = comment.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}

export function isReviewVerified(review: Pick<Review, 'verified'> & { isFallback?: boolean }): boolean {
  return Boolean(review.verified && !review.isFallback);
}
