import { useCallback, useEffect, useMemo, useState } from 'react';
import { getReviews } from '../api/products';
import type { Review } from '../types';
import { buildHomeReviews, getHomeReviewStats, type DisplayReview } from '../utils/reviews';

const DEFAULT_POLL_MS = 45_000;

export function useHomeReviews(pollMs = DEFAULT_POLL_MS) {
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const reviews = await getReviews(50);
      setAllReviews(reviews);
    } catch {
      setAllReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, pollMs);
    return () => clearInterval(interval);
  }, [pollMs, refresh]);

  const homeReviews = useMemo(() => buildHomeReviews(allReviews), [allReviews]);
  const stats = useMemo(() => getHomeReviewStats(allReviews), [allReviews]);

  return {
    homeReviews,
    stats,
    loading,
    refresh,
  };
}

export type { DisplayReview };
