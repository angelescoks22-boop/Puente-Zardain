import { Link } from 'react-router-dom';
import { useHomeReviews } from '../../hooks/useHomeReviews';
import { ReviewCard } from './ReviewCard';
import { SkeletonCard } from '../ui/Skeleton';
import { isReviewVerified } from '../../utils/reviews';

export function ReviewsSection() {
  const { homeReviews, stats, loading } = useHomeReviews();

  return (
    <section className="section reviews-section" aria-labelledby="home-reviews-title">
      <div className="section-header reviews-section-header">
        <div>
          <h2 id="home-reviews-title">⭐ Opiniones reales</h2>
          {stats.positiveCount > 0 && (
            <p className="reviews-section-subtitle">
              {stats.average.toFixed(1)} · {stats.verifiedCount || stats.positiveCount} pedidos verificados
            </p>
          )}
        </div>
        <Link to="/reviews" className="reviews-see-all">
          Ver todas las reseñas
        </Link>
      </div>

      <div className="reviews-scroll">
        {loading && homeReviews.length === 0
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="review-card-skeleton">
                <SkeletonCard />
              </div>
            ))
          : homeReviews.map((review, index) => (
              <ReviewCard
                key={review.id}
                rating={review.rating}
                comment={review.comment}
                user={review.userName}
                verified={isReviewVerified(review)}
                compact
                style={{ animationDelay: `${index * 0.08}s` }}
              />
            ))}
      </div>
    </section>
  );
}
