import * as ordersRepo from '../db/orders.js';
import * as dailyReportsRepo from '../db/dailyReports.js';
import * as settingsRepo from '../db/settings.js';
import {
  analyzeBusinessActivity,
  getTopProductForDay,
  countNewClientsForDay,
  countRecurringClientsForDay,
} from './activityAnalysis.service.js';
import { persistSystemLog } from '../db/systemLogs.js';
import { notifyAdminDashboard } from './adminNotify.js';

function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function generateDailyReport(forDate = new Date()) {
  const start = startOfDay(forDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const key = dateKey(forDate);

  const [orders, cancelled, topProduct, newClients, recurring, activity] = await Promise.all([
    ordersRepo.find({ createdAtGte: start, createdAtLt: end, status: { ne: 'cancelled' } }),
    ordersRepo.countDocuments({ createdAtGte: start, createdAtLt: end, status: 'cancelled' }),
    getTopProductForDay(forDate),
    countNewClientsForDay(forDate),
    countRecurringClientsForDay(forDate),
    analyzeBusinessActivity(),
  ]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const summary = [
    `📊 Resumen del día (${key}):`,
    `- Pedidos totales: ${totalOrders}`,
    `- Ingresos: ${totalRevenue.toFixed(2)} €`,
    `- Producto más pedido: ${topProduct.name}`,
    `- Hora pico: ${activity.peakHour}`,
    `- Nuevos clientes: ${newClients}`,
    `- Clientes recurrentes: ${recurring}`,
    `- Ticket medio: ${avgTicket.toFixed(2)} €`,
    `- Cancelaciones: ${cancelled}`,
  ].join('\n');

  const report = await dailyReportsRepo.upsertByDate({
    date: key,
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    topProduct: topProduct.name,
    peakHour: activity.peakHour,
    newClients,
    recurringClients: recurring,
    avgTicket: Math.round(avgTicket * 100) / 100,
    cancelledOrders: cancelled,
    summary,
  });

  return report;
}

export async function getLatestDailyReport() {
  return dailyReportsRepo.findLatest();
}

export async function getDailyReports(limit = 7) {
  return dailyReportsRepo.findMany(limit);
}

export async function runDailyReportIfNeeded() {
  const settings = await settingsRepo.getOrCreate();
  if (!settings.automation?.enabled || !settings.automation?.dailyReportEnabled) {
    return { generated: false, reason: 'disabled' };
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const key = dateKey(yesterday);

  const existing = await dailyReportsRepo.findByDate(key);
  if (existing) return { generated: false, reason: 'exists', report: existing };

  if (now.getHours() < 23 && now.getHours() > 6) {
    return { generated: false, reason: 'not-time-yet' };
  }

  const report = await generateDailyReport(yesterday);
  await persistSystemLog('info', `Informe diario generado: ${key}`, {
    totalOrders: report.totalOrders,
    topProduct: report.topProduct,
  });
  notifyAdminDashboard();
  return { generated: true, report };
}

export async function getTodayLiveReport() {
  const report = await generateDailyReport(new Date());
  return {
    date: report.date,
    totalOrders: report.totalOrders,
    totalRevenue: report.totalRevenue,
    topProduct: report.topProduct,
    peakHour: report.peakHour,
    newClients: report.newClients,
    recurringClients: report.recurringClients,
    avgTicket: report.avgTicket,
    cancelledOrders: report.cancelledOrders,
    summary: report.summary,
    isLive: true,
  };
}
