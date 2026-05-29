import type { ReactNode } from 'react';
import { Button } from './Button';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const isSuccess = /✅|añadido|confirmado|repetido|cargado/i.test(message);

  return (
    <div className={`toast ${isSuccess ? 'toast--success' : ''}`} onClick={onClose} role="status">
      {isSuccess && <span className="toast-check" aria-hidden>✓</span>}
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <Button onClick={action.onClick} variant="secondary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
