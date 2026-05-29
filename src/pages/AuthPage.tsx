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
      setLocalError(err instanceof Error ? err.message : 'Error al verificar');
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
            Cambiar email
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

  const [mode, setMode] = useState<'login' | 'register' | 'admin'>('login');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [validatedAddress, setValidatedAddress] = useState<ValidatedAddress | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState(EMPTY_DELIVERY_DETAILS);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const activeEmail = pendingEmail ?? email;

  const goHome = (role: 'client' | 'admin') => {
    navigate(role === 'admin' ? '/admin' : '/');
  };

  if (step === 'otp' && activeEmail) {
    return (
      <OtpStep
        email={activeEmail}
        onBack={() => setStep('form')}
        onSuccess={goHome}
      />
    );
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');
    clearError();
    try {
      await sendCode(email.trim());
      setStep('otp');
      showToast('📧 Código enviado a tu correo');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');
    clearError();
    try {
      const role = await login(email.trim(), form.password, rememberMe);
      showToast('Panel admin');
      navigate(role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedAddress) {
      setLocalError('Selecciona una dirección válida en Arroyomolinos');
      return;
    }
    setLoading(true);
    setLocalError('');
    clearError();
    try {
      await register({
        name: form.name,
        phone: form.phone,
        email: email.trim(),
        password: form.password,
        address: {
          ...validatedAddress,
          ...sanitizeDeliveryDetailsFields(deliveryDetails),
        },
      });
      setStep('otp');
      showToast('📧 Código enviado a tu correo');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="page auth-page">
      <h1>{mode === 'register' ? '📝 Registro' : mode === 'admin' ? '🔐 Admin' : '👋 Entrar'}</h1>
      <p className="hint auth-subtitle">
        {mode === 'login' && 'Accede con tu email — te enviamos un código, sin contraseña.'}
        {mode === 'register' && 'Crea tu cuenta y verifica tu email.'}
        {mode === 'admin' && 'Acceso al panel con email y contraseña.'}
      </p>

      <div className="auth-tabs">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setLocalError(''); }}>
          Entrar
        </button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setLocalError(''); }}>
          Registrarse
        </button>
        <button type="button" className={mode === 'admin' ? 'active' : ''} onClick={() => { setMode('admin'); setLocalError(''); }}>
          Admin
        </button>
      </div>

      <Card>
        {mode === 'login' && (
          <form onSubmit={handleEmailLogin} className="auth-form">
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
            {displayError && <p className="form-error">{displayError}</p>}
            <Button fullWidth size="lg" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar código'}
            </Button>
          </form>
        )}

        {mode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="auth-form">
            <label>
              Email admin
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Contraseña
              <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            <label className="remember-row">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Recuérdame
            </label>
            {displayError && <p className="form-error">{displayError}</p>}
            <Button fullWidth size="lg" disabled={loading}>
              Entrar al panel
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
              Email *
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Contraseña (opcional, para recuperación)
              <input className="input" type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
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
