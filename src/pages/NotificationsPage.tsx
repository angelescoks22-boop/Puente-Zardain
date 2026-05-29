import { useAppStore } from '../store/appStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Modal';
import { formatDate } from '../utils/format';
import { useEffect } from 'react';

export function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  if (notifications.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon="🔔"
          title="Sin notificaciones"
          description="Te avisaremos cuando tu pedido avance"
        />
      </div>
    );
  }

  return (
    <div className="page notifications-page">
      <h1>🔔 Notificaciones</h1>
      {notifications.map((n) => (
        <Card key={n.id} className={`notif-item ${n.read ? 'read' : ''}`}>
          <strong>{n.title}</strong>
          <p>{n.message}</p>
          <small>{formatDate(n.createdAt)}</small>
        </Card>
      ))}
      <Button variant="ghost" fullWidth onClick={markNotificationsRead}>
        Marcar todas como leídas
      </Button>
    </div>
  );
}
