/**
 * Espera la API y arranca Vite en un solo proceso (evita crash UV_HANDLE_CLOSING en Windows).
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const HEALTH_HOST = '127.0.0.1';
const HEALTH_PORT = 5000;
const MAX_WAIT_MS = 60_000;
const POLL_MS = 500;

function pingHealth() {
  return new Promise((resolve) => {
    const req = http.request(
      { host: HEALTH_HOST, port: HEALTH_PORT, path: '/api/health', method: 'GET', timeout: 4000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForApi() {
  const start = Date.now();
  process.stdout.write('[dev-client] Esperando API en :5000');

  while (Date.now() - start < MAX_WAIT_MS) {
    if (await pingHealth()) {
      console.log(' ✓');
      return;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  console.log('\n[dev-client] API no lista; arrancando Vite igual (reintenta en la app).');
}

await waitForApi();

const child = spawn(process.execPath, [viteBin], {
  stdio: 'inherit',
  cwd: rootDir,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
