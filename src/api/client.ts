import { getApiBase } from '../config/api';

const TOKEN_KEY = 'zardain_token';
const PENDING_EMAIL_KEY = 'zardain_pending_email';

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  } catch {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}

export function setToken(token: string | null, rememberMe = true): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  try {
    if (rememberMe) localStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* último recurso */
    }
  }
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
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? localStorage.getItem(PENDING_EMAIL_KEY);
  } catch {
    try {
      return localStorage.getItem(PENDING_EMAIL_KEY);
    } catch {
      return null;
    }
  }
}

export function setPendingEmail(email: string | null): void {
  const normalized = email ? email.toLowerCase().trim() : null;
  try {
    if (normalized) sessionStorage.setItem(PENDING_EMAIL_KEY, normalized);
    else sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    /* Safari modo privado u otros */
  }
  try {
    if (normalized) localStorage.setItem(PENDING_EMAIL_KEY, normalized);
    else localStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

const AUTH_PUBLIC_PATHS = /^\/auth\/(login|register|send-code|verify-code|verify-otp|resend-otp)(\/|$)/;

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
    let error: { message?: string; code?: string } = { message: 'Error de conexión' };
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      error = await response.json().catch(() => error);
    } else if (response.status === 404) {
      error = { message: 'No se pudo conectar con el servidor. Inténtalo en unos segundos.' };
    }
    if (response.status === 401 && onUnauthorized && !AUTH_PUBLIC_PATHS.test(endpoint)) {
      onUnauthorized();
    }
    throw new ApiError(error.message ?? 'Error desconocido', response.status, error.code);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError('Respuesta inesperada del servidor. Inténtalo de nuevo.', response.status, 'INVALID_JSON');
  }

  return response.json() as Promise<T>;
}

export function adminFetch<T>(endpoint: string, options: RequestInit = {}) {
  return apiFetch<T>(`/admin${endpoint}`, options);
}
