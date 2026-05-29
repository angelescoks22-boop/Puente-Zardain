import { useCallback } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';

export function AdminAnalyticsPage() {
  const fetcher = useCallback(() => adminApi.getAnalytics(), []);
  const { data: a } = useAdminPoll(fetcher, 30000);

  if (!a) return <p>Cargando analíticas...</p>;

  return (
    <div>
      <h2>📊 Analíticas</h2>

      <div className="admin-grid admin-grid-3" style={{ margin: '20px 0' }}>
        <div className="stat-card">
          <div className="value">{a.sales.today.toFixed(0)} €</div>
          <div className="label">Ventas hoy ({a.sales.ordersToday} pedidos)</div>
        </div>
        <div className="stat-card">
          <div className="value">{a.sales.week.toFixed(0)} €</div>
          <div className="label">Ventas semana ({a.sales.ordersWeek} pedidos)</div>
        </div>
        <div className="stat-card">
          <div className="value">{a.predictions.estimatedDailyOrders}</div>
          <div className="label">Predicción pedidos/día</div>
        </div>
      </div>

      <div className="admin-grid admin-grid-2">
        <div className="stat-card">
          <h3>🍔 Más vendidos</h3>
          <ul>{a.topProducts.map((p) => <li key={p._id}>{p._id}: {p.total} uds ({p.revenue.toFixed(0)}€)</li>)}</ul>
        </div>
        <div className="stat-card">
          <h3>📉 Menos vendidos</h3>
          <ul>{a.leastProducts.map((p) => <li key={p._id}>{p._id}: {p.total} uds</li>)}</ul>
        </div>
        <div className="stat-card">
          <h3>⏰ Horas pico</h3>
          <ul>{a.peakHours.map((h) => <li key={h.hour}>{h.hour}: {h.count} pedidos</li>)}</ul>
        </div>
        <div className="stat-card">
          <h3>👥 Clientes</h3>
          <p>Nuevos (7d): {a.clients.new}</p>
          <p>Recurrentes: {a.clients.recurring}</p>
          <p>Total: {a.clients.total}</p>
          <p>🔮 Más demandado: {a.predictions.topDemand}</p>
        </div>
      </div>
    </div>
  );
}
