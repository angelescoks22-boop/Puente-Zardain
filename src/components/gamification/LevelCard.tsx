import type { UserLevel } from '../../types';
import { getLevelInfo, getLevelProgress } from '../../utils/gamification';
import { ProgressBar } from '../ui/ProgressBar';
import { Card } from '../ui/Card';

type Props = {
  level: UserLevel;
  orderCount: number;
};

export function LevelCard({ level, orderCount }: Props) {
  const info = getLevelInfo(level);
  const { progress, nextLevel } = getLevelProgress(orderCount);
  const nextInfo = nextLevel ? getLevelInfo(nextLevel) : null;

  return (
    <Card className="level-card">
      <div className="level-header" style={{ borderColor: info.color }}>
        <span className="level-icon" style={{ color: info.color }}>🏆</span>
        <div>
          <h3 style={{ color: info.color }}>{info.name}</h3>
          <p>{orderCount} pedidos completados</p>
        </div>
      </div>
      {nextInfo && (
        <ProgressBar
          value={progress}
          label={`Progreso hacia ${nextInfo.name}`}
          color={info.color}
          showValue
        />
      )}
      <ul className="level-benefits">
        {info.benefits.map((b) => (
          <li key={b}>✓ {b}</li>
        ))}
      </ul>
    </Card>
  );
}
