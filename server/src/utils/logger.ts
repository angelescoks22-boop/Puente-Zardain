import { persistSystemLog } from '../db/systemLogs.js';

type LogLevel = 'info' | 'warn' | 'error';

function timestamp() {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, meta?: unknown) {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  if (meta !== undefined) {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](prefix, message, meta);
  } else {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](prefix, message);
  }
  if (level === 'error' || level === 'warn') {
    void persistSystemLog(
      level,
      message,
      meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : meta ? { detail: meta } : undefined,
    );
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
