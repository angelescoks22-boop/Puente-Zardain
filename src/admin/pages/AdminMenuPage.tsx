import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll } from '../api/adminApi';
import { CATEGORY_LABELS, MENU_CATEGORIES } from '../../data/products';

export function AdminMenuPage() {
  const fetcher = useCallback(() => adminApi.getProducts(), []);
  const { data: products, refresh } = useAdminPoll(fetcher, 30000);
  const [form, setForm] = useState({ name: '', description: '', price: 0, category: 'hamburguesas', image: '🍔' });

  const create = async () => {
    await adminApi.saveProduct({ ...form, ingredients: [], active: true });
    setForm({ name: '', description: '', price: 0, category: 'hamburguesas', image: '🍔' });
    refresh();
  };

  const remove = async (id: string) => {
    await adminApi.deleteProduct(id);
    refresh();
  };

  return (
    <div>
      <h2>🍔 Gestión de carta</h2>

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
                <td>{p.image as string} {p.name as string}</td>
                <td>{p.category as string}</td>
                <td>{(p.price as number).toFixed(2)} €</td>
                <td>
                  <button type="button" className="status-btn" onClick={() => remove(p.id as string)}>Desactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
