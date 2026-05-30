import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DeliveryAddressForm } from '../components/address/DeliveryAddressForm';
import { OtpInput } from '../components/auth/OtpInput';
import type { ValidatedAddress } from '../types';
import {
  EMPTY_DELIVERY_DETAILS,
  sanitizeDeliveryDetailsFields,
} from '../utils/deliveryAddress';
import { useAlertStore } from '../store/alertStore';
import { AUTH_ERROR_TITLE, getAuthErrorMessage, isValidEmailInput } from '../utils/authErrors';

const RESEND_COOLDOWN = 60;

function OtpStep({
  email,
  onBack,
  onSuccess,
}: {
  email: string;
  onBack: () => void;
  onSuccess: (role: 'client' | 'admin') => void;
}) {
  const { verifyCode, resendCode, error, clearError } = useAuthStore();
  const showToast = useAppStore((s) => s.showToast);
  const showAlert = useAlertStore((s) => s.alert);
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');
    clearError();
    try {
      const role = await verifyCode(otp, rememberMe);
      showToast('¡Acceso confirmado!');
      onSuccess(role);
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setLocalError(msg);
      void showAlert(msg, AUTH_ERROR_TITLE);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLocalError('');
    try {
      await resendCode();
      setCooldown(RESEND_COOLDOWN);
      showToast('📧 Nuevo código enviado');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo reenviar');
    }
  };

  const displayError = localError || error;

  return (
    <div className="page auth-page auth-page--otp">
      <h1>📧 Verifica tu email</h1>
      <Card className="auth-card-enter">
        <p className="auth-email-sent">
          📧 Código enviado a <strong>{email}</strong>
        </p>
        <p className="hint">Revisa tu bandeja (y spam). Caduca en 5 minutos.</p>
        <form onSubmit={handleVerify}>
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          {displayError && <p className="form-error">{displayError}</p>}
          <label className="remember-row">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Recuérdame en este dispositivo
          </label>
          <Button fullWidth size="lg" disabled={loading || otp.length !== 6}>
            {loading ? 'Verificando…' : 'Confirmar código'}
          </Button>
        </form>
        <div className="auth-otp-actions">
          <button type="button" className="link-btn" disabled={cooldown > 0} onClick={handleResend}>
            {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
          </button>
          <button type="button" className="link-btn" onClick={onBack}>
            Volver
          </button>
        </div>
      </Card>
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { sendCode, register, login, pendingEmail, error, clearError } = useAuthStore();
  const showToast = useAppStore((s) => s.showToast);
  const showAlert = useAlertStore((s) => s.alert);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'form' | 'otp'>(() => (pendingEmail ? 'otp' : 'form'));
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [validatedAddress, setValidatedAddress] = useState<ValidatedAddress | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState(EMPTY_DELIVERY_DETAILS);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const activeEmail = pendingEmail ?? email;
  const hasPassword = form.password.trim().length > 0;

  useEffect(() => {
    if (pendingEmail && !email) setEmail(pendingEmail);
  }, [pendingEmail, email]);

  useEffect(() => {
    if (pendingEmail) setStep('otp');
  }, [pendingEmail]);

  const goHome = (role: 'client' | 'admin') => {
    navigate(role === 'admin' ? '/admin' : '/');
  };

  if (step === 'otp' && activeEmail) {
    return (
      <OtpStep
        email={activeEmail}
        onBack={() => {
          setStep('form');
          clearError();
          setLocalError('');
        }}
        onSuccess={goHome}
      />
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!isValidEmailInput(trimmedEmail)) {
      void showAlert(
        'Revisa tu email: debe incluir @ y un dominio (por ejemplo .com).',
        AUTH_ERROR_TITLE,
      );
      return;
    }
    setLoading(true);
    setLocalError('');
    clearError();
    try {
      if (hasPassword) {
        const role = await login(trimmedEmail, form.password, rememberMe);
        showToast(role === 'admin' ? 'Panel técnico' : '¡Bienvenido!');
        navigate(role === 'admin' ? '/admin' : '/');
        return;
      }
      await sendCode(trimmedEmail);
      setStep('otp');
      showToast('📧 Código enviado a tu correo');
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setLocalError('');
      void showAlert(msg, AUTH_ERROR_TITLE);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!isValidEmailInput(trimmedEmail)) {
      void showAlert(
        'Revisa tu email: debe incluir @ y un dominio (por ejemplo .com).',
        AUTH_ERROR_TITLE,
      );
      return;
    }
    if (!validatedAddress) {
      void showAlert('Selecciona una dirección válida en Arroyomolinos', 'Dirección');
      return;
    }
    setLoading(true);
    setLocalError('');
    clearError();
    try {
      const result = await register({
        name: form.name,
        phone: form.phone,
        email: trimmedEmail,
        ...(form.password.trim() ? { password: form.password } : {}),
        address: {
          ...validatedAddress,
          ...sanitizeDeliveryDetailsFields(deliveryDetails),
        },
      });
      setStep('otp');
      showToast(
        result.existingAccount
          ? 'Ya tienes cuenta — te enviamos un código para entrar'
          : '📧 Código enviado a tu correo',
      );
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setLocalError('');
      void showAlert(msg, AUTH_ERROR_TITLE);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="page auth-page">
      <h1>{mode === 'register' ? '📝 Registro' : '👋 Entrar'}</h1>
      {mode === 'register' && (
        <p className="hint auth-subtitle">
          Crea tu cuenta y verifica tu email. Si ya te registraste, usa Entrar.
        </p>
      )}

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => { setMode('login'); setLocalError(''); clearError(); }}
        >
          Entrar
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => { setMode('register'); setLocalError(''); clearError(); }}
        >
          Registrarse
        </button>
      </div>

      <Card>
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Email
              <input
                className="input"
                type="email"
                required
                autoFocus
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Contraseña
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="remember-row">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Recuérdame
            </label>
            {displayError && <p className="form-error">{displayError}</p>}
            <Button fullWidth size="lg" disabled={loading}>
              {loading ? 'Un momento…' : hasPassword ? 'Entrar' : 'Enviar código'}
            </Button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <label>
              Nombre
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Teléfono (reparto)
              <input className="input" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              Email
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Contraseña (opcional)
              <input
                className="input"
                type="password"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </label>
            <DeliveryAddressForm
              validatedAddress={validatedAddress}
              onValidatedAddressChange={setValidatedAddress}
              details={deliveryDetails}
              onDetailsChange={setDeliveryDetails}
              disabled={loading}
            />
            <p className="hint">Verificaremos tu email con un código de 6 dígitos.</p>
            {displayError && <p className="form-error">{displayError}</p>}
            <Button fullWidth size="lg" disabled={loading || !validatedAddress}>
              Crear cuenta (+25 Zardas)
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
