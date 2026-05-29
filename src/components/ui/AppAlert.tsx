import { useAlertStore } from '../../store/alertStore';
import { Button } from './Button';

export function AppAlert() {
  const dialog = useAlertStore((s) => s.dialog);
  const closeDialog = useAlertStore((s) => s.closeDialog);

  if (!dialog.open) return null;

  return (
    <div className="app-alert-overlay" role="presentation" onClick={() => closeDialog(false)}>
      <div
        className="app-alert-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-alert-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-alert-icon" aria-hidden>
          {dialog.kind === 'confirm' ? '❓' : 'ℹ️'}
        </div>
        <h2 id="app-alert-title" className="app-alert-title">
          {dialog.title}
        </h2>
        <p className="app-alert-message">{dialog.message}</p>
        <div className="app-alert-actions">
          {dialog.kind === 'confirm' && (
            <Button variant="ghost" onClick={() => closeDialog(false)}>
              {dialog.cancelLabel}
            </Button>
          )}
          <Button onClick={() => closeDialog(dialog.kind === 'confirm')}>
            {dialog.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
