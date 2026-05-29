import { create } from 'zustand';

const STORAGE_KEY = 'zardain_dark_mode';

type ThemeState = {
  darkMode: boolean;
  initTheme: () => void;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
};

function applyDarkMode(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  darkMode: false,

  initTheme: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'true' || (saved === null && prefersDark);
    applyDarkMode(dark);
    set({ darkMode: dark });
  },

  setDarkMode: (value) => {
    localStorage.setItem(STORAGE_KEY, String(value));
    applyDarkMode(value);
    set({ darkMode: value });
  },

  toggleDarkMode: () => {
    get().setDarkMode(!get().darkMode);
  },
}));
