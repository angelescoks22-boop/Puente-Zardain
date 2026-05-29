import type { DeliveryDetailsFields, ValidatedAddress } from '../../types';
import { AddressAutocomplete } from './AddressAutocomplete';
import { DeliveryDetailsField } from './DeliveryDetailsField';

type Props = {
  validatedAddress: ValidatedAddress | null;
  onValidatedAddressChange: (address: ValidatedAddress | null) => void;
  details: DeliveryDetailsFields;
  onDetailsChange: (details: DeliveryDetailsFields) => void;
  disabled?: boolean;
};

export function DeliveryAddressForm({
  validatedAddress,
  onValidatedAddressChange,
  details,
  onDetailsChange,
  disabled,
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
      <DeliveryDetailsField value={details} onChange={onDetailsChange} disabled={disabled} />
    </div>
  );
}
