import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll, type AdminOrder } from '../api/adminApi';

export function AdminHistoryPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetcher = useCallback(
    () => adminApi.getOrders({ from: from || undefined, to: to || undefined }),
    [from, to],
  );
  const { data: orders, loading } = useAdminPoll(fetcher, 15000);

  const filtered = orders?.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter,
  ) ?? [];

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <h2>🧾 Historial global de pedidos</h2>

      <div className="history-filters stat-card">
        <label>
          Desde
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          Estado
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="delivered">Entregados</option>
            <option value="cancelled">Cancelados</option>
            <option value="pending">Pendientes</option>
          </select>
        </label>
        <div className="history-summary">
          <strong>{filtered.length}</strong> pedidos · <strong>{totalRevenue.toFixed(2)} €</strong>
        </div>
      </div>

      <div className="admin-table" style={{ marginTop: 16 }}>
        {loading && !orders && <p>Cargando...</p>}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o: AdminOrder) => (
              <tr key={o.id}>
                <td>#{o.id.slice(-6)}</td>
                <td>{o.clientName}</td>
                <td>{o.total.toFixed(2)} €</td>
                <td>{o.type === 'pickup' ? 'Recogida' : 'Entrega'}</td>
                <td><span className={`status-tag status-${o.status}`}>{o.status}</span></td>
                <td>{new Date(o.createdAt).toLocaleString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
