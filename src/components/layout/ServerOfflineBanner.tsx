import { useServerStore } from '../../store/serverStore';
import { Button } from '../ui/Button';

export function ServerOfflineBanner() {
  const online = useServerStore((s) => s.online);
  const checking = useServerStore((s) => s.checking);
  const checkHealth = useServerStore((s) => s.checkHealth);

  if (online) return null;

  return (
    <div className="system-status-banner system-status-banner--closed server-offline-banner" role="alert">
      <span>
        ⚠️ No hay conexión con el servidor local. Ejecuta <strong>npm run dev</strong> en la raíz del proyecto (no solo el frontend).
      </span>
      <Button size="sm" variant="secondary" disabled={checking} onClick={() => void checkHealth()}>
        {checking ? 'Comprobando…' : 'Reintentar'}
      </Button>
    </div>
  );
}
