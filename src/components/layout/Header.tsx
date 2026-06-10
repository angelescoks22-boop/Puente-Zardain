import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../ui/Badge';
import { UserMenu, UserMenuNotifications } from './UserMenu';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  return (
    <header className="app-header">
      <Link to="/" className="logo">
        <span className="logo-icon">🌉</span>
        <div>
          <strong>Puente Zardain</strong>
          <small>Arroyomolinos</small>
        </div>
      </Link>
      <div className="header-actions">
        {isAdmin && (
          <Link to="/admin" className="header-admin-btn" aria-label="Panel Admin">
            <span className="header-admin-icon" aria-hidden>⚙️</span>
            <span className="header-admin-label">Admin</span>
          </Link>
        )}
        {user && (
          <Link to="/zardas" aria-label={`${user.zardas} Zardas`}>
            <Badge variant="zardas">💎 {user.zardas}</Badge>
          </Link>
        )}
        <UserMenuNotifications />
        <UserMenu />
      </div>
    </header>
  );
}