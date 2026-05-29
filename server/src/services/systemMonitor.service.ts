import { getPool } from '../config/db.js';
import { persistSystemLog } from '../db/systemLogs.js';
import * as systemLogsRepo from '../db/systemLogs.js';
import { getActiveOrderCount, applyBusinessRules } from './adminJobs.service.js';

let chatIoConnected = false;

export function setChatIoStatus(connected: boolean) {
  chatIoConnected = connected;
}

export async function getSystemHealth() {
  let dbOk = false;
  try {
    await getPool().query('SELECT 1');
    dbOk = true;
  } catch {
    // dbOk permanece false
  }

  let activeOrders = 0;
  try {
    activeOrders = await getActiveOrderCount();
  } catch {
    // ignore
  }

  let autoRules = null;
  try {
    autoRules = await applyBusinessRules();
  } catch {
    // ignore
  }

  return {
    ok: dbOk,
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      database: dbOk ? 'connected' : 'disconnected',
      chat: chatIoConnected ? 'connected' : 'active',
      socket: true,
    },
    metrics: {
      activeOrders,
      autoRules,
    },
  };
}

export async function getRecentSystemLogs(limit = 30) {
  return systemLogsRepo.findRecent(limit);
}

export async function logSystemError(message: string, meta?: Record<string, unknown>) {
  await persistSystemLog('error', message, meta);
}
