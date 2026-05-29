type Props = {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  showValue?: boolean;
};

export function ProgressBar({ value, max = 100, label, color, showValue }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress-wrap">
      {(label || showValue) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showValue && <span className="progress-value">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color ?? 'var(--primary)' }}
        />
      </div>
    </div>
  );
}
