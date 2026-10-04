// Turning parser output into stored items and leave events.

import { initialCueAt } from './cues';
import { atTime, DAYPART_TIME } from './dates';
import type { ParsedItem } from './parser';
import type { Item, LeaveEvent } from './types';

export const DEFAULT_LEAVE_CHECKLIST = ['Phone', 'Keys', 'Wallet'];
export const DEFAULT_PREP_MIN = 20;
export const DEFAULT_BUFFER_MIN = 5;

export function bucketFor(p: Pick<ParsedItem, 'kind' | 'due'>): Item['bucket'] {
  if (p.kind === 'waiting') return 'waiting';
  return p.due ? 'scheduled' : 'soon';
}

export function itemFromParsed(p: ParsedItem, now: Date, id: string): Item {
  const base: Item = {
    id,
    kind: p.kind,
    title: p.title,
    why: p.why ?? undefined,
    status: 'open',
    bucket: bucketFor(p),
    due: p.due,
    isDeadline: p.isDeadline,
    trigger: p.trigger,
    cueAt: null,
    importance: p.importance,
    money: p.money,
    meds: p.meds,
    people: p.people,
    estMinutes: p.estMinutes,
    postponeCount: 0,
    cueStep: 0,
    createdAt: now.getTime(),
    lastTouchedAt: now.getTime(),
  };
  return { ...base, cueAt: initialCueAt(base, now) };
}

/** A parsed appointment with travel time becomes a leave event. */
export function leaveEventFromParsed(p: ParsedItem, now: Date, id: string): LeaveEvent | null {
  if (!p.event || !p.due?.date) return null;
  const time = p.due.time ?? DAYPART_TIME[p.due.daypart ?? 'morning'];
  const startAt = atTime(p.due.date, time);
  if (startAt <= now.getTime()) return null;
  return {
    id,
    title: p.title,
    startAt,
    travelMin: p.event.travelMin,
    prepMin: DEFAULT_PREP_MIN,
    bufferMin: DEFAULT_BUFFER_MIN,
    checklist: DEFAULT_LEAVE_CHECKLIST.map((text) => ({ text, done: false })),
  };
}
