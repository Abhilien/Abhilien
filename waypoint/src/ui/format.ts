import { formatDay, formatTime } from '../core/dates';
import type { Item } from '../core/types';

export function describeItem(item: Item, now: Date): string {
  const parts: string[] = [];
  const t = item.trigger;
  if (t?.type === 'place') parts.push(`when you ${t.on} ${t.place === 'home' ? 'home' : `the ${t.place}`}`);
  if (t?.type === 'person') parts.push(`when you see ${t.name}`);
  if (t?.type === 'leave_for') parts.push(`when you leave for the ${t.place}`);
  if (item.due?.date) {
    const label = item.kind === 'waiting' ? 'expected' : item.isDeadline ? 'due' : '';
    parts.push(`${label} ${formatDay(item.due.date, now)}${item.due.time ? ` ${item.due.time}` : ''}`.trim());
  }
  if (item.meds && item.doneAt) parts.push(`taken ${formatTime(item.doneAt)}`);
  if (item.estMinutes) parts.push(`~${item.estMinutes} min`);
  return parts.join(' · ');
}
