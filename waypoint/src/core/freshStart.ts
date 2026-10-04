// Self-cleaning lists (Part 3 §9, M2). The app tidies itself so the user never
// faces a guilt pile. Nothing is deleted. Old undated items are tucked into
// "Someday", where they stay searchable.

import { DAY } from './dates';
import type { Item } from './types';

export const TUCK_AFTER_DAYS = 14;
export const WELCOME_BACK_AFTER_DAYS = 5;

export function tidy(items: Item[], now: Date): { items: Item[]; tucked: number } {
  let tucked = 0;
  const out = items.map((it) => {
    const stale = now.getTime() - it.lastTouchedAt >= TUCK_AFTER_DAYS * DAY;
    if (it.status === 'open' && it.bucket === 'soon' && !it.due && !it.trigger && stale) {
      tucked += 1;
      return { ...it, bucket: 'someday' as const };
    }
    return it;
  });
  return { items: out, tucked };
}

/** Returns the number of days away if the user deserves a fresh start. */
export function daysAway(lastOpenAt: number | null, now: Date): number | null {
  if (!lastOpenAt) return null;
  const days = Math.floor((now.getTime() - lastOpenAt) / DAY);
  return days >= WELCOME_BACK_AFTER_DAYS ? days : null;
}
