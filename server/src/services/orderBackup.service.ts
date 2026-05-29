import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as ordersRepo from '../db/orders.js';
import { persistSystemLog } from '../db/systemLogs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '../../backups');

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function exportDailyOrdersBackup(): Promise<{ exported: boolean; file?: string; count: number }> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dateKey = todayKey();
  const filePath = path.join(BACKUP_DIR, `orders-${dateKey}.json`);

  if (fs.existsSync(filePath)) {
    return { exported: false, file: filePath, count: 0 };
  }

  const orders = await ordersRepo.find({});
  const payload = {
    exportedAt: new Date().toISOString(),
    date: dateKey,
    count: orders.length,
    orders: orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt?.toISOString(),
      completedAt: o.completedAt?.toISOString(),
    })),
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  await persistSystemLog('info', `Backup diario de pedidos: ${orders.length} registros`, {
    file: filePath,
    count: orders.length,
  });

  return { exported: true, file: filePath, count: orders.length };
}
