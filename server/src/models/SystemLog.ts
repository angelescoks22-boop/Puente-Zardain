export interface ISystemLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}
