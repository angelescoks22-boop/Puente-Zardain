import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';
import { useAlertStore } from '../../store/alertStore';

const TYPE_LABELS: Record<string, string> = {
  info: 'ℹ️ Info',
  warning: '⚠️ Aviso',
  promo: '🎟️ Promo',
};

export function AdminMessagesPage() {
  const fetcher = useCallback(() => adminApi.getMessages(), []);
  const { data: messages, refresh } = useAdminPoll(fetcher, 10000);
  const alert = useAlertStore((s) => s.alert);
  const confirm = useAlertStore((s) => s.confirm);

  const [text, setText] = useState('');
  const [type, setType] = useState('info');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const create = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      void alert('Escribe el texto del mensaje antes de publicar.', 'Mensaje vacío');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      await adminApi.createMessage({ text: trimmed, type, active: true });
      setText('');
      setFeedback('✅ Mensaje publicado — los clientes lo verán al instante');
      refresh();
    } catch (e) {
      void alert(e instanceof Error ? e.message : 'No se pudo publicar', 'Error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, currentlyActive: boolean) => {
    setBusy(true);
    setFeedback('');
    try {
      await adminApi.updateMessage(id, { active: !currentlyActive });
      setFeedback(currentlyActive ? 'Mensaje desactivado' : 'Mensaje activado en la web');
      refresh();
    } catch (e) {
      void alert(e instanceof Error ? e.message : 'No se pudo actualizar', 'Error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, label: string) => {
    const ok = await confirm(`¿Eliminar "${label.slice(0, 40)}${label.length > 40 ? '…' : ''}"?`, 'Eliminar mensaje');
    if (!ok) return;
    setBusy(true);
    try {
      await adminApi.deleteMessage(id);
      setFeedback('Mensaje eliminado');
      refresh();
    } catch (e) {
      void alert(e instanceof Error ? e.message : 'No se pudo eliminar', 'Error');
    } finally {
      setBusy(false);
    }
  };

  const activeCount = messages?.filter((m) => m.active).length ?? 0;

  return (
    <div>
      <h2>📢 Mensajes a clientes</h2>
      <p className="hint">
        Aparecen en la franja superior de la web (todas las páginas). Solo puede haber <strong>un mensaje activo</strong> a la vez.
      </p>

      {feedback && <p className="hint">{feedback}</p>}

      <div className="stat-card" style={{ margin: '16px 0' }}>
        <h3>Nuevo mensaje</h3>
        <textarea
          className="input textarea"
          placeholder="Ej: 🔥 Mucho movimiento hoy — gracias por tu paciencia"
          value={text}
          rows={3}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
        />
        <select
          className="input"
          value={type}
          disabled={busy}
          onChange={(e) => setType(e.target.value)}
          style={{ marginTop: 8 }}
        >
          <option value="info">ℹ️ Info</option>
          <option value="warning">⚠️ Aviso</option>
          <option value="promo">🎟️ Promo</option>
        </select>
        <button
          type="button"
          className="status-btn"
          style={{ marginTop: 8 }}
          disabled={busy || !text.trim()}
          onClick={create}
        >
          {busy ? 'Publicando…' : 'Publicar y activar'}
        </button>
      </div>

      <p className="hint">{activeCount > 0 ? `Activo ahora: ${activeCount}` : 'Ningún mensaje activo'}</p>

      {messages?.length === 0 && <p className="hint">No hay mensajes creados.</p>}

      {messages?.map((m) => (
        <div
          key={m.id}
          className={`stat-card ${m.active ? 'review-featured' : ''}`}
          style={{ marginBottom: 8 }}
        >
          <p>{m.text}</p>
          <small>
            {TYPE_LABELS[m.type] ?? m.type}
            {' · '}
            {m.active ? '✅ Visible en la web' : '⏸ Inactivo'}
          </small>
          <div className="review-admin-actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="status-btn"
              disabled={busy}
              onClick={() => toggle(m.id, m.active)}
            >
              {m.active ? 'Desactivar' : 'Activar en web'}
            </button>
            <button
              type="button"
              className="status-btn cancel-btn"
              disabled={busy}
              onClick={() => remove(m.id, m.text)}
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
