import { useCallback, useMemo, useState } from 'react';
import { adminApi, useAdminPoll, type AdminCustomer, type AdminOrder } from '../api/adminApi';

export function AdminCustomersPage() {
  const fetcher = useCallback(() => adminApi.getCustomers(), []);
  const { data: customers, refresh } = useAdminPoll(fetcher, 10000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ user: AdminCustomer & { email?: string; address?: string; streak?: number }; orders: AdminOrder[] } | null>(null);
  const [search, setSearch] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionError, setActionError] = useState('');

  const setStatus = async (id: string, clientStatus: string) => {
    setActionError('');
    try {
      await adminApi.updateCustomerStatus(id, clientStatus);
      refresh();
      if (selectedId === id) void loadDetail(id);
    } catch {
      setActionError('No se pudo actualizar el estado del cliente');
    }
  };

  const adjustZardas = async (id: string, delta: number) => {
    setActionError('');
    try {
      await adminApi.updateZardas(id, delta);
      refresh();
      if (selectedId === id) void loadDetail(id);
    } catch {
      setActionError('No se pudieron ajustar las Zardas');
    }
  };

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    setSelectedId(id);
    setActionError('');
    try {
      const data = await adminApi.getCustomerDetail(id);
      setDetail(data);
    } catch {
      setActionError('No se pudo cargar el detalle del cliente');
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers ?? [];
    return (customers ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.level.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const vip = [...(customers ?? [])].sort((a, b) => b.orderCount - a.orderCount).slice(0, 5);
  const problematic = customers?.filter((c) => ['problematic', 'blocked'].includes(c.clientStatus)) ?? [];

  return (
    <div>
      <h2>👥 Gestión de clientes</h2>

      {actionError && <p className="form-error">{actionError}</p>}

      <div className="admin-grid admin-grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="value">{customers?.length ?? 0}</div>
          <div className="label">Clientes registrados</div>
        </div>
        <div className="stat-card">
          <div className="value">{vip[0]?.name ?? '—'}</div>
          <div className="label">Top cliente ({vip[0]?.orderCount ?? 0} ped.)</div>
        </div>
        <div className="stat-card">
          <div className="value">{problematic.length}</div>
          <div className="label">A vigilar / bloqueados</div>
        </div>
        <div className="stat-card">
          <div className="value">
            {customers?.length
              ? Math.round((customers.reduce((s, c) => s + c.orderCount, 0) / customers.length) * 10) / 10
              : 0}
          </div>
          <div className="label">Pedidos medios / cliente</div>
        </div>
      </div>

      <input
        className="input admin-search"
        placeholder="Buscar por nombre, teléfono o nivel..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="admin-table" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Pedidos</th>
              <th>Nivel</th>
              <th>Zardas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className={c.orderCount >= 10 ? 'vip-row' : ''}>
                <td>{c.name}{c.orderCount >= 10 && ' 👑'}</td>
                <td>{c.phone}</td>
                <td>{c.orderCount}</td>
                <td>{c.level}</td>
                <td>{c.zardas}</td>
                <td><span className={`status-tag status-${c.clientStatus}`}>{c.clientStatus}</span></td>
                <td className="actions-cell">
                  <button type="button" className="status-btn" onClick={() => loadDetail(c.id)}>Ver ficha</button>
                  <button type="button" className="status-btn" onClick={() => setStatus(c.id, 'reliable')}>✓ Fiable</button>
                  <button type="button" className="status-btn" onClick={() => setStatus(c.id, 'blocked')}>🚫 Bloquear</button>
                  <button type="button" className="status-btn" onClick={() => adjustZardas(c.id, 10)}>+10 💎</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <div className="stat-card customer-detail-panel" style={{ marginTop: 16 }}>
          {loadingDetail || !detail ? (
            <p>Cargando ficha del cliente...</p>
          ) : (
            <>
              <div className="customer-detail-header">
                <div>
                  <h3>{detail.user.name}</h3>
                  <p>{detail.user.phone} · {detail.user.email ?? '—'}</p>
                  <p className="hint">
                    {detail.user.orderCount} pedidos · {detail.user.zardas} Zardas · Nivel {detail.user.level}
                    {detail.user.streak != null && detail.user.streak > 0 && ` · Racha ${detail.user.streak}🔥`}
                  </p>
                  {detail.user.address && <p>📍 {detail.user.address}</p>}
                </div>
                <button type="button" className="status-btn" onClick={() => { setSelectedId(null); setDetail(null); }}>
                  Cerrar
                </button>
              </div>

              <h4>📜 Historial de pedidos</h4>
              {detail.orders.length === 0 ? (
                <p className="hint">Sin pedidos</p>
              ) : (
                <ul className="customer-orders-list">
                  {detail.orders.map((o) => (
                    <li key={o.id}>
                      <strong>#{o.id.slice(-6).toUpperCase()}</strong>
                      <span>{new Date(o.createdAt).toLocaleDateString('es-ES')}</span>
                      <span>{o.total.toFixed(2)} €</span>
                      <span>{o.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
