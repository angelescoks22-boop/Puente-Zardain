import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';
import { useAlertStore } from '../../store/alertStore';

type AdminReward = {
  id: string;
  name: string;
  description: string;
  zardasCost: number;
  icon: string;
  active: boolean;
};

export function AdminRewardsPage() {
  const fetcher = useCallback(() => adminApi.getRewards(), []);
  const statsFetcher = useCallback(() => adminApi.getRewardStats(), []);
  const { data: rewards, refresh } = useAdminPoll(fetcher, 30000);
  const { data: stats } = useAdminPoll(statsFetcher, 30000);
  const confirm = useAlertStore((s) => s.confirm);
  const [form, setForm] = useState({ name: '', description: '', zardasCost: 50, icon: '🎁' });
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const create = async () => {
    if (!form.name.trim()) {
      setFeedback({ type: 'error', message: 'Indica un nombre para la recompensa' });
      return;
    }
    try {
      await adminApi.saveReward({ ...form, active: true });
      setForm({ name: '', description: '', zardasCost: 50, icon: '🎁' });
      setFeedback({ type: 'ok', message: 'Recompensa creada correctamente' });
      refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Error al crear la recompensa' });
    }
  };

  const toggleActive = async (reward: AdminReward) => {
    try {
      const { id, ...data } = reward;
      await adminApi.saveReward({ ...data, active: !reward.active }, id);
      setFeedback({
        type: 'ok',
        message: reward.active ? `"${reward.name}" desactivada` : `"${reward.name}" activada`,
      });
      refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Error al actualizar la recompensa' });
    }
  };

  const handleDelete = async (reward: AdminReward) => {
    const confirmed = await confirm(
      `¿Seguro que quieres eliminar "${reward.name}"? Esta acción no se puede deshacer.`,
      'Eliminar recompensa',
    );
    if (!confirmed) return;

    setDeletingId(reward.id);
    setFeedback(null);
    try {
      await adminApi.deleteReward(reward.id);
      setFeedback({ type: 'ok', message: `"${reward.name}" eliminada correctamente` });
      refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Error al eliminar la recompensa' });
    } finally {
      setDeletingId(null);
    }
  };

  const list = (rewards ?? []) as AdminReward[];

  return (
    <div>
      <h2>💎 Sistema de Zardas</h2>

      {stats && (
        <div className="admin-grid admin-grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="value">{stats.activeRewards}</div>
            <div className="label">Recompensas activas</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.totalZardasInCirculation}</div>
            <div className="label">Zardas en circulación</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.avgZardasPerClient}</div>
            <div className="label">Media por cliente</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.cheapestReward || '—'}</div>
            <div className="label">Recompensa más barata (Zardas)</div>
          </div>
        </div>
      )}

      {feedback && (
        <p className={`form-message ${feedback.type === 'error' ? 'form-error' : ''}`}>
          {feedback.type === 'ok' ? '✅' : '❌'} {feedback.message}
        </p>
      )}

      <div className="stat-card" style={{ margin: '16px 0' }}>
        <h3>Nueva recompensa</h3>
        <div style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input" type="number" placeholder="Coste Zardas" value={form.zardasCost} onChange={(e) => setForm({ ...form, zardasCost: Number(e.target.value) })} />
          <button type="button" className="status-btn" onClick={create}>Crear</button>
        </div>
      </div>

      <div className="admin-grid admin-grid-3">
        {list.map((r) => (
          <div key={r.id} className="stat-card reward-admin-card">
            <span style={{ fontSize: '2rem' }}>{r.icon}</span>
            <h3>{r.name}</h3>
            <p>{r.description}</p>
            <strong>💎 {r.zardasCost}</strong>
            <p>{r.active ? '✅ Activa' : '❌ Inactiva'}</p>
            <button type="button" className="status-btn" onClick={() => toggleActive(r)}>
              {r.active ? 'Desactivar' : 'Activar'}
            </button>
            <button
              type="button"
              className="status-btn cancel-btn"
              disabled={deletingId === r.id}
              onClick={() => handleDelete(r)}
            >
              {deletingId === r.id ? 'Eliminando…' : '🗑️ Eliminar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
