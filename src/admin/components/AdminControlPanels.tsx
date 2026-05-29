import { useCallback, useState } from 'react';
import { adminApi, type BusinessStatus, BUSINESS_STATUS_LABELS } from '../api/adminApi';
import { onAdminDashboardUpdate } from '../hooks/useAdminSocket';
import { useEffect } from 'react';

type Props = {
  businessStatus?: BusinessStatus;
  prepTime?: number;
  effectivePrep?: number;
  onUpdate: () => void;
};

export function AdminQuickControls({ businessStatus = 'open', prepTime = 15, effectivePrep, onUpdate }: Props) {
  const [prep, setPrep] = useState(prepTime);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPrep(prepTime), [prepTime]);

  const setStatus = async (status: BusinessStatus) => {
    setBusy(true);
    try {
      await adminApi.setBusinessStatus(status);
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  const savePrep = async () => {
    setBusy(true);
    try {
      await adminApi.setPrepTime(prep);
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  const togglePromo = async () => {
    setBusy(true);
    try {
      await adminApi.togglePromo();
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  const runJobs = async () => {
    setBusy(true);
    try {
      await adminApi.runJobs();
      onUpdate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="quick-controls">
      <h3>⚡ Control rápido</h3>
      <div className="quick-controls-row">
        <span className="quick-status-label">Estado: {BUSINESS_STATUS_LABELS[businessStatus]}</span>
        {(['open', 'saturated', 'closed'] as BusinessStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`status-btn quick-status-btn ${businessStatus === s ? 'current' : ''}`}
            disabled={busy || businessStatus === s}
            onClick={() => setStatus(s)}
          >
            {BUSINESS_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="quick-controls-row">
        <label className="prep-control">
          Tiempo base (min)
          <input
            className="input prep-input"
            type="number"
            min={5}
            max={120}
            value={prep}
            onChange={(e) => setPrep(Number(e.target.value))}
          />
        </label>
        <button type="button" className="status-btn" disabled={busy} onClick={savePrep}>
          Aplicar tiempo
        </button>
        {effectivePrep !== undefined && effectivePrep !== prepTime && (
          <span className="hint">Cliente ve ~{effectivePrep} min (ajustado por carga)</span>
        )}
      </div>

      <div className="quick-controls-row">
        <button type="button" className="status-btn" disabled={busy} onClick={togglePromo}>
          🎟️ Activar/desactivar promo
        </button>
        <button type="button" className="status-btn" disabled={busy} onClick={runJobs}>
          🔄 Ejecutar jobs
        </button>
      </div>
    </div>
  );
}

export function SystemMonitorPanel() {
  const fetchHealth = useCallback(() => adminApi.getSystemHealth(), []);
  const fetchLogs = useCallback(() => adminApi.getSystemLogs(15), []);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof adminApi.getSystemHealth>> | null>(null);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof adminApi.getSystemLogs>>>([]);

  const refresh = useCallback(async () => {
    const [h, l] = await Promise.all([fetchHealth(), fetchLogs()]);
    setHealth(h);
    setLogs(l);
  }, [fetchHealth, fetchLogs]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => onAdminDashboardUpdate(() => { void refresh(); }), [refresh]);

  if (!health) return null;

  return (
    <div className="stat-card system-monitor">
      <h3>📡 Monitor del sistema</h3>
      <div className="system-services">
        <span className={`sys-badge ${health.ok ? 'sys-ok' : 'sys-fail'}`}>
          API {health.ok ? '✓' : '✗'}
        </span>
        <span className={`sys-badge ${health.services.database === 'connected' ? 'sys-ok' : 'sys-fail'}`}>
          DB {health.services.database}
        </span>
        <span className="sys-badge sys-ok">Chat {health.services.chat}</span>
        <span className="sys-badge sys-ok">Socket activo</span>
      </div>
      <p className="hint">Pedidos activos monitorizados: {health.metrics.activeOrders}</p>

      {logs.length > 0 && (
        <div className="system-logs">
          <h4>⚠️ Logs recientes</h4>
          <ul>
            {logs.slice(0, 8).map((log) => (
              <li key={log.id} className={`log-${log.level}`}>
                <time>{new Date(log.createdAt).toLocaleTimeString('es-ES')}</time>
                <span>{log.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: string; count: number }[] }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="stat-card">
      <h3>🕐 Pedidos por hora (hoy)</h3>
      <div className="hourly-chart">
        {data.map((d) => (
          <div key={d.hour} className="hourly-bar-wrap">
            <div className="hourly-bar" style={{ height: `${(d.count / max) * 100}%` }} title={`${d.count} pedidos`} />
            <small>{d.hour}</small>
            <span>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { HourlyChart };

