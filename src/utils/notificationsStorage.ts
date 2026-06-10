import type { Notification } from '../types';

const KEY = 'zardain_notifications';
const MAX = 50;

export function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Notification[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: Notification[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(notifications.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}
