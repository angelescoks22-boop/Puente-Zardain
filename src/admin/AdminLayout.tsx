import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { onSettingsUpdate } from '../api/chatSocket';
import { useEffect, useState } from 'react';
import { adminApi, BUSINESS_STATUS_LABELS, type BusinessStatus } from './api/adminApi';
import { useAdminSocketInit } from './hooks/useAdminSocket';
import { AdminNewOrderAlert } from './components/AdminNewOrderAlert';
import { unlockAdminAudio, isAdminAudioUnlocked } from './utils/newOrderAlertSound';
import './styles/admin.css';

const NAV = [
  { to: '/admin', icon: '🖥️', label: 'Control', end: true },
  { to: '/admin/orders', icon: '📦', label: 'Pedidos' },
  { to: '/admin/kitchen', icon: '🍳', label: 'Cocina' },
  { to: '/admin/map', icon: '📍', label: 'Mapa' },
  { to: '/admin/customers', icon: '👥', label: 'Clientes' },
  { to: '/admin/analytics', icon: '📊', label: 'Analíticas' },
  { to: '/admin/history', icon: '🧾', label: 'Historial' },
  { to: '/admin/menu', icon: '🍔', label: 'Carta' },
  { to: '/admin/reviews', icon: '⭐', label: 'Reseñas' },
  { to: '/admin/rewards', icon: '🎁', label: 'Zardas' },
  { to: '/admin/chat', icon: '💬', label: 'Chat' },
  { to: '/admin/messages', icon: '📢', label: 'Mensajes' },
  { to: '/admin/settings', icon: '⚙️', label: 'Config' },
];

/** Panel admin siempre en modo claro. */
function useAdminLightMode() {
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'admin-dark');
    document.documentElement.classList.add('admin-light');
    return () => {
      document.documentElement.classList.remove('admin-light');
    };
  }, []);
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, role, logout, isLoading } = useAuthStore();
  const [ordersOpen, setOrdersOpen] = useState(true);
  const [businessStatus, setBusinessStatus] = useState<BusinessStatus>('open');
  useAdminSocketInit();
  useAdminLightMode();

  useEffect(() => {
    if (!isLoading && role !== 'admin') navigate('/auth');
  }, [isLoading, role, navigate]);

  useEffect(() => {
    adminApi.getSettings().then((s) => {
      setOrdersOpen(s.ordersOpen);
      setBusinessStatus(s.businessStatus ?? 'open');
    }).catch(() => {});

    const stopSettings = onSettingsUpdate((payload) => {
      if (payload.ordersOpen !== undefined) setOrdersOpen(Boolean(payload.ordersOpen));
      if (payload.businessStatus) setBusinessStatus(payload.businessStatus as BusinessStatus);
    });
    return () => {
      stopSettings();
    };
  }, []);

  const [toggleError, setToggleError] = useState('');

  const handleToggle = async () => {
    setToggleError('');
    try {
      const res = await adminApi.toggleOrders();
      setOrdersOpen(res.ordersOpen);
      setBusinessStatus(res.businessStatus);
    } catch {
      setToggleError('No se pudo cambiar el estado del local');
    }
  };

  if (isLoading || role !== 'admin') return <div className="admin-main">Cargando...</div>;

  return (
    <div
      className="admin-shell"
      onClick={() => {
        if (!isAdminAudioUnlocked()) unlockAdminAudio();
      }}
    >
      <AdminNewOrderAlert />
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>🌉 Zardain</strong>
          <small>Panel técnico</small>
        </div>
        <nav className="admin-nav">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
          <NavLink to="/">
            <span>🏠</span>
            <span className="nav-label">Ver web cliente</span>
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <small>{user?.email}</small>
          <button type="button" className="admin-logout-btn" onClick={() => { logout(); navigate('/auth'); }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <h1>Panel técnico</h1>
          <div className="admin-topbar-actions">
            <span className={`orders-open-badge ${ordersOpen ? 'open' : 'closed'} status-${businessStatus}`}>
              {BUSINESS_STATUS_LABELS[businessStatus]}
              {ordersOpen ? ' · Aceptando pedidos' : ' · Pedidos pausados'}
            </span>
            <button type="button" className="status-btn" onClick={handleToggle}>
              {ordersOpen ? 'Cerrar pedidos' : 'Abrir pedidos'}
            </button>
            {toggleError && <span className="form-error">{toggleError}</span>}
          </div>
        </div>
        <Outlet context={{ ordersOpen, setOrdersOpen }} />
      </div>
    </div>
  );
}
