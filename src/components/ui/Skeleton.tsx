type SkeletonProps = {
  className?: string;
  lines?: number;
  height?: number;
};

export function Skeleton({ className = '', height = 16 }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height }}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton height={120} className="skeleton-img" />
      <Skeleton height={18} className="skeleton-title" />
      <Skeleton height={14} className="skeleton-text" />
      <Skeleton height={14} className="skeleton-text short" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <Skeleton height={48} className="skeleton-avatar" />
          <div className="skeleton-row-body">
            <Skeleton height={14} />
            <Skeleton height={12} className="short" />
          </div>
        </div>
      ))}
    </div>
  );
}
