import { useAuthStore } from '../../store/authStore';
import { Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '../ui/Spinner';

type Props = {
  children: React.ReactNode;
  adminOnly?: boolean;
};

export function RequireAuth({ children, adminOnly }: Props) {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading) return <PageLoader label="Verificando sesión..." />;

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
