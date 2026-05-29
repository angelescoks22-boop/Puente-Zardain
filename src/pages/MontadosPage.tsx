import { Navigate } from 'react-router-dom';

export function MontadosPage() {
  return <Navigate to="/menu?c=montados" replace />;
}

export function BocadillosPage() {
  return <Navigate to="/menu?c=bocadillos" replace />;
}
