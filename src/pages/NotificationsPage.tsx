import { useAppStore } from '../store/appStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Modal';
import { formatDate } from '../utils/format';

export function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
  const removeNotification = useAppStore((s) => s.removeNotification);
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  if (notifications.length === 0) {
    return (
      <div className="page">
        <h1>🔔 Notificaciones</h1>
        <EmptyState
          icon="🔔"
          title="Sin notificaciones"
          description="Te avisaremos cuando tu pedido avance"
        />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="page notifications-page">
      <h1>🔔 Notificaciones</h1>
      {unreadCount > 0 && (
        <p className="hint">{unreadCount} sin leer</p>
      )}
      {notifications.map((n) => (
        <Card key={n.id} className={`notif-item ${n.read ? 'read' : ''}`}>
          <div className="notif-item-header">
            <strong>{n.title}</strong>
            <button
              type="button"
              className="link-btn"
              onClick={() => removeNotification(n.id)}
              aria-label="Eliminar notificación"
            >
              ✕
            </button>
          </div>
          <p>{n.message}</p>
          <small>{formatDate(n.createdAt)}</small>
        </Card>
      ))}
      <Button variant="ghost" fullWidth onClick={markNotificationsRead}>
        Marcar todas como leídas
      </Button>
      <Button variant="ghost" fullWidth onClick={clearNotifications}>
        Borrar todas
      </Button>
    </div>
  );
}
