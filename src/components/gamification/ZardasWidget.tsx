import { useEffect, useState } from 'react';
import type { User, Reward } from '../../types';
import { Link } from 'react-router-dom';
import { getLevelInfo } from '../../utils/gamification';
import { getNextRewardProgress } from '../../utils/gamification';
import { getRewards } from '../../api/products';
import { ProgressBar } from '../ui/ProgressBar';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

type Props = { user: User };

export function ZardasWidget({ user }: Props) {
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    getRewards()
      .then(setRewards)
      .catch(() => setRewards([]));
  }, []);

  const { nextReward, remaining, progress } = getNextRewardProgress(user.zardas, rewards);
  const level = getLevelInfo(user.level);

  return (
    <Link to="/zardas" className="zardas-widget-link">
      <Card className="zardas-widget">
        <div className="zardas-top">
          <div>
            <Badge variant="level" style={{ background: level.color }}>
              {level.name}
            </Badge>
            <p className="zardas-count">💎 {user.zardas} Zardas</p>
          </div>
          {user.streak > 1 && (
            <span className="streak-badge">🔥 Racha: {user.streak} días</span>
          )}
        </div>
        {nextReward && remaining > 0 && (
          <ProgressBar
            value={progress}
            label={`Te faltan ${remaining} Zardas para tu próximo premio`}
          />
        )}
        <p className="hint zardas-widget-cta">Ver Zardas y recompensas →</p>
      </Card>
    </Link>
  );
}
