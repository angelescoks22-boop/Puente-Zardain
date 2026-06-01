import { create } from 'zustand';

type ThemeState = {
  initTheme: () => void;
};

/** Siempre modo claro — sin toggle ni preferencia del sistema. */
export const useThemeStore = create<ThemeState>(() => ({
  initTheme: () => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('zardain_dark_mode');
    } catch {
      /* ignore */
    }
  },
}));