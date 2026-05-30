import { ApiError } from '../api/client';

export function isValidEmailInput(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Email o contraseña incorrectos. Revísalos e inténtalo de nuevo.';
    }
    if (err.status === 400) {
      const msg = err.message.toLowerCase();
      if (msg.includes('email') || msg.includes('válido') || msg.includes('valid')) {
        return 'Revisa tu email: debe incluir @ y un dominio (por ejemplo .com).';
      }
      return 'Revisa los datos que has escrito e inténtalo otra vez.';
    }
    if (err.status === 403) {
      if (err.message.toLowerCase().includes('bloqueada')) return err.message;
      return 'No pudimos completar el acceso. Revisa tus datos.';
    }
    if (err.status === 0) return err.message;
  }
  if (err instanceof Error) {
    if (/administrador|admin/i.test(err.message)) {
      return 'Revisa tus datos de acceso e inténtalo de nuevo.';
    }
    return err.message;
  }
  return 'No se pudo completar el acceso. Inténtalo de nuevo.';
}

export const AUTH_ERROR_TITLE = 'Datos incorrectos';
