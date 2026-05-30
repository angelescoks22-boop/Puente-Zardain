import { create } from 'zustand';
import type { User, ValidatedAddress } from '../types';
import * as authApi from '../api/auth';
import { getPendingEmail, setPendingEmail, setUnauthorizedHandler } from '../api/client';

type AuthState = {
  user: User | null;
  role: 'client' | 'admin' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingEmail: string | null;
  error: string | null;
  init: () => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  register: (data: {
    name: string;
    phone: string;
    email: string;
    password?: string;
    address: ValidatedAddress;
  }) => Promise<{ existingAccount?: boolean }>;
  verifyCode: (code: string, rememberMe?: boolean) => Promise<'client' | 'admin'>;
  resendCode: () => Promise<void>;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<'client' | 'admin'>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
  handleSessionExpired: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  pendingEmail: getPendingEmail(),
  error: null,

  init: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getCurrentUser();
      set({
        user,
        role: user?.role ?? 'client',
        isAuthenticated: !!user,
        isLoading: false,
        pendingEmail: user ? null : get().pendingEmail ?? getPendingEmail(),
      });
      if (user) setPendingEmail(null);
    } catch {
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        pendingEmail: getPendingEmail(),
      });
    }
  },

  sendCode: async (email) => {
    set({ error: null });
    const normalized = email.toLowerCase().trim();
    await authApi.sendCode(normalized);
    setPendingEmail(normalized);
    set({ pendingEmail: normalized });
  },

  register: async (data) => {
    set({ error: null });
    const result = await authApi.register(data);
    setPendingEmail(result.email);
    set({ pendingEmail: result.email });
    return { existingAccount: result.existingAccount };
  },

  verifyCode: async (code, rememberMe = true) => {
    const email = get().pendingEmail ?? getPendingEmail();
    if (!email) throw new Error('Sin verificación pendiente. Vuelve atrás e introduce tu email.');
    set({ error: null });
    const { user, role } = await authApi.verifyCode(email, code, rememberMe);
    setPendingEmail(null);
    set({ user, role: role as 'client' | 'admin', isAuthenticated: true, pendingEmail: null });
    return role as 'client' | 'admin';
  },

  resendCode: async () => {
    const email = get().pendingEmail ?? getPendingEmail();
    if (!email) throw new Error('Sin email pendiente');
    try {
      await authApi.resendCode(email);
    } catch {
      await authApi.sendCode(email);
    }
  },

  login: async (identifier, password, rememberMe = false) => {
    set({ error: null });
    const { user, role } = await authApi.login(identifier, password, rememberMe);
    setPendingEmail(null);
    set({ user, role: role as 'client' | 'admin', isAuthenticated: true, pendingEmail: null });
    return role as 'client' | 'admin';
  },

  logout: async () => {
    await authApi.logout();
    setPendingEmail(null);
    set({ user: null, role: null, isAuthenticated: false, pendingEmail: null });
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;
    const updated = await authApi.updateUser(user.id, updates);
    set({ user: updated });
  },

  setUser: (user) => set({ user, role: user.role ?? 'client', isAuthenticated: true }),
  clearError: () => set({ error: null }),
  handleSessionExpired: () => {
    setPendingEmail(null);
    set({ user: null, role: null, isAuthenticated: false, pendingEmail: null, error: 'Sesión expirada' });
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().handleSessionExpired();
  authApi.logout().catch(() => {});
});
