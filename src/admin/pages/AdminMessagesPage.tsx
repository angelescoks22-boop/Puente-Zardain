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
  const [bulkText, setBulkText] = useState('');
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

  const createBulk = async () => {
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      void alert('Escribe al menos un mensaje (uno por línea).', 'Sin mensajes');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      const created = await adminApi.createMessages(
        lines.map((line) => ({ text: line, type, active: true })),
      );
      setBulkText('');
      setFeedback(`✅ ${created.length} mensaje${created.length !== 1 ? 's' : ''} publicados`);
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
        Aparecen en la franja superior de la web (todas las páginas). Puedes tener <strong>varios mensajes activos</strong> a la vez.
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
          {busy ? 'Publicando…' : 'Publicar mensaje'}
        </button>
      </div>

      <div className="stat-card" style={{ margin: '16px 0' }}>
        <h3>Varios mensajes a la vez</h3>
        <p className="hint">Escribe un mensaje por línea. Todos se publicarán activos con el mismo tipo.</p>
        <textarea
          className="input textarea"
          placeholder={'🎉 Promo del día\n⏱️ Tiempo de espera ~25 min\n🚚 Reparto solo en Arroyomolinos'}
          value={bulkText}
          rows={5}
          disabled={busy}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <button
          type="button"
          className="status-btn"
          style={{ marginTop: 8 }}
          disabled={busy || !bulkText.trim()}
          onClick={createBulk}
        >
          {busy ? 'Publicando…' : 'Publicar todos'}
        </button>
      </div>

      <p className="hint">{activeCount > 0 ? `${activeCount} mensaje${activeCount !== 1 ? 's' : ''} activo${activeCount !== 1 ? 's' : ''} ahora` : 'Ningún mensaje activo'}</p>

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
