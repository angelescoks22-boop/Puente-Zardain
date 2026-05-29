import { query } from '../config/db.js';
import type { IDailyReport } from '../models/DailyReport.js';
import { dailyReportToData, mapDailyReportRow } from './helpers.js';

export type DailyReportInput = Omit<IDailyReport, 'id' | 'createdAt'>;

export async function upsertByDate(data: DailyReportInput): Promise<IDailyReport> {
  const payload = dailyReportToData(data);
  const { rows } = await query(
    `INSERT INTO daily_reports (date, data, summary)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (date) DO UPDATE SET
       data = EXCLUDED.data,
       summary = EXCLUDED.summary
     RETURNING *`,
    [data.date, JSON.stringify(payload), data.summary],
  );
  return mapDailyReportRow(rows[0]);
}

export async function findByDate(date: string): Promise<IDailyReport | null> {
  const { rows } = await query('SELECT * FROM daily_reports WHERE date = $1', [date]);
  return rows[0] ? mapDailyReportRow(rows[0]) : null;
}

export async function findLatest(): Promise<IDailyReport | null> {
  const { rows } = await query('SELECT * FROM daily_reports ORDER BY date DESC LIMIT 1');
  return rows[0] ? mapDailyReportRow(rows[0]) : null;
}

export async function findMany(limit = 7): Promise<IDailyReport[]> {
  const { rows } = await query('SELECT * FROM daily_reports ORDER BY date DESC LIMIT $1', [limit]);
  return rows.map(mapDailyReportRow);
}
