import { ApiError } from '../api/client';

export function isValidEmailInput(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'ADMIN_USE_PASSWORD') {
      return 'Esta cuenta es de administrador. Usa tu email y contraseña en Entrar.';
    }
    if (err.code === 'NO_ACCOUNT') {
      return 'No hay cuenta con este email. Ve a Registrarse para crear una.';
    }
    if (err.code === 'NO_PENDING') {
      return 'Tu registro expiró. Vuelve atrás y crea la cuenta de nuevo.';
    }
    if (err.status === 401) {
      return 'Email o contraseña incorrectos. Revísalos e inténtalo de nuevo.';
    }
    if (err.status === 404) {
      return err.message || 'No encontramos una cuenta con ese email.';
    }
    if (err.status === 409) {
      return err.message || 'Este teléfono ya está registrado con otro email.';
    }
    if (err.status === 400) {
      const msg = err.message.toLowerCase();
      if (msg.includes('código incorrecto')) return 'Código incorrecto. Revísalo e inténtalo de nuevo.';
      if (msg.includes('expirado')) return 'El código ha caducado. Pulsa «Reenviar código».';
      if (msg.includes('demasiados intentos')) return 'Demasiados intentos. Pulsa «Reenviar código».';
      if (msg.includes('verificación pendiente') || msg.includes('nuevo código')) {
        return err.message;
      }
      if (msg.includes('email') || msg.includes('válido') || msg.includes('valid')) {
        return 'Revisa tu email: debe incluir @ y un dominio (por ejemplo .com).';
      }
      if (msg.includes('contraseña') || msg.includes('password')) {
        return err.message;
      }
      if (msg.includes('teléfono') || msg.includes('phone')) {
        return err.message;
      }
      if (msg.includes('dirección') || msg.includes('address')) {
        return err.message;
      }
      return err.message || 'Revisa los datos que has escrito e inténtalo otra vez.';
    }
    if (err.status === 403) {
      if (err.message.toLowerCase().includes('verifica')) {
        return 'Verifica tu email con el código que te enviamos antes de entrar con contraseña.';
      }
      if (err.message.toLowerCase().includes('bloqueada')) return err.message;
      return err.message || 'No pudimos completar el acceso. Revisa tus datos.';
    }
    if (err.status === 0) return err.message;
    return err.message || 'No se pudo completar el acceso. Inténtalo de nuevo.';
  }
  if (err instanceof Error) {
    if (/sin verificación pendiente/i.test(err.message)) {
      return 'No hay verificación activa. Vuelve atrás e introduce tu email.';
    }
    return err.message;
  }
  return 'No se pudo completar el acceso. Inténtalo de nuevo.';
}

export const AUTH_ERROR_TITLE = 'Revisa tus datos';
