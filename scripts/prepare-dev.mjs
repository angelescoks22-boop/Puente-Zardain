/**
 * Libera el puerto 5000 antes de arrancar dev (evita servidores huérfanos en Windows).
 */
import { execSync } from 'node:child_process';

const PORTS = [
  process.env.PORT ?? '5000',
  process.env.VITE_PORT ?? '5173',
];

function freePortWin(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[prepare-dev] Puerto ${port} liberado (PID ${pid})`);
      } catch {
        /* ya cerrado */
      }
    }
  } catch {
    /* puerto libre */
  }
}

function freePortUnix(port) {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore', shell: true });
  } catch {
    /* puerto libre */
  }
}

for (const port of PORTS) {
  if (process.platform === 'win32') {
    freePortWin(port);
  } else {
    freePortUnix(port);
  }
}
