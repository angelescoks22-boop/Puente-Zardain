import type { User, Order } from '../../types';
import { computeBadges } from '../../utils/badges';
import { Card } from '../ui/Card';

type Props = {
  user: User;
  orders: Order[];
};

export function BadgeGrid({ user, orders }: Props) {
  const badges = computeBadges(user, orders);
  const unlocked = badges.filter((b) => b.unlocked);

  return (
    <Card className="badge-grid-card">
      <h3>🏆 Insignias</h3>
      <p className="hint">{unlocked.length} de {badges.length} desbloqueadas</p>
      <div className="badge-grid">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`badge-item ${b.unlocked ? 'unlocked' : 'locked'}`}
            title={b.description}
          >
            <span className="badge-icon">{b.unlocked ? b.icon : '🔒'}</span>
            <span className="badge-name">{b.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
