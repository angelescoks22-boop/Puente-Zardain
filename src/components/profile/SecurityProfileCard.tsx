import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { changePassword } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getAuthErrorMessage } from '../../utils/authErrors';

type Props = {
  email: string;
  passwordUserSet?: boolean;
};

export function SecurityProfileCard({ email, passwordUserSet = false }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useAppStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (passwordUserSet && !currentPassword.trim()) {
      setError('Introduce tu contraseña actual.');
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword({
        ...(currentPassword.trim() ? { currentPassword: currentPassword.trim() } : {}),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      setUser(result.user);
      showToast(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="security-profile-card">
      <h3>🔐 Seguridad</h3>
      <p className="hint">Cuenta: <strong>{email}</strong></p>
      <ul className="security-tips">
        <li>Usa una contraseña de al menos 6 caracteres.</li>
        {passwordUserSet ? (
          <li>Debes introducir tu contraseña actual para cambiarla.</li>
        ) : (
          <li>Si entras solo con código OTP, deja «Contraseña actual» vacía para crear una.</li>
        )}
        <li>Al cambiar la contraseña se renueva tu sesión en este dispositivo.</li>
      </ul>

      {!open ? (
        <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
          Cambiar o crear contraseña
        </Button>
      ) : (
        <form className="security-password-form" onSubmit={handleSubmit}>
          <label>
            Contraseña actual{passwordUserSet ? '' : ' (opcional si solo usas código)'}
            <input
              type="password"
              className="input"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              required={passwordUserSet}
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              className="input"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              minLength={6}
              required
            />
          </label>
          <label>
            Repetir nueva contraseña
            <input
              type="password"
              className="input"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              minLength={6}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="security-password-actions">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setOpen(false);
                setError('');
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
