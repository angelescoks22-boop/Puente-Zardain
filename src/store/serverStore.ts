import { create } from 'zustand';

type ServerState = {
  online: boolean;
  checking: boolean;
  lastCheck: string | null;
  checkHealth: () => Promise<boolean>;
  startMonitoring: () => () => void;
};

async function pingHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const useServerStore = create<ServerState>((set, get) => ({
  online: false,
  checking: false,
  lastCheck: null,

  checkHealth: async () => {
    set({ checking: true });
    const online = await pingHealth();
    set({ online, checking: false, lastCheck: new Date().toISOString() });
    return online;
  },

  startMonitoring: () => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      void get()
        .checkHealth()
        .finally(() => {
          timeoutId = setTimeout(schedule, get().online ? 20_000 : 3_000);
        });
    };

    schedule();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void get().checkHealth();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  },
}));
