import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';
import { CATEGORY_LABELS, MENU_CATEGORIES } from '../../data/products';

type ProductRow = Record<string, unknown>;

const emptyForm = { name: '', description: '', price: 0, category: 'hamburguesas', image: '🍔' };

export function AdminMenuPage() {
  const fetcher = useCallback(() => adminApi.getProducts(), []);
  const { data: products, refresh, error } = useAdminPoll(fetcher, 30000);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const create = async () => {
    if (!form.name.trim()) return;
    await adminApi.saveProduct({ ...form, ingredients: [], active: true });
    setForm(emptyForm);
    refresh();
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
    await adminApi.saveProduct({ ...editForm, ingredients: [], active: true }, editingId);
    setEditingId(null);
    refresh();
  };

  const remove = async (id: string) => {
    await adminApi.deleteProduct(id);
    refresh();
  };

  return (
    <div>
      <h2>🍔 Gestión de carta</h2>
      {error && <p className="admin-error-banner">⚠️ {error}</p>}

      <div className="stat-card" style={{ margin: '16px 0' }}>
        <h3>Nuevo producto</h3>
        <div style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input" type="number" placeholder="Precio" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {MENU_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <button type="button" className="status-btn" onClick={create}>Crear producto</button>
        </div>
      </div>

      <div className="admin-table">
        <table>
          <thead>
            <tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id as string}>
                {editingId === p.id ? (
                  <>
                    <td colSpan={4}>
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
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="status-btn" onClick={() => startEdit(p)}>Editar</button>
                      <button type="button" className="status-btn" onClick={() => remove(p.id as string)}>Desactivar</button>
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
