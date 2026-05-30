import { getApiBase } from '../config/api';

const TOKEN_KEY = 'zardain_token';
const PENDING_EMAIL_KEY = 'zardain_pending_email';

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null, rememberMe = true): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  if (rememberMe) localStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const API_BASE = getApiBase();

export function getPendingEmail(): string | null {
  return sessionStorage.getItem(PENDING_EMAIL_KEY);
}

export function setPendingEmail(email: string | null): void {
  if (email) sessionStorage.setItem(PENDING_EMAIL_KEY, email.toLowerCase().trim());
  else sessionStorage.removeItem(PENDING_EMAIL_KEY);
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError('Sin conexión. Comprueba tu red e inténtalo de nuevo.', 0, 'NETWORK');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de conexión' }));
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    const msg =
      response.status === 404 && !API_BASE.startsWith('http')
        ? 'Servidor no disponible. Despliega el backend y configura VITE_API_URL en Netlify.'
        : response.status === 404
          ? 'API no encontrada. Revisa VITE_API_URL en Netlify.'
          : (error.message ?? 'Error desconocido');
    throw new ApiError(msg, response.status, error.code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function adminFetch<T>(endpoint: string, options: RequestInit = {}) {
  return apiFetch<T>(`/admin${endpoint}`, options);
}
