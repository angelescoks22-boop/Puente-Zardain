import { useCallback, useState } from 'react';
import { adminApi, useAdminPoll, type Settings, BUSINESS_STATUS_LABELS, type BusinessStatus } from '../api/adminApi';
import { AdminQuickControls } from '../components/AdminControlPanels';
const DEFAULT_AUTOMATION: Settings['automation'] = {
  enabled: true,
  autoPromoEnabled: true,
  slowDayRatio: 0.6,
  busyDayRatio: 1.3,
  autoBonusZardas: false,
  autoBonusAmount: 10,
  chatAutoEnabled: true,
  chatAutoReplyEnabled: true,
  dailyReportEnabled: true,
  cleanupChatDays: 30,
  cleanupLogDays: 60,
};

export function AdminSettingsPage() {
  const fetcher = useCallback(() => adminApi.getSettings(), []);
  const { data: settings, refresh } = useAdminPoll(fetcher, 30000);
  const [form, setForm] = useState<Settings | null>(null);

  const current = form ?? settings ?? null;

  const save = async () => {
    if (!current) return;
    await adminApi.updateSettings(current);
    setForm(null);
    refresh();
  };

  if (!current) return <p>Cargando...</p>;

  const update = (patch: Partial<Settings>) => setForm({
    ...current,
    ...patch,
    autoRules: patch.autoRules ?? current.autoRules ?? {
      saturatedOrderThreshold: 8,
      prepTimeBoostWhenSaturated: 5,
      autoSaturateEnabled: true,
    },
    automation: patch.automation ?? current.automation ?? DEFAULT_AUTOMATION,
    promo: patch.promo ?? current.promo ?? { active: false, zardasMultiplier: 2, label: 'Doble Zardas hoy' },
  });

  const auto = current.automation ?? DEFAULT_AUTOMATION;

  return (
    <div>
      <h2>⚙️ Configuración general</h2>

      <div className="stat-card" style={{ marginTop: 16 }}>
        <h3>🏪 Control del negocio</h3>
        <p className="hint">Abrir, cerrar, saturación y tiempos — lo que ven los clientes al pedir.</p>
        <AdminQuickControls
          businessStatus={current.businessStatus ?? 'open'}
          prepTime={current.prepTimeMinutes}
          onUpdate={refresh}
        />
        <p className="hint">
          Estado actual: {BUSINESS_STATUS_LABELS[(current.businessStatus ?? 'open') as BusinessStatus]}
          {current.ordersOpen ? ' · Aceptando pedidos' : ' · Pedidos pausados'}
        </p>
      </div>

      <div className="stat-card" style={{ maxWidth: 560, marginTop: 16 }}>
        <h3>🕐 Horario (informativo)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>
            Apertura
            <input
              className="input"
              type="time"
              value={current.schedule?.openTime ?? '12:00'}
              onChange={(e) =>
                update({
                  schedule: {
                    ...(current.schedule ?? { openTime: '12:00', closeTime: '23:30', autoSchedule: false }),
                    openTime: e.target.value,
                  },
                })
              }
            />
          </label>
          <label>
            Cierre
            <input
              className="input"
              type="time"
              value={current.schedule?.closeTime ?? '23:30'}
              onChange={(e) =>
                update({
                  schedule: {
                    ...(current.schedule ?? { openTime: '12:00', closeTime: '23:30', autoSchedule: false }),
                    closeTime: e.target.value,
                  },
                })
              }
            />
          </label>
        </div>
        <label style={{ display: 'block', marginTop: 12 }}>
          <input
            type="checkbox"
            checked={current.schedule?.autoSchedule ?? false}
            onChange={(e) =>
              update({
                schedule: {
                  ...(current.schedule ?? { openTime: '12:00', closeTime: '23:30', autoSchedule: false }),
                  autoSchedule: e.target.checked,
                },
              })
            }
          />
          {' '}Cerrar automáticamente fuera de horario
        </label>
        <button type="button" className="status-btn" style={{ marginTop: 12 }} onClick={save}>
          Guardar horario
        </button>
      </div>

      <div className="stat-card" style={{ maxWidth: 560, marginTop: 16 }}>
        <h3>🤖 Modo automático</h3>
        <p className="hint">El negocio se gestiona solo: promos, chat, informes y limpieza.</p>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input type="checkbox" checked={auto.enabled} onChange={(e) => update({ automation: { ...auto, enabled: e.target.checked } })} />
          {' '}Automatización global activa
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input type="checkbox" checked={auto.autoPromoEnabled} onChange={(e) => update({ automation: { ...auto, autoPromoEnabled: e.target.checked } })} />
          {' '}Promos Zardas automáticas (día flojo → doble Zardas)
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input type="checkbox" checked={auto.autoBonusZardas} onChange={(e) => update({ automation: { ...auto, autoBonusZardas: e.target.checked } })} />
          {' '}Bonus Zardas a clientes activos en días flojos
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Bonus Zardas (cantidad)
          <input className="input" type="number" min={1} max={50} value={auto.autoBonusAmount} onChange={(e) => update({ automation: { ...auto, autoBonusAmount: Number(e.target.value) } })} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input type="checkbox" checked={auto.chatAutoEnabled} onChange={(e) => update({ automation: { ...auto, chatAutoEnabled: e.target.checked } })} />
          {' '}Chat automático (estado del pedido)
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input type="checkbox" checked={auto.chatAutoReplyEnabled} onChange={(e) => update({ automation: { ...auto, chatAutoReplyEnabled: e.target.checked } })} />
          {' '}Respuestas automáticas a mensajes del cliente
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input type="checkbox" checked={auto.dailyReportEnabled} onChange={(e) => update({ automation: { ...auto, dailyReportEnabled: e.target.checked } })} />
          {' '}Informe diario automático
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Borrar chats cerrados después de (días)
          <input className="input" type="number" min={7} max={365} value={auto.cleanupChatDays} onChange={(e) => update({ automation: { ...auto, cleanupChatDays: Number(e.target.value) } })} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Borrar logs después de (días)
          <input className="input" type="number" min={7} max={365} value={auto.cleanupLogDays} onChange={(e) => update({ automation: { ...auto, cleanupLogDays: Number(e.target.value) } })} />
        </label>
        <button type="button" className="status-btn" onClick={save}>Guardar automatización</button>
      </div>

      <div className="stat-card" style={{ maxWidth: 560, marginTop: 16 }}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Pedido mínimo (€)
          <input className="input" type="number" value={current.minOrderAmount} onChange={(e) => update({ minOrderAmount: Number(e.target.value) })} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Zona de reparto
          <input className="input" value={current.deliveryArea} onChange={(e) => update({ deliveryArea: e.target.value })} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Tiempo preparación base (min)
          <input className="input" type="number" value={current.prepTimeMinutes} onChange={(e) => update({ prepTimeMinutes: Number(e.target.value) })} />
        </label>
        <button type="button" className="status-btn" onClick={save}>Guardar configuración</button>
      </div>

      <div className="stat-card" style={{ marginTop: 16, maxWidth: 560 }}>
        <h3>🧠 Reglas de saturación</h3>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input type="checkbox" checked={current.autoRules?.autoSaturateEnabled ?? true} onChange={(e) => update({ autoRules: { ...current.autoRules, autoSaturateEnabled: e.target.checked, saturatedOrderThreshold: current.autoRules?.saturatedOrderThreshold ?? 8, prepTimeBoostWhenSaturated: current.autoRules?.prepTimeBoostWhenSaturated ?? 5 } })} />
          {' '}Saturación automática
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Umbral pedidos activos
          <input className="input" type="number" value={current.autoRules?.saturatedOrderThreshold ?? 8} onChange={(e) => update({ autoRules: { ...current.autoRules, saturatedOrderThreshold: Number(e.target.value), prepTimeBoostWhenSaturated: current.autoRules?.prepTimeBoostWhenSaturated ?? 5, autoSaturateEnabled: current.autoRules?.autoSaturateEnabled ?? true } })} />
        </label>
        <button type="button" className="status-btn" onClick={save}>Guardar reglas</button>
      </div>

      <div className="stat-card" style={{ marginTop: 16, maxWidth: 560 }}>
        <h3>🎟️ Promociones</h3>
        <p className="hint">
          {current.promo?.active
            ? `${current.promo.autoManaged ? '🤖 Auto: ' : ''}${current.promo.label} (x${current.promo.zardasMultiplier})`
            : 'Sin promoción activa'}
        </p>
        <button type="button" className="status-btn" onClick={async () => { await adminApi.togglePromo(); refresh(); }}>
          {current.promo?.active ? 'Desactivar promo manual' : 'Activar promo manual'}
        </button>
      </div>
    </div>
  );
}
