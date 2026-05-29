import { useSettingsStore, isStoreOpen, isStoreSaturated } from '../../store/settingsStore';
import { useAppStore } from '../../store/appStore';

export function SystemStatusBanner() {
  const settings = useSettingsStore();
  const businessMessages = useAppStore((s) => s.businessMessages);

  const activeMessage = businessMessages.find((m) => m.active);

  if (!isStoreOpen(settings)) {
    return (
      <div className="system-status-banner system-status-banner--closed" role="status">
        ⏸️ No estamos aceptando pedidos en este momento
      </div>
    );
  }

  if (isStoreSaturated(settings)) {
    return (
      <div className="system-status-banner system-status-banner--warning" role="status">
        🔥 Estamos saturados — puede haber retrasos en la entrega
      </div>
    );
  }

  if (activeMessage) {
    return (
      <div
        className={`system-status-banner system-status-banner--${activeMessage.type}`}
        role="status"
      >
        {activeMessage.text}
      </div>
    );
  }

  return null;
}
