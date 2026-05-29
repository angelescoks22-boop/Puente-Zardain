import { Card } from '../ui/Card';
import { formatPrice } from '../../utils/format';
import type { WeeklySummary } from '../../utils/weeklySummary';

type Props = {
  summary: WeeklySummary;
};

export function WeeklySummaryCard({ summary }: Props) {
  return (
    <Card className="weekly-summary-card">
      <h3>📊 Tu semana en Zardain</h3>
      <div className="weekly-stats">
        <div className="weekly-stat">
          <span className="weekly-value">{summary.orderCount}</span>
          <span className="weekly-label">Pedidos</span>
        </div>
        <div className="weekly-stat">
          <span className="weekly-value">{formatPrice(summary.totalSpent)}</span>
          <span className="weekly-label">Gastado</span>
        </div>
        <div className="weekly-stat">
          <span className="weekly-value">+{summary.zardasEarned}</span>
          <span className="weekly-label">Zardas</span>
        </div>
      </div>
      <p className="weekly-favorite">
        🍔 Favorito de la semana: <strong>{summary.favoriteProduct}</strong>
        {summary.favoriteProductCount > 0 && ` (${summary.favoriteProductCount}x)`}
      </p>
    </Card>
  );
}
