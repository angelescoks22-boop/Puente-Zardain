import { useState } from 'react';
import type { UserAddress, ValidatedAddress } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addUserAddress, deleteUserAddress, setDefaultAddress } from '../../api/address';
import { DeliveryAddressForm } from './DeliveryAddressForm';
import { Button } from '../ui/Button';
import { EMPTY_DELIVERY_DETAILS, formatDeliveryUnitLine, sanitizeDeliveryDetailsFields } from '../../utils/deliveryAddress';

type Props = {
  addresses: UserAddress[];
  onUpdated: () => void;
};

export function AddressManager({ addresses, onUpdated }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const [adding, setAdding] = useState(false);
  const [newAddress, setNewAddress] = useState<ValidatedAddress | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState(EMPTY_DELIVERY_DETAILS);
  const [label, setLabel] = useState('Casa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!newAddress) {
      setError('Selecciona y valida una dirección');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await addUserAddress(
        { ...newAddress, ...sanitizeDeliveryDetailsFields(deliveryDetails) },
        { label, setDefault: addresses.length === 0 },
      );
      setUser(user);
      setAdding(false);
      setNewAddress(null);
      setDeliveryDetails(EMPTY_DELIVERY_DETAILS);
      setLabel('Casa');
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setLoading(true);
    try {
      const user = await setDefaultAddress(id);
      setUser(user);
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const user = await deleteUserAddress(id);
      setUser(user);
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="address-manager">
      <div className="address-manager-header">
        <h3>Mis direcciones</h3>
        {!adding && (
          <button type="button" className="link-btn" onClick={() => setAdding(true)}>
            + Añadir
          </button>
        )}
      </div>

      {addresses.length === 0 && !adding && (
        <p className="hint">Aún no tienes direcciones guardadas. Añade una en Arroyomolinos.</p>
      )}

      <ul className="saved-addresses">
        {addresses.map((addr) => (
          <li key={addr.id} className={`saved-address-card ${addr.isDefault ? 'default' : ''}`}>
            <div>
              <strong>{addr.label ?? 'Dirección'}</strong>
              {addr.isDefault && <span className="default-badge">Por defecto</span>}
              <p>{addr.fullAddress}</p>
              {formatDeliveryUnitLine(addr) && (
                <p className="hint">{formatDeliveryUnitLine(addr)}</p>
              )}
              {addr.details?.trim() && (
                <p className="hint">{addr.details.trim()}</p>
              )}
              <span className="hint">{addr.city}</span>
            </div>
            <div className="saved-address-actions">
              {!addr.isDefault && (
                <button type="button" className="link-btn" disabled={loading} onClick={() => handleSetDefault(addr.id)}>
                  Predeterminada
                </button>
              )}
              <button type="button" className="link-btn danger" disabled={loading} onClick={() => handleDelete(addr.id)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="address-add-form">
          <DeliveryAddressForm
            validatedAddress={newAddress}
            onValidatedAddressChange={setNewAddress}
            details={deliveryDetails}
            onDetailsChange={setDeliveryDetails}
            disabled={loading}
            showOptionalDetails
          />
          <label className="address-label">
            Etiqueta
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Casa, Trabajo..."
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="address-add-actions">
            <Button onClick={handleAdd} disabled={loading || !newAddress}>
              Guardar dirección
            </Button>
            <Button variant="ghost" onClick={() => { setAdding(false); setNewAddress(null); setDeliveryDetails(EMPTY_DELIVERY_DETAILS); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
