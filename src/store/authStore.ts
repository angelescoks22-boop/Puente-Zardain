import { create } from 'zustand';
import type { User, ValidatedAddress } from '../types';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

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
  }) => Promise<void>;
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
  pendingEmail: null,
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
      });
    } catch {
      set({ user: null, role: null, isAuthenticated: false, isLoading: false });
    }
  },

  sendCode: async (email) => {
    set({ error: null });
    await authApi.sendCode(email);
    set({ pendingEmail: email.toLowerCase().trim() });
  },

  register: async (data) => {
    set({ error: null });
    const result = await authApi.register(data);
    set({ pendingEmail: result.email });
  },

  verifyCode: async (code, rememberMe = true) => {
    const email = get().pendingEmail;
    if (!email) throw new Error('Sin verificación pendiente');
    set({ error: null });
    const { user, role } = await authApi.verifyCode(email, code, rememberMe);
    set({ user, role: role as 'client' | 'admin', isAuthenticated: true, pendingEmail: null });
    return role as 'client' | 'admin';
  },

  resendCode: async () => {
    const email = get().pendingEmail;
    if (!email) return;
    await authApi.resendCode(email);
  },

  login: async (identifier, password, rememberMe = false) => {
    set({ error: null });
    const { user, role } = await authApi.login(identifier, password, rememberMe);
    set({ user, role: role as 'client' | 'admin', isAuthenticated: true });
    return role as 'client' | 'admin';
  },

  logout: async () => {
    await authApi.logout();
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
    set({ user: null, role: null, isAuthenticated: false, pendingEmail: null, error: 'Sesión expirada' });
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().handleSessionExpired();
  authApi.logout().catch(() => {});
});
