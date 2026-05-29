import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useCartStore } from '../../store/cartStore';

const NAV_LEFT = [
  { path: '/', icon: '🏠', label: 'Inicio', end: true },
  { path: '/menu', icon: '📜', label: 'Carta', end: false },
  { path: '/reviews', icon: '⭐', label: 'Reseñas', end: false },
] as const;

const NAV_RIGHT = [
  { path: '/cart', icon: '🛒', label: 'Carrito', end: false },
  { path: '/profile', icon: '👤', label: 'Perfil', end: false },
] as const;

const AI_PATH = '/ai-recommendation';

function NavLink({
  path,
  icon,
  label,
  active,
  badge,
  badgeRef,
}: {
  path: string;
  icon: string;
  label: string;
  active: boolean;
  badge?: number;
  badgeRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <Link to={path} className={`nav-item ${active ? 'active' : ''}`}>
      <span className="nav-icon">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span ref={badgeRef} className="nav-badge">{badge > 9 ? '9+' : badge}</span>
        )}
      </span>
      <span className="nav-label">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const location = useLocation();
  const itemCount = useCartStore((s) => s.itemCount());
  const prevCount = useRef(itemCount);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (itemCount > prevCount.current && badgeRef.current) {
      badgeRef.current.classList.remove('cart-badge-pop');
      void badgeRef.current.offsetWidth;
      badgeRef.current.classList.add('cart-badge-pop');
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  const isActive = (path: string, end = false) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const aiActive =
    location.pathname === AI_PATH || location.pathname === '/suggest';

  return (
    <nav className="bottom-nav bottom-nav--hub">
      {NAV_LEFT.map(({ path, icon, label, end }) => (
        <NavLink
          key={path}
          path={path}
          icon={icon}
          label={label}
          active={isActive(path, end)}
        />
      ))}

      <Link
        to={AI_PATH}
        className={`nav-item nav-item--suggest ${aiActive ? 'active' : ''}`}
        aria-label="No sé qué pedir"
      >
        <span className="nav-suggest-fab">🤔</span>
        <span className="nav-label nav-label--suggest">No sé qué pedir</span>
      </Link>

      {NAV_RIGHT.map(({ path, icon, label, end }) => (
        <NavLink
          key={path}
          path={path}
          icon={icon}
          label={label}
          active={isActive(path, end)}
          badge={path === '/cart' ? itemCount : undefined}
          badgeRef={path === '/cart' ? badgeRef : undefined}
        />
      ))}
    </nav>
  );
}
