import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Badge } from '../ui/Badge';
import { UserMenu, UserMenuNotifications } from './UserMenu';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const darkMode = useThemeStore((s) => s.darkMode);
  const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode);

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
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        {isAdmin && (
          <Link to="/admin" className="header-admin-btn">
            ⚙️ Panel Admin
          </Link>
        )}
        {user && (
          <Link to="/zardas">
            <Badge variant="zardas">💎 {user.zardas} Zardas</Badge>
          </Link>
        )}
        <UserMenuNotifications />
        <UserMenu />
      </div>
    </header>
  );
}