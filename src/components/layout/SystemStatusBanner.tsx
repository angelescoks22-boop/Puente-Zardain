import { useSettingsStore, isStoreOpen, isStoreSaturated } from '../../store/settingsStore';
import { useAppStore } from '../../store/appStore';

export function SystemStatusBanner() {
  const settings = useSettingsStore();
  const businessMessages = useAppStore((s) => s.businessMessages);

  const activeMessages = businessMessages.filter((m) => m.active);

  return (
    <>
      {!isStoreOpen(settings) && (
        <div className="system-status-banner system-status-banner--closed" role="status">
          ⏸️ No estamos aceptando pedidos en este momento
        </div>
      )}

      {isStoreOpen(settings) && isStoreSaturated(settings) && (
        <div className="system-status-banner system-status-banner--warning" role="status">
          🔥 Estamos saturados — puede haber retrasos en la entrega
        </div>
      )}

      {activeMessages.map((msg) => (
        <div
          key={msg.id}
          className={`system-status-banner system-status-banner--${msg.type}`}
          role="status"
        >
          {msg.text}
        </div>
      ))}
    </>
  );
}
