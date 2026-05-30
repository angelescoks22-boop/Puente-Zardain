/** URL base de la API. En producción: VITE_API_URL=https://tu-api.com/api */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return '/api';
}

/** Origen del socket (sin /api). En producción: VITE_SOCKET_URL o se deduce de VITE_API_URL */
export function getSocketOrigin(): string {
  const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
  if (socketUrl) return socketUrl.replace(/\/$/, '');

  const api = import.meta.env.VITE_API_URL?.trim();
  if (api) {
    try {
      const u = new URL(api.replace(/\/$/, ''));
      if (u.pathname.endsWith('/api')) {
        u.pathname = u.pathname.slice(0, -4) || '/';
      }
      return u.origin + (u.pathname === '/' ? '' : u.pathname);
    } catch {
      return api.replace(/\/api\/?$/, '');
    }
  }

  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function isRemoteApi(): boolean {
  return Boolean(import.meta.env.VITE_API_URL?.trim());
}
