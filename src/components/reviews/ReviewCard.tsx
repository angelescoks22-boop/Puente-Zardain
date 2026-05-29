import type { CSSProperties } from 'react';
import { truncateReviewComment } from '../../utils/reviews';
import { StarRating } from './StarRating';

export type ReviewCardProps = {
  rating: number;
  comment: string;
  user: string;
  verified: boolean;
  compact?: boolean;
  style?: CSSProperties;
};

export function ReviewCard({
  rating,
  comment,
  user,
  verified,
  compact = false,
  style,
}: ReviewCardProps) {
  const text = compact ? truncateReviewComment(comment) : comment;

  return (
    <article className="review-card" style={style}>
      <StarRating rating={rating} size="sm" />

      <p className="review-comment">“{text}”</p>

      {verified && (
        <span className="review-verified-badge">
          <span aria-hidden>✅</span> Pedido verificado
        </span>
      )}

      <footer className="review-card-footer">
        <span className="review-author">{user}</span>
      </footer>
    </article>
  );
}
