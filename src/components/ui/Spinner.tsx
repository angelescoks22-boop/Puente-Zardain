type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
};

const sizes = { sm: 20, md: 32, lg: 48 };

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  const px = sizes[size];
  return (
    <div className={`spinner-wrap ${className}`} role="status" aria-live="polite">
      <span
        className="spinner"
        style={{ width: px, height: px }}
        aria-hidden
      />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

export function PageLoader({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="page-loader">
      <Spinner size="lg" label={label} />
    </div>
  );
}
