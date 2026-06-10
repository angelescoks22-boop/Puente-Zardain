import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';
import { CATEGORY_LABELS, MENU_CATEGORIES } from '../../data/products';
import { useAlertStore } from '../../store/alertStore';

type ProductRow = Record<string, unknown>;

const emptyForm = { name: '', description: '', price: 0, category: 'hamburguesas', image: '🍔' };

export function AdminMenuPage() {
  const fetcher = useCallback(() => adminApi.getProducts(), []);
  const { data: products, refresh, error } = useAdminPoll(fetcher, 30000);
  const alert = useAlertStore((s) => s.alert);
  const confirm = useAlertStore((s) => s.confirm);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [showInactive, setShowInactive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const visibleProducts = products?.filter((p) => showInactive || p.active !== false) ?? [];

  const create = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    setFeedback('');
    try {
      await adminApi.saveProduct({ ...form, ingredients: [], active: true });
      setForm(emptyForm);
      setFeedback('✅ Producto creado');
      refresh();
    } catch (e) {
      void alert(e instanceof Error ? e.message : 'No se pudo crear', 'Error');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: ProductRow) => {
    setEditingId(p.id as string);
    setEditForm({
      name: String(p.name ?? ''),
      description: String(p.description ?? ''),
      price: Number(p.price ?? 0),
      category: String(p.category ?? 'hamburguesas'),
      image: String(p.image ?? '🍔'),
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setBusy(true);
    try {
      await adminApi.saveProduct({ ...editForm, ingredients: [], active: true }, editingId);
      setEditingId(null);
      setFeedback('✅ Producto actualizado');
      refresh();
    } catch (e) {
      void alert(e instanceof Error ? e.message : 'No se pudo guardar', 'Error');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (id: string, name: string) => {
    setBusy(true);
    try {
      await adminApi.deleteProduct(id, false);
      setFeedback(`"${name}" desactivado (no visible en carta)`);
      refresh();
    } catch (e) {
      void alert(e instanceof Error ? e.message : 'No se pudo desactivar', 'Error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    const ok = await confirm(
      `¿Eliminar "${name}" de la base de datos? Esta acción no se puede deshacer.`,
      'Eliminar producto',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await adminApi.deleteProduct(id, true);
      setFeedback(`"${name}" eliminado`);
      refresh();
    } catch (e) {
      void alert(e instanceof Error ? e.message : 'No se pudo eliminar', 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>🍔 Gestión de carta</h2>
      {error && <p className="admin-error-banner">⚠️ {error}</p>}
      {feedback && <p className="hint">{feedback}</p>}

      <div className="stat-card" style={{ margin: '16px 0' }}>
        <h3>Nuevo producto</h3>
        <div style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} />
          <input className="input" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={busy} />
          <input className="input" type="number" placeholder="Precio" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} disabled={busy} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={busy}>
            {MENU_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <button type="button" className="status-btn" onClick={create} disabled={busy}>Crear producto</button>
        </div>
      </div>

      <label className="hint" style={{ display: 'block', marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        {' '}Mostrar productos desactivados
      </label>

      <div className="admin-table">
        <table>
          <thead>
            <tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {visibleProducts.map((p) => (
              <tr key={p.id as string} style={p.active === false ? { opacity: 0.65 } : undefined}>
                {editingId === p.id ? (
                  <>
                    <td colSpan={5}>
                      <div style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
                        <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        <input className="input" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        <input className="input" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} />
                        <select className="input" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                          {MENU_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="status-btn" onClick={saveEdit}>Guardar</button>
                          <button type="button" className="status-btn" onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{p.image as string} {p.name as string}</td>
                    <td>{p.category as string}</td>
                    <td>{(p.price as number).toFixed(2)} €</td>
                    <td>{p.active === false ? '⏸ Inactivo' : '✅ Activo'}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="status-btn" disabled={busy} onClick={() => startEdit(p)}>Editar</button>
                      {p.active !== false && (
                        <button type="button" className="status-btn" disabled={busy} onClick={() => deactivate(p.id as string, String(p.name))}>
                          Desactivar
                        </button>
                      )}
                      <button type="button" className="status-btn cancel-btn" disabled={busy} onClick={() => remove(p.id as string, String(p.name))}>
                        🗑️ Eliminar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
