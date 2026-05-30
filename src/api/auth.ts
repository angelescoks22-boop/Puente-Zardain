import type { AuthResponse, User, ValidatedAddress } from '../types';
import { apiFetch, setToken } from './client';
import { disconnectChatSocket, ensureAppSocket, reconnectChatSocket } from './chatSocket';

type RegisterData = {
  name: string;
  phone: string;
  email: string;
  password?: string;
  address: ValidatedAddress;
};

export async function sendCode(email: string): Promise<{ ok: true; email: string; emailSent?: boolean }> {
  return apiFetch('/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function verifyCode(
  email: string,
  code: string,
  rememberMe = true,
): Promise<AuthResponse & { role: string; rememberMe: boolean }> {
  const res = await apiFetch<AuthResponse & { role: string; rememberMe: boolean }>('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code, rememberMe }),
  });
  setToken(res.token, res.rememberMe !== false);
  reconnectChatSocket();
  return res;
}

export async function register(data: RegisterData): Promise<{
  needsOtp: true;
  email: string;
  existingAccount?: boolean;
  message?: string;
  emailSent?: boolean;
}> {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function resendCode(email: string): Promise<{ ok?: true; emailSent?: boolean }> {
  return apiFetch('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function login(
  identifier: string,
  password: string,
  rememberMe = false,
): Promise<AuthResponse & { role: string; rememberMe: boolean }> {
  const res = await apiFetch<AuthResponse & { role: string; rememberMe: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password, rememberMe }),
  });
  setToken(res.token, res.rememberMe);
  reconnectChatSocket();
  return res;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>('/auth/me');
  } catch {
    return null;
  }
}

export async function updateUser(_userId: string, updates: Partial<User>): Promise<User> {
  return apiFetch<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Token ya inválido o sin red — limpiar sesión local igualmente
  }
  setToken(null);
  disconnectChatSocket();
  ensureAppSocket();
}

export type BirthdayStatus = {
  isBirthday: boolean;
  claimed: boolean;
  hasBirthday: boolean;
  zardasReward: number;
  freeProduct: string;
  freeProductPending: boolean;
};

export async function getBirthdayStatus(): Promise<BirthdayStatus> {
  return apiFetch('/auth/birthday-status');
}

export async function claimBirthdayReward(): Promise<{
  user: User;
  zardasAwarded: number;
  freeProduct: string;
}> {
  return apiFetch('/auth/claim-birthday', { method: 'POST' });
}
