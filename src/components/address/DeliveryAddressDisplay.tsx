import type { DeliveryAddress } from '../../types';
import {
  formatDeliveryUnitLine,
  hasDeliveryDetails,
  hasExtraDeliveryInstructions,
  hasStructuredDeliveryDetails,
} from '../../utils/deliveryAddress';

type Props = {
  address?: string | null;
  deliveryAddress?: DeliveryAddress | null;
  className?: string;
};

export function DeliveryAddressDisplay({ address, deliveryAddress, className = '' }: Props) {
  const fullAddress = deliveryAddress?.fullAddress ?? address;
  const unitLine = deliveryAddress ? formatDeliveryUnitLine(deliveryAddress) : undefined;
  const extraNotes = deliveryAddress?.details?.trim();

  if (!fullAddress) return null;

  const showDetails = hasDeliveryDetails(deliveryAddress);

  return (
    <div className={`delivery-address-display ${className}`.trim()}>
      <p className="delivery-address-line">📍 {fullAddress}</p>
      {showDetails && hasStructuredDeliveryDetails(deliveryAddress) && unitLine && (
        <p className="delivery-address-details">
          <span className="delivery-details-tag">Detalles</span> {unitLine}
        </p>
      )}
      {showDetails && hasExtraDeliveryInstructions(deliveryAddress) && extraNotes && (
        <p className="delivery-address-details">
          <span className="delivery-details-tag">Notas</span> {extraNotes}
        </p>
      )}
    </div>
  );
}
