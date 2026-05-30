import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, useAdminPoll, type AdminOrder, type OrderTimelineEntry } from '../api/adminApi';
import { useAlertStore } from '../../store/alertStore';
import { DeliveryAddressDisplay } from '../../components/address/DeliveryAddressDisplay';
import { ORDER_DATE_FILTERS, getOrderDateRange, type OrderDateFilter } from '../../utils/dateFilters';
import { formatDurationMinutes } from '../../utils/format';

const STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'on_the_way', 'delivered'] as const;

const STATUS_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'accepted', label: 'Aceptados' },
  { id: 'preparing', label: 'Preparando' },
  { id: 'ready', label: 'Listos' },
  { id: 'on_the_way', label: 'En camino' },
  { id: 'delivered', label: 'Entregados' },
] as const;

function getQuickNextStatus(order: AdminOrder): string | null {
  switch (order.status) {
    case 'pending': return 'accepted';
    case 'accepted': return 'preparing';
    case 'preparing': return 'ready';
    case 'ready': return order.type === 'delivery' ? 'on_the_way' : 'delivered';
    case 'on_the_way': return 'delivered';
    default: return null;
  }
}

function sortOrders(list: AdminOrder[]) {
  const priority = (o: AdminOrder) => {
    if (o.isDelayed) return 0;
    if (o.status === 'pending') return 1;
    if (o.status === 'accepted') return 2;
    if (o.status === 'preparing') return 3;
    if (o.status === 'ready') return 4;
    if (o.status === 'on_the_way') return 5;
    return 6;
  };
  return [...list].sort((a, b) => {
    const p = priority(a) - priority(b);
    if (p !== 0) return p;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  preparing: 'Preparando',
  ready: 'Listo',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function OrderTimeline({ orderId }: { orderId: string }) {
  const [entries, setEntries] = useState<OrderTimelineEntry[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const data = await adminApi.getOrderTimeline(orderId);
    setEntries(data);
    setOpen(true);
  };

  if (!open) {
    return (
      <button type="button" className="status-btn timeline-btn" onClick={load}>
        📋 Trazabilidad
      </button>
    );
  }

  return (
    <div className="order-timeline">
      <h4>🔄 Historial de estados</h4>
      {entries.length === 0 && <p className="hint">Sin cambios registrados aún</p>}
      <ul>
        {entries.map((e) => (
          <li key={e.id}>
            <time>{new Date(e.createdAt).toLocaleString('es-ES')}</time>
            <span>
              {STATUS_LABELS[e.fromStatus] ?? e.fromStatus} → <strong>{STATUS_LABELS[e.toStatus] ?? e.toStatus}</strong>
            </span>
            <small>por {e.changedByName}{e.reason ? ` · ${e.reason}` : ''}</small>
          </li>
        ))}
      </ul>
      <button type="button" className="status-btn" onClick={() => setOpen(false)}>Ocultar</button>
    </div>
  );
}

function CancelModal({ order, onClose, onDone }: { order: AdminOrder; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Indica el motivo de cancelación');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminApi.cancelOrder(order.id, reason.trim());
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>🚫 Cancelar pedido #{order.id.slice(-6).toUpperCase()}</h3>
        <p className="hint">Solo pedidos pendientes pueden cancelarse.</p>
        <textarea
          className="input"
          rows={3}
          placeholder="Motivo de cancelación (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="status-btn" onClick={onClose}>Cerrar</button>
          <button type="button" className="status-btn cancel-btn" disabled={loading} onClick={submit}>
            {loading ? 'Cancelando…' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onUpdate }: { order: AdminOrder; onUpdate: () => void }) {
  const [notes, setNotes] = useState(order.internalNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const alert = useAlertStore((s) => s.alert);

  useEffect(() => {
    setNotes(order.internalNotes ?? '');
  }, [order.internalNotes]);

  const canCancel = order.status === 'pending';
  const isBlockedCancel = ['preparing', 'ready', 'on_the_way'].includes(order.status);

  const printTicket = async () => {
    const ticket = await adminApi.getTicket(order.id);
    const text = `
=== PUENTE ZARDAIN ===
Pedido #${ticket.id}
${ticket.time}
Cliente: ${ticket.client}
Tel: ${order.clientPhone}
${ticket.address}
---
${ticket.items.join('\n')}
---
TOTAL: ${ticket.total.toFixed(2)} €
Pago: ${order.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
Estado: ${STATUS_LABELS[order.status]}
${notes ? `NOTA: ${notes}` : ''}
======================
    `.trim();
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<pre style="font-family:monospace;padding:20px">${text}</pre>`);
      w.print();
    }
  };

  const changeStatus = async (status: string) => {
    try {
      await adminApi.updateOrderStatus(order.id, status);
      onUpdate();
    } catch (e) {
      await alert(e instanceof Error ? e.message : 'Error al cambiar estado', 'Error');
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await adminApi.updateOrderNotes(order.id, notes);
    setSavingNotes(false);
    onUpdate();
  };

  const nextStatus = getQuickNextStatus(order);

  return (
    <>
      <div className={`order-card-admin status-${order.status} ${order.isDelayed ? 'order-delayed' : ''}`}>
        <div className="order-card-header">
          <div>
            <span className="order-id">#{order.id.slice(-6).toUpperCase()}</span>
            <div className="order-time">
              {new Date(order.createdAt).toLocaleString('es-ES')}
              {order.elapsedMinutes !== undefined && (
                <span className="order-elapsed"> · {formatDurationMinutes(order.elapsedMinutes)}</span>
              )}
            </div>
          </div>
          <div className="order-badges">
            {order.isDelayed && <span className="delay-badge">🚨 Retraso</span>}
            <strong>{STATUS_LABELS[order.status]}</strong>
          </div>
        </div>

        <p><strong>{order.clientName}</strong> · {order.clientPhone}</p>
        {order.address && (
          <div className="admin-delivery-address">
            <span className="admin-address-icon">📍</span>
            <DeliveryAddressDisplay address={order.address} deliveryAddress={order.deliveryAddress} />
          </div>
        )}
        <p>{order.type === 'pickup' ? '🏪 Recogida' : '🛵 Entrega'} · {order.paymentMethod === 'cash' ? '💵' : '💳'}</p>
        {order.paymentMethod === 'cash' && order.cashChange != null && order.cashPaidAmount != null && (
          <p className="cash-change-admin">
            💶 Paga con {order.cashPaidAmount.toFixed(2)}€ · Cambio: {order.cashChange.toFixed(2)}€
          </p>
        )}
        {order.cancelReason && <p className="cancel-reason">Motivo cancelación: {order.cancelReason}</p>}

        <ul className="order-items-list">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.quantity}x {item.productName}
              {item.removedIngredients.length > 0 && (
                <span className="order-mod"> Sin: {item.removedIngredients.join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
        <strong>{order.total.toFixed(2)} €</strong>

        <div className="internal-notes">
          <label>🧑‍🍳 Nota interna (solo equipo)</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: cliente exigente, cuidado con alergias..."
          />
          <button type="button" className="status-btn" onClick={saveNotes} disabled={savingNotes}>
            {savingNotes ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>

        <OrderTimeline orderId={order.id} />

        {nextStatus && (
          <button
            type="button"
            className="status-btn quick-next-btn"
            onClick={() => changeStatus(nextStatus)}
          >
            ⚡ {STATUS_LABELS[nextStatus]} (rápido)
          </button>
        )}

        <div className="status-buttons">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-btn ${order.status === s ? 'current' : ''}`}
              onClick={() => changeStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          {canCancel && (
            <button type="button" className="status-btn cancel-btn" onClick={() => setShowCancel(true)}>
              🚫 Cancelar
            </button>
          )}
          {isBlockedCancel && (
            <span className="hint cancel-blocked">Cancelación bloqueada (en preparación o posterior)</span>
          )}
          <Link to={`/admin/chat?orderId=${order.id}`} className="status-btn">💬 Chat</Link>
          <button type="button" className="status-btn" onClick={printTicket}>🧾 Imprimir</button>
          <button type="button" className="status-btn" onClick={() => adminApi.downloadTicket(order.id)}>⬇️ Ticket</button>
        </div>
      </div>

      {showCancel && (
        <CancelModal order={order} onClose={() => setShowCancel(false)} onDone={onUpdate} />
      )}
    </>
  );
}

export function AdminOrdersPage() {
  const [dateFilter, setDateFilter] = useState<OrderDateFilter>('today');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetcher = useCallback(() => {
    const range = getOrderDateRange(dateFilter);
    return adminApi.getOrders({
      active: showActiveOnly || undefined,
      from: range.from,
      to: range.to,
      date: dateFilter !== 'all' && !range.from ? dateFilter : undefined,
    });
  }, [dateFilter, showActiveOnly]);

  const { data: orders, refresh, error } = useAdminPoll(fetcher, 4000);
  const { data: queue } = useAdminPoll(useCallback(() => adminApi.getQueue(), []), 4000);

  const stats = useMemo(() => {
    const list = orders ?? [];
    const completed = list.filter((o) => o.status !== 'cancelled');
    return {
      count: list.length,
      total: completed.reduce((sum, o) => sum + o.total, 0),
      active: list.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
      delayed: list.filter((o) => o.isDelayed).length,
    };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    let list = orders ?? [];
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    return sortOrders(list);
  }, [orders, statusFilter]);

  return (
    <div>
      <h2>📦 Pedidos</h2>

      {error && <p className="admin-error-banner">⚠️ {error}</p>}

      <div className="admin-filter-bar">
        {ORDER_DATE_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`filter-chip ${dateFilter === id ? 'active' : ''}`}
            onClick={() => setDateFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-filter-bar">
        {STATUS_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`filter-chip ${statusFilter === id ? 'active' : ''}`}
            onClick={() => setStatusFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="admin-toggle-row">
        <input
          type="checkbox"
          checked={showActiveOnly}
          onChange={(e) => setShowActiveOnly(e.target.checked)}
        />
        Solo pedidos activos (en curso)
      </label>

      <div className="admin-grid admin-grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="value">{stats.count}</div>
          <div className="label">Pedidos en el periodo</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.total.toFixed(2)} €</div>
          <div className="label">Total generado</div>
        </div>
        <div className="stat-card">
          <div className="value">{queue?.count ?? stats.active}</div>
          <div className="label">Activos en cola</div>
        </div>
        <div className="stat-card">
          <div className="value">~{queue?.estimatedMinutes ?? 0} min</div>
          <div className="label">Tiempo estimado</div>
        </div>
      </div>

      <div className="admin-grid">
        {visibleOrders.length === 0 && <p>No hay pedidos para este filtro</p>}
        {visibleOrders.map((order) => (
          <OrderCard key={order.id} order={order} onUpdate={refresh} />
        ))}
      </div>
    </div>
  );
}
