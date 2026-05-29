import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';

export function AdminMessagesPage() {
  const fetcher = useCallback(() => adminApi.getMessages(), []);
  const { data: messages, refresh } = useAdminPoll(fetcher, 10000);
  const [text, setText] = useState('');
  const [type, setType] = useState('info');

  const create = async () => {
    await adminApi.createMessage({ text, type, active: true });
    setText('');
    refresh();
  };

  const toggle = async (id: string, active: boolean) => {
    await adminApi.updateMessage(id, { active: !active });
    refresh();
  };

  return (
    <div>
      <h2>📢 Mensajes a clientes</h2>
      <div className="stat-card" style={{ margin: '16px 0' }}>
        <textarea className="input textarea" placeholder="Ej: 🔥 Mucho movimiento hoy" value={text} onChange={(e) => setText(e.target.value)} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} style={{ marginTop: 8 }}>
          <option value="info">Info</option>
          <option value="warning">Aviso</option>
          <option value="promo">Promo</option>
        </select>
        <button type="button" className="status-btn" style={{ marginTop: 8 }} onClick={create}>Publicar</button>
      </div>
      {messages?.map((m) => (
        <div key={m.id} className="stat-card" style={{ marginBottom: 8 }}>
          <p>{m.text}</p>
          <small>{m.type} · {m.active ? 'Activo' : 'Inactivo'}</small>
          <button type="button" className="status-btn" onClick={() => toggle(m.id, m.active)}>
            {m.active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ))}
    </div>
  );
}
