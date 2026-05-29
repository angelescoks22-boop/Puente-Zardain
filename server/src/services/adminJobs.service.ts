import * as ordersRepo from '../db/orders.js';
import type { ISettings } from '../models/Settings.js';
import * as settingsRepo from '../db/settings.js';
import * as conversationsRepo from '../db/conversations.js';
import * as messagesRepo from '../db/messages.js';
import { persistSystemLog } from '../db/systemLogs.js';
import * as systemLogsRepo from '../db/systemLogs.js';
import { notifyAdminDashboard } from './adminNotify.js';
import { broadcastSettingsUpdate } from './settings.service.js';
import { getActiveOrderCount } from './queue.service.js';
import { applyAutoPromoRules } from './autoPromo.service.js';
import { runDailyReportIfNeeded } from './dailyReport.service.js';
import { exportDailyOrdersBackup } from './orderBackup.service.js';
import { cleanupExpiredRevokedTokens } from '../db/revokedTokens.js';

export function getEffectivePrepMinutes(settings: ISettings, activeOrderCount: number) {
  let prep = settings.prepTimeMinutes ?? 15;
  if (settings.businessStatus === 'saturated') prep += 10;
  const threshold = settings.autoRules?.saturatedOrderThreshold ?? 8;
  if (activeOrderCount > threshold) {
    prep += Math.min(15, Math.floor((activeOrderCount - threshold) / 2) * 3);
  }
  return prep;
}

export { getActiveOrderCount } from './queue.service.js';

export async function applyBusinessRules() {
  const settings = await settingsRepo.getOrCreate();

  const activeCount = await getActiveOrderCount();
  const threshold = settings.autoRules?.saturatedOrderThreshold ?? 8;
  const autoEnabled = settings.autoRules?.autoSaturateEnabled !== false;

  if (autoEnabled && settings.businessStatus !== 'closed') {
    if (activeCount >= threshold && settings.businessStatus !== 'saturated') {
      settings.businessStatus = 'saturated';
      await settingsRepo.save(settings);
      await persistSystemLog('warn', `Negocio marcado como SATURADO (${activeCount} pedidos activos)`, {
        activeCount,
        threshold,
      });
      notifyAdminDashboard();
      await broadcastSettingsUpdate();
      return { changed: true, businessStatus: 'saturated' as const, activeCount };
    }
    if (activeCount < threshold - 2 && settings.businessStatus === 'saturated') {
      settings.businessStatus = 'open';
      await settingsRepo.save(settings);
      await persistSystemLog('info', 'Negocio vuelve a estado ABIERTO', { activeCount });
      notifyAdminDashboard();
      await broadcastSettingsUpdate();
      return { changed: true, businessStatus: 'open' as const, activeCount };
    }
  }

  return { changed: false, businessStatus: settings.businessStatus, activeCount };
}

async function runCleanupJobs(settings: ISettings) {
  const results: string[] = [];
  const chatDays = settings.automation?.cleanupChatDays ?? 30;
  const logDays = settings.automation?.cleanupLogDays ?? 60;

  const chatCutoff = new Date(Date.now() - chatDays * 24 * 60 * 60 * 1000);
  const oldConversations = await conversationsRepo.findOldClosed(chatCutoff, 50);

  for (const conv of oldConversations) {
    await messagesRepo.deleteByConversationId(conv.id);
    await conversationsRepo.deleteById(conv.id);
  }
  if (oldConversations.length) {
    results.push(`Chats >${chatDays}d limpiados: ${oldConversations.length}`);
  }

  const logCutoff = new Date(Date.now() - logDays * 24 * 60 * 60 * 1000);
  const deletedLogs = await systemLogsRepo.deleteOlderThan(logCutoff);
  if (deletedLogs > 0) {
    results.push(`Logs >${logDays}d eliminados: ${deletedLogs}`);
  }

  return results;
}

export async function runMaintenanceJobs() {
  const results: string[] = [];
  const settings = await settingsRepo.getOrCreate();
  const automationOn = settings.automation?.enabled !== false;

  const rules = await applyBusinessRules();
  if (rules.changed) results.push(`Reglas: ${rules.businessStatus}`);

  if (automationOn) {
    const promo = await applyAutoPromoRules();
    if (promo.changed) results.push(`Promo auto: ${promo.action}`);
    if (promo.bonusGiven && promo.bonusGiven > 0) {
      results.push(`Bonus Zardas: ${promo.bonusGiven} clientes`);
    }

    const report = await runDailyReportIfNeeded();
    if (report.generated) results.push(`Informe diario: ${report.report?.date}`);
  }

  const cleanup = await runCleanupJobs(settings);
  results.push(...cleanup);

  const revokedCleaned = await cleanupExpiredRevokedTokens();
  if (revokedCleaned > 0) results.push(`Tokens revocados expirados: ${revokedCleaned}`);

  const backup = await exportDailyOrdersBackup();
  if (backup.exported) results.push(`Backup pedidos: ${backup.count} → ${backup.file}`);

  const delayed = await ordersRepo.find({
    status: { in: ['pending', 'accepted', 'preparing'] },
    createdAtBefore: new Date(Date.now() - 45 * 60 * 1000),
  });
  if (delayed.length) {
    results.push(`Pedidos retrasados: ${delayed.length}`);
    await persistSystemLog('warn', `${delayed.length} pedido(s) con posible retraso`, {
      orderIds: delayed.map((o) => o.id),
    });
  }

  if (results.length === 0) results.push('Sin acciones necesarias');
  await persistSystemLog('info', 'Jobs automáticos ejecutados', { results });
  return results;
}
