import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getProfileDisplay } from '../../utils/profile';
import { ProfileAvatar } from '../profile/ProfileAvatar';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!user) {
    return (
      <Link to="/auth" className="header-btn header-user-btn" aria-label="Entrar">
        👤
      </Link>
    );
  }

  const display = getProfileDisplay(user);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="header-btn header-user-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        <ProfileAvatar
          avatar={display.avatar}
          color={display.color}
          frame={display.frame}
          size="sm"
        />
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <ProfileAvatar
              avatar={display.avatar}
              color={display.color}
              frame={display.frame}
              size="lg"
              level={user.level}
            />
            <div>
              <strong style={{ color: display.color }}>{user.name}</strong>
              {display.tagline && (
                <small className="profile-tagline profile-tagline--menu">{display.tagline}</small>
              )}
              <small>{user.email}</small>
            </div>
          </div>
          <Link to="/profile" onClick={() => setOpen(false)}>👤 Perfil</Link>
          {user.role === 'admin' && (
            <Link to="/admin" onClick={() => setOpen(false)}>⚙️ Panel Admin</Link>
          )}
          <Link to="/history" onClick={() => setOpen(false)}>📦 Pedidos</Link>
          <Link to="/chat" onClick={() => setOpen(false)}>💬 Chat</Link>
          <button
            type="button"
            className="user-menu-logout"
            onClick={() => { setOpen(false); logout(); navigate('/'); }}
          >
            🚪 Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function UserMenuNotifications() {
  const notifications = useAppStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Link to="/notifications" className="header-btn" aria-label="Notificaciones">
      🔔
      {unread > 0 && <span className="notif-dot">{unread}</span>}
    </Link>
  );
}
