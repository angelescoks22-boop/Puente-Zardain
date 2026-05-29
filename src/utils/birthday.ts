/** Utilidades para recompensa de cumpleaños */

export function parseBirthday(value?: string | null): { month: number; day: number } | null {
  if (!value) return null;
  const datePart = value.includes('T') ? value.split('T')[0] : value;
  const [, monthStr, dayStr] = datePart.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!month || !day) return null;
  return { month, day };
}

export function isBirthdayToday(birthday?: string | null, now = new Date()): boolean {
  const parsed = parseBirthday(birthday);
  if (!parsed) return false;
  return parsed.month === now.getMonth() + 1 && parsed.day === now.getDate();
}

export function formatBirthdayDisplay(birthday?: string | null): string {
  const parsed = parseBirthday(birthday);
  if (!parsed) return '';
  const d = new Date(2000, parsed.month - 1, parsed.day);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}
