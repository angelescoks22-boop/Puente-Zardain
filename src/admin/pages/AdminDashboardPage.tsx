import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, useAdminPoll, type DashboardData, BUSINESS_STATUS_LABELS } from '../api/adminApi';
import { onAdminDashboardUpdate } from '../hooks/useAdminSocket';
import { AdminQuickControls, SystemMonitorPanel, HourlyChart } from '../components/AdminControlPanels';

function AlertBanner({ alerts }: { alerts: DashboardData['alerts'] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="admin-alerts">
      {alerts.map((a) => (
        <div key={a.id} className={`admin-alert admin-alert--${a.severity}`}>
          <span>{a.type === 'delay' ? '🚨' : '⚠️'}</span>
          <span>{a.message}</span>
          {a.orderId && <Link to="/admin/orders" className="admin-alert-link">Ver pedidos</Link>}
        </div>
      ))}
    </div>
  );
}

function InsightCards({ insights }: { insights: DashboardData['insights'] }) {
  if (insights.length === 0) return null;
  return (
    <div className="admin-insights">
      <h3>🧠 Asistente inteligente</h3>
      <div className="admin-insights-grid">
        {insights.map((i) => (
          <div key={i.id} className={`insight-card insight-${i.tone}`}>
            <span className="insight-icon">{i.icon}</span>
            <p>{i.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyReportPanel({ report, lastReport }: {
  report?: DashboardData['todayReport'];
  lastReport?: DashboardData['lastDailyReport'];
}) {
  if (!report && !lastReport) return null;
  const r = report ?? lastReport;
  if (!r) return null;

  return (
    <div className="stat-card daily-report-card">
      <h3>📊 {report?.isLive ? 'Resumen del día (en vivo)' : `Informe ${r.date}`}</h3>
      <pre className="daily-report-text">{report?.summary ?? lastReport?.summary}</pre>
      <div className="daily-report-stats">
        <span>📦 {r.totalOrders} pedidos</span>
        <span>🍔 {r.topProduct}</span>
        <span>🕐 Pico: {r.peakHour}</span>
        <span>👤 +{r.newClients} nuevos</span>
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: DashboardData['dailySales'] }) {
  if (!data.length) return null;
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="stat-card">
      <h3>📈 Últimos 7 días</h3>
      <div className="daily-chart daily-chart--dual">
        {data.map((d) => (
          <div key={d._id} className="daily-bar-wrap">
            <div className="daily-bar-group">
              <div
                className="daily-bar daily-bar--orders"
                style={{ height: `${(d.orders / maxOrders) * 100}%` }}
                title={`${d.orders} pedidos`}
              />
              <div
                className="daily-bar daily-bar--revenue"
                style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                title={`${d.revenue.toFixed(2)} €`}
              />
            </div>
            <small>{d._id.slice(5)}</small>
            <span>{d.orders} ped.</span>
            <span className="daily-revenue">{d.revenue.toFixed(0)}€</span>
          </div>
        ))}
      </div>
      <p className="hint chart-legend">
        <span className="legend-orders">■ Pedidos</span>
        <span className="legend-revenue">■ Ingresos €</span>
      </p>
    </div>
  );
}

function BusinessHero({ data }: { data: DashboardData }) {
  const peak = data.ordersByHour?.reduce(
    (best, cur) => (cur.count > (best?.count ?? 0) ? cur : best),
    data.ordersByHour[0],
  );

  return (
    <div className="business-hero">
      <div className="business-hero-main">
        <span className="business-hero-label">Ingresos de hoy</span>
        <strong className="business-hero-value">{data.revenue.today.toFixed(2)} €</strong>
        <span className="business-hero-sub">{data.revenue.ordersToday} pedidos · ticket {data.revenue.avgTicket.toFixed(2)} €</span>
      </div>
      <div className="business-hero-stat">
        <span>🕐 Hora pico</span>
        <strong>{peak ? `${peak.hour} (${peak.count})` : '—'}</strong>
      </div>
      <div className="business-hero-stat">
        <span>📦 Activos</span>
        <strong>{data.live.activeOrders}</strong>
      </div>
      <div className="business-hero-stat">
        <span>💬 Chats</span>
        <strong>{data.live.unreadChats}</strong>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const fetcher = useCallback(() => adminApi.getDashboard(), []);
  const { data, refresh } = useAdminPoll(fetcher, 5000);

  useEffect(() => onAdminDashboardUpdate(() => { void refresh(); }), [refresh]);

  if (!data) return <p>Cargando centro de control...</p>;

  const statusClass = data.live.businessStatus === 'open'
    ? 'stat-open'
    : data.live.businessStatus === 'saturated'
      ? 'stat-saturated'
      : 'stat-closed';

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>🖥️ Centro de control en vivo</h2>
        <small className="hint">Actualizado: {new Date(data.updatedAt).toLocaleTimeString('es-ES')} · 🤖 Modo automático</small>
      </div>

      <AlertBanner alerts={data.alerts} />

      <BusinessHero data={data} />

      <AdminQuickControls
        businessStatus={data.live.businessStatus}
        prepTime={data.live.prepTimeTarget}
        effectivePrep={data.live.effectivePrepMinutes}
        onUpdate={refresh}
      />

      <div className="admin-grid admin-grid-4 dashboard-stats">
        <div className="stat-card stat-live">
          <div className="value">{data.live.activeOrders}</div>
          <div className="label">Pedidos activos</div>
        </div>
        <div className="stat-card stat-live">
          <div className="value">{data.live.queueCount}</div>
          <div className="label">En cola (cocina)</div>
        </div>
        <div className="stat-card stat-live">
          <div className="value">{data.live.avgPrepMinutes} min</div>
          <div className="label">Media prep. (obj. {data.live.prepTimeTarget} · efectivo {data.live.effectivePrepMinutes})</div>
        </div>
        <div className={`stat-card stat-live ${statusClass}`}>
          <div className="value">{BUSINESS_STATUS_LABELS[data.live.businessStatus]}</div>
          <div className="label">{data.live.ordersOpen ? 'Aceptando pedidos' : 'Pedidos pausados'}</div>
        </div>
      </div>

      <div className="admin-grid admin-grid-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="value">{data.live.unreadChats}</div>
          <div className="label">Chats pendientes · <Link to="/admin/chat">Ir al chat</Link></div>
        </div>
        <div className="stat-card">
          <div className="value">{data.vipClients[0]?.name ?? '—'}</div>
          <div className="label">Cliente top ({data.vipClients[0]?.orderCount ?? 0} pedidos)</div>
        </div>
        <div className="stat-card">
          <div className="value"><Link to="/admin/analytics">Ver analíticas →</Link></div>
          <div className="label">Informe semanal completo</div>
        </div>
      </div>

      <InsightCards insights={data.insights} />

      <div className="admin-grid admin-grid-2" style={{ marginTop: 16 }}>
        <DailyReportPanel report={data.todayReport} lastReport={data.lastDailyReport} />
        <SystemMonitorPanel />
      </div>

      <div className="admin-grid admin-grid-2" style={{ marginTop: 16 }}>
        <DailyChart data={data.dailySales} />
        <HourlyChart data={data.ordersByHour ?? []} />
      </div>

      <div className="admin-grid admin-grid-2" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <h3>👑 Clientes VIP</h3>
          <ul className="vip-list">
            {data.vipClients.map((c, i) => (
              <li key={c.id}>
                <span className="vip-rank">#{i + 1}</span>
                <strong>{c.name}</strong>
                <span>{c.orderCount} pedidos · {c.level}</span>
              </li>
            ))}
          </ul>
          <Link to="/admin/customers">Ver todos →</Link>
        </div>

        {data.problematicClients.length > 0 && (
          <div className="stat-card stat-warning">
            <h3>🚫 Clientes a vigilar</h3>
            <ul className="problem-list">
              {data.problematicClients.map((c) => (
                <li key={c.id}>
                  <strong>{c.name}</strong>
                  <span>{c.clientStatus} · {c.orderCount} ped.</span>
                </li>
              ))}
            </ul>
            <Link to="/admin/customers">Gestionar →</Link>
          </div>
        )}
      </div>

      <div className="dashboard-quick-links">
        <Link to="/admin/orders" className="quick-link">📦 Pedidos activos</Link>
        <Link to="/admin/kitchen" className="quick-link">🍳 Cocina</Link>
        <Link to="/admin/map" className="quick-link">📍 Mapa reparto</Link>
        <Link to="/admin/settings" className="quick-link">🤖 Automatización</Link>
      </div>
    </div>
  );
}
