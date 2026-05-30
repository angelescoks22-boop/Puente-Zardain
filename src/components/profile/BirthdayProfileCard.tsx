import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { User } from '../../types';
import {
  BIRTHDAY_FREE_PRODUCT_LABEL,
  BIRTHDAY_ZARDAS_REWARD,
  formatBirthdayDisplay,
  isBirthdayToday,
} from '../../utils/birthday';

type Props = {
  user: User;
  onSave: (patch: Partial<User>) => Promise<void>;
};

function toDateInputValue(birthday?: string | null): string {
  if (!birthday) return '';
  return birthday.includes('T') ? birthday.split('T')[0] : birthday.slice(0, 10);
}

export function BirthdayProfileCard({ user, onSave }: Props) {
  const [editing, setEditing] = useState(!user.birthday);
  const [birthday, setBirthday] = useState(toDateInputValue(user.birthday));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBirthday(toDateInputValue(user.birthday));
    if (!user.birthday) setEditing(true);
  }, [user.birthday]);

  const rewardText = `${BIRTHDAY_ZARDAS_REWARD} Zardas + ${BIRTHDAY_FREE_PRODUCT_LABEL}`;
  const todayIsBirthday = isBirthdayToday(user.birthday);
  const claimedThisYear =
    user.birthdayRewardClaimedYear === new Date().getFullYear();

  const handleSave = async () => {
    if (!birthday) {
      setError('Elige tu fecha de cumpleaños');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({ birthday });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="birthday-profile-card">
      <div className="birthday-profile-header">
        <h3>🎂 Cumpleaños</h3>
        {user.birthday && !editing && (
          <button type="button" className="link-btn" onClick={() => setEditing(true)}>
            Cambiar
          </button>
        )}
      </div>

      {!user.birthday && (
        <p className="birthday-profile-promo">
          Añade tu cumpleaños y el día de tu fiesta recibirás <strong>{rewardText}</strong>.
        </p>
      )}

      {user.birthday && !editing ? (
        <div className="birthday-profile-set">
          <p className="birthday-profile-date">{formatBirthdayDisplay(user.birthday)}</p>
          <p className="hint">Regalo anual: {rewardText}</p>
          {todayIsBirthday && !claimedThisYear && (
            <p className="birthday-profile-today">¡Hoy es tu día! Reclama tu regalo arriba en la app.</p>
          )}
          {user.birthdayFreeProductPending && (
            <p className="birthday-pending">🎁 Tienes una bebida gratis pendiente en tu próximo pedido</p>
          )}
        </div>
      ) : (
        <div className="birthday-profile-form">
          <label>
            Fecha de nacimiento
            <input
              type="date"
              className="input"
              value={birthday}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setBirthday(e.target.value);
                setError('');
              }}
            />
          </label>
          <p className="hint">Solo usamos el día y el mes para tu regalo. No hace falta el año exacto.</p>
          {error && <p className="form-error">{error}</p>}
          <div className="birthday-profile-actions">
            <Button size="sm" onClick={handleSave} disabled={saving || !birthday}>
              {saving ? 'Guardando…' : user.birthday ? 'Guardar fecha' : 'Añadir cumpleaños'}
            </Button>
            {user.birthday && (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setBirthday(toDateInputValue(user.birthday));
                  setEditing(false);
                  setError('');
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
