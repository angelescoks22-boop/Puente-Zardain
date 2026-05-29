import type { Product } from '../../types';
import { formatPrice } from '../../utils/format';
import { Card } from '../ui/Card';
import { StarRating } from '../reviews/StarRating';

type Props = {
  product: Product;
  onSelect: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
  rating?: number;
  reviewCount?: number;
};

export function ProductCard({
  product,
  onSelect,
  isFavorite,
  onToggleFavorite,
  compact,
  rating,
  reviewCount,
}: Props) {
  return (
    <Card className={`product-card ${compact ? 'compact' : ''}`} onClick={() => onSelect(product)}>
      <div className="product-image">{product.image}</div>
      <div className="product-info">
        <div className="product-top">
          <h3>{product.name}</h3>
          {onToggleFavorite && (
            <button
              type="button"
              className="fav-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label="Favorito"
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}
        </div>
        {!compact && <p className="product-desc">{product.description}</p>}
        {rating !== undefined && reviewCount !== undefined && reviewCount > 0 && (
          <div className="product-rating">
            <StarRating rating={rating} size="sm" />
            <span className="product-rating-meta">{rating.toFixed(1)} · {reviewCount} reseña{reviewCount !== 1 ? 's' : ''}</span>
          </div>
        )}
        <div className="product-footer">
          <span className="product-price">{formatPrice(product.price)}</span>
          {product.popular && <span className="product-tag">Popular</span>}
        </div>
      </div>
    </Card>
  );
}
