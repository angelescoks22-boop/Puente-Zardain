import type { OrderStatus } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'received', label: 'Recibido', icon: '📥' },
  { status: 'preparing', label: 'Preparando', icon: '👨‍🍳' },
  { status: 'ready', label: 'Listo', icon: '✅' },
  { status: 'on_the_way', label: 'En camino', icon: '🛵' },
];

const STATUS_ORDER: OrderStatus[] = ['received', 'preparing', 'ready', 'on_the_way', 'delivered'];

type Props = {
  status: OrderStatus;
  queuePosition: number;
  type: 'pickup' | 'delivery';
  etaLabel?: string;
};

export function OrderTracker({ status, queuePosition, type, etaLabel }: Props) {
  const currentIdx = Math.max(0, STATUS_ORDER.indexOf(status));
  const visibleSteps = type === 'delivery' ? STEPS : STEPS.filter((s) => s.status !== 'on_the_way');
  const progress = status === 'delivered' ? 100 : Math.round(((currentIdx + 1) / visibleSteps.length) * 100);
  const almostReady = (status === 'preparing' || status === 'received') && queuePosition <= 1;
  const isReady = status === 'ready';

  return (
    <div className={`order-tracker ${almostReady ? 'almost-ready' : ''} ${isReady ? 'is-ready' : ''}`}>
      {etaLabel && !isReady && status !== 'delivered' && status !== 'cancelled' && (
        <div className="tracker-eta">⏱️ Tiempo estimado: {etaLabel}</div>
      )}
      {almostReady && !isReady && (
        <div className="almost-ready-banner">🔥 ¡Casi listo! Tu pedido sale en breve</div>
      )}
      {queuePosition > 0 && status !== 'ready' && !almostReady && (
        <div className="queue-banner">
          👉 Tienes <strong>{queuePosition}</strong> pedido{queuePosition !== 1 ? 's' : ''} delante
        </div>
      )}

      <ProgressBar value={progress} label="Estado del pedido" showValue />

      <div className="tracker-steps">
        {visibleSteps.map((step) => {
          const stepIdx = STATUS_ORDER.indexOf(step.status);
          const isActive = currentIdx >= stepIdx;
          const isCurrent = status === step.status;
          return (
            <div key={step.status} className={`tracker-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
              <span className="step-icon">{step.icon}</span>
              <span className="step-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
