export function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className={`star-rating star-rating--${size}`} aria-label={`${rating} de 5 estrellas`}>
      {'★'.repeat(full)}
      {half ? '⯨' : ''}
      {'☆'.repeat(empty)}
    </span>
  );
}
