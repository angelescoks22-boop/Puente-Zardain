type Props = {
  compact?: boolean;
  className?: string;
};

const BADGES = [
  { icon: '✔️', text: 'Pedido confirmado al instante' },
  { icon: '💵', text: 'Pagas al recibir' },
  { icon: '📍', text: 'Solo Arroyomolinos' },
] as const;

export function TrustBadges({ compact = false, className = '' }: Props) {
  return (
    <div className={`trust-badges ${compact ? 'trust-badges--compact' : ''} ${className}`.trim()}>
      {BADGES.map((badge) => (
        <span key={badge.text} className="trust-badge">
          <span aria-hidden>{badge.icon}</span>
          {badge.text}
        </span>
      ))}
    </div>
  );
}
