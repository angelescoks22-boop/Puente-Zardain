import type { DeliveryDetailsFields, ValidatedAddress } from '../../types';
import { AddressAutocomplete } from './AddressAutocomplete';
import { DeliveryDetailsField } from './DeliveryDetailsField';

type Props = {
  validatedAddress: ValidatedAddress | null;
  onValidatedAddressChange: (address: ValidatedAddress | null) => void;
  details: DeliveryDetailsFields;
  onDetailsChange: (details: DeliveryDetailsFields) => void;
  disabled?: boolean;
  /** En registro: detalles (portal/piso/puerta) ocultos por defecto — no son obligatorios */
  showOptionalDetails?: boolean;
};

export function DeliveryAddressForm({
  validatedAddress,
  onValidatedAddressChange,
  details,
  onDetailsChange,
  disabled,
  showOptionalDetails = false,
}: Props) {
  return (
    <div className="delivery-address-form">
      <AddressAutocomplete
        value={validatedAddress}
        onChange={onValidatedAddressChange}
        label="Dirección de entrega"
        required
        disabled={disabled}
      />
      {showOptionalDetails ? (
        <DeliveryDetailsField value={details} onChange={onDetailsChange} disabled={disabled} />
      ) : (
        <p className="address-hint subtle">
          Portal, piso y puerta son opcionales — puedes añadirlos después en tu perfil.
        </p>
      )}
    </div>
  );
}
