// Small local-time date helpers. All functions take `now` explicitly so the
// logic is deterministic under test.

import type { Daypart } from './types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

/** Default clock times for dayparts (local). */
export const DAYPART_TIME: Record<Daypart, string> = {
  morning: '08:30',
  afternoon: '14:00',
  evening: '19:00',
};

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Days from `from` (date only) to the next given weekday; 0 means today. */
export function daysUntilWeekday(from: Date, weekday: number): number {
  return (weekday - from.getDay() + 7) % 7;
}

/** Combine a YYYY-MM-DD key and HH:MM into epoch ms (local time). */
export function atTime(dateKey: string, time: string): number {
  const d = fromDateKey(dateKey);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.getTime();
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${pad(m)}${suffix}`;
}

/** "Tue 14" style label relative to now: Today / Tomorrow / weekday + date. */
export function formatDay(dateKey: string, now: Date): string {
  const target = fromDateKey(dateKey);
  const diff = Math.round((target.getTime() - startOfDay(now).getTime()) / DAY);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  const wd = WEEKDAYS[target.getDay()] ?? '';
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1, 3)} ${target.getDate()}`;
}

/** Human duration: "8 min", "1h 42m", "2 days". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / MIN));
  if (total < 60) return `${total} min`;
  if (total < 48 * 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${Math.round(total / (24 * 60))} days`;
}
