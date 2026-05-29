import type { DeliveryDetailsFields } from '../../types';

type Props = {
  value: DeliveryDetailsFields;
  onChange: (value: DeliveryDetailsFields) => void;
  disabled?: boolean;
};

function updateField(
  current: DeliveryDetailsFields,
  field: keyof DeliveryDetailsFields,
  next: string,
): DeliveryDetailsFields {
  return { ...current, [field]: next };
}

export function DeliveryDetailsField({ value, onChange, disabled }: Props) {
  return (
    <div className="delivery-details-field">
      <p className="delivery-details-heading">
        🏢 Detalles de entrega{' '}
        <span className="optional-badge">(opcional)</span>
      </p>

      <div className="delivery-details-grid">
        <label className="delivery-detail-cell">
          <span>Portal</span>
          <input
            type="text"
            className="input delivery-detail-input"
            placeholder="2"
            maxLength={20}
            value={value.portal ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(updateField(value, 'portal', e.target.value))}
          />
        </label>
        <label className="delivery-detail-cell">
          <span>Piso</span>
          <input
            type="text"
            className="input delivery-detail-input"
            placeholder="3"
            maxLength={20}
            value={value.floor ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(updateField(value, 'floor', e.target.value))}
          />
        </label>
        <label className="delivery-detail-cell">
          <span>Puerta</span>
          <input
            type="text"
            className="input delivery-detail-input"
            placeholder="B"
            maxLength={20}
            value={value.door ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(updateField(value, 'door', e.target.value))}
          />
        </label>
      </div>

      <label className="address-label delivery-extra-label" htmlFor="delivery-extra-notes">
        Indicaciones extra{' '}
        <span className="optional-badge">(opcional)</span>
      </label>
      <textarea
        id="delivery-extra-notes"
        className="delivery-details-input"
        rows={2}
        maxLength={200}
        placeholder="Ej: timbre roto, llamar al teléfono"
        value={value.details ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(updateField(value, 'details', e.target.value))}
      />
      <p className="address-hint subtle">
        Ayuda al repartidor a encontrarte sin cambiar la dirección validada.
      </p>
    </div>
  );
}
