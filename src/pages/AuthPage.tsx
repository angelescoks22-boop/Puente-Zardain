import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DeliveryAddressForm } from '../components/address/DeliveryAddressForm';
import { OtpInput } from '../components/auth/OtpInput';
import type { ValidatedAddress } from '../types';
import { useAlertStore } from '../store/alertStore';
import { ApiError, setPendingEmail } from '../api/client';
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
    if (otp.length !== 6) return;
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
    clearError();
    try {
      await resendCode();
      setCooldown(RESEND_COOLDOWN);
      showToast('📧 Nuevo código enviado');
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setLocalError(msg);
      void showAlert(msg, AUTH_ERROR_TITLE);
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
            Cambiar email
          </button>
        </div>
      </Card>
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const {
    sendCode,
    register,
    login,
    pendingEmail,
    error,
    clearError,
    clearPendingVerification,
  } = useAuthStore();
  const showToast = useAppStore((s) => s.showToast);
  const showAlert = useAlertStore((s) => s.alert);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState(pendingEmail ?? '');
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [validatedAddress, setValidatedAddress] = useState<ValidatedAddress | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const activeEmail = (pendingEmail ?? email).trim();
  const hasPassword = form.password.trim().length > 0;

  useEffect(() => {
    if (pendingEmail && !email) setEmail(pendingEmail);
  }, [pendingEmail, email]);

  const goHome = (role: 'client' | 'admin') => {
    navigate(role === 'admin' ? '/admin' : '/');
  };

  const goToOtp = (targetEmail: string) => {
    setEmail(targetEmail);
    setStep('otp');
  };

  const handleBackFromOtp = () => {
    clearPendingVerification();
    setStep('form');
    setLocalError('');
    clearError();
  };

  if (step === 'otp' && activeEmail) {
    return (
      <OtpStep
        email={activeEmail}
        onBack={handleBackFromOtp}
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
        const role = await login(trimmedEmail.toLowerCase(), form.password.trim(), rememberMe);
        showToast(role === 'admin' ? 'Panel técnico' : '¡Bienvenido!');
        navigate(role === 'admin' ? '/admin' : '/');
        return;
      }
      await sendCode(trimmedEmail.toLowerCase());
      goToOtp(trimmedEmail);
      showToast('📧 Código enviado a tu correo');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(trimmedEmail);
        useAuthStore.setState({ pendingEmail: trimmedEmail });
        goToOtp(trimmedEmail);
        showToast('📧 Te hemos enviado un código de verificación');
        return;
      }
      const msg = getAuthErrorMessage(err);
      setLocalError(msg);
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
    if (!form.name.trim() || form.name.trim().length < 2) {
      void showAlert('Escribe tu nombre (mínimo 2 letras).', AUTH_ERROR_TITLE);
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 9) {
      void showAlert('Escribe un teléfono válido (mínimo 9 dígitos).', AUTH_ERROR_TITLE);
      return;
    }
    if (form.password.trim() && form.password.trim().length < 6) {
      void showAlert('La contraseña debe tener al menos 6 caracteres.', AUTH_ERROR_TITLE);
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
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: trimmedEmail.toLowerCase(),
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
        address: {
          fullAddress: validatedAddress.fullAddress,
          city: validatedAddress.city,
          lat: validatedAddress.lat,
          lng: validatedAddress.lng,
          ...(validatedAddress.placeId ? { placeId: validatedAddress.placeId } : {}),
        },
      });
      goToOtp(trimmedEmail);
      showToast(
        result.existingAccount
          ? 'Ya tienes cuenta — te enviamos un código para entrar'
          : '📧 Código enviado a tu correo',
      );
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setLocalError(msg);
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
      {mode === 'login' && (
        <p className="hint auth-subtitle">
          Con contraseña entras al momento. Sin contraseña te enviamos un código por email.
        </p>
      )}

      {pendingEmail && step === 'form' && (
        <Card className="auth-pending-banner">
          <p>Tienes un código pendiente para <strong>{pendingEmail}</strong></p>
          <Button size="sm" onClick={() => goToOtp(pendingEmail)}>
            Continuar verificación
          </Button>
        </Card>
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
          <form onSubmit={handleLogin} className="auth-form" noValidate>
            <label>
              Email
              <input
                className="input"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username email"
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
                placeholder="Déjala vacía para recibir un código"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <p className="hint auth-login-hint">
              Con contraseña entras al momento. Sin contraseña te enviamos un código por email.
            </p>
            <label className="remember-row">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Recuérdame
            </label>
            {displayError && <p className="form-error">{displayError}</p>}
            <Button fullWidth size="lg" disabled={loading}>
              {loading ? 'Un momento…' : hasPassword ? 'Entrar' : 'Enviar código por email'}
            </Button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form" noValidate>
            <label>
              Nombre
              <input
                className="input"
                autoComplete="name"
                placeholder="Tu nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Teléfono (reparto)
              <input
                className="input"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="600000000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                className="input"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Contraseña (opcional)
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres si la usas"
              />
            </label>
            <DeliveryAddressForm
              validatedAddress={validatedAddress}
              onValidatedAddressChange={setValidatedAddress}
              details={{ portal: '', floor: '', door: '', details: '' }}
              onDetailsChange={() => {}}
              disabled={loading}
              showOptionalDetails={false}
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
