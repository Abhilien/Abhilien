// Cue engine: decides *when* an item should tap the user on the shoulder and
// *what* that tap says. Deterministic by design. No model decides when to
// interrupt someone.
//
// Spec: Part 3 §8.2 (reminder ladder), Part 7 §32 (cue engine).

import { DAYPART_TIME, HOUR, addDays, atTime, formatDay, fromDateKey, toDateKey } from './dates';
import type { Item, Trigger } from './types';

export type CueAction = 'do' | 'smaller' | 'later' | 'done' | 'drop' | 'still_waiting' | 'taken';
export type Tier = 'critical' | 'cue' | 'gentle' | 'digest';

export interface CueMessage {
  itemId: string;
  step: number;
  tier: Tier;
  title: string;
  body: string;
  actions: CueAction[];
}

export interface CueSettings {
  /** Max interruptive (non-critical) cues per day. */
  budget: number;
  quietStart: string; // HH:MM
  quietEnd: string; // HH:MM
}

export const DEFAULT_CUE_SETTINGS: CueSettings = { budget: 6, quietStart: '22:00', quietEnd: '07:30' };

/** Interruption bookkeeping for the current day. */
export interface CueLedger {
  dayKey: string;
  used: number;
  perItem: Record<string, number>;
}

export const MAX_TOUCHES_PER_ITEM_PER_DAY = 3;

export function freshLedger(now: Date): CueLedger {
  return { dayKey: toDateKey(now), used: 0, perItem: {} };
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isQuietHours(now: Date, s: CueSettings): boolean {
  const t = now.getHours() * 60 + now.getMinutes();
  const start = minutesOfDay(s.quietStart);
  const end = minutesOfDay(s.quietEnd);
  return start > end ? t >= start || t < end : t >= start && t < end;
}

/** Next moment quiet hours end (today or tomorrow). */
export function quietEndsAt(now: Date, s: CueSettings): number {
  const today = atTime(toDateKey(now), s.quietEnd);
  return today > now.getTime() ? today : atTime(toDateKey(addDays(now, 1)), s.quietEnd);
}

/**
 * When should the first cue fire? Context-triggered items (place/person)
 * return null: they fire on the event, not the clock.
 */
export function initialCueAt(item: Pick<Item, 'due' | 'isDeadline' | 'trigger' | 'kind'>, now: Date): number | null {
  const { due, trigger } = item;
  if (trigger && (trigger.type === 'place' || trigger.type === 'person')) return null;
  if (!due?.date) return null;

  if (item.kind === 'waiting') {
    // Follow up on the afternoon it was expected.
    return Math.max(atTime(due.date, '16:00'), now.getTime());
  }
  if (item.isDeadline) {
    // Deadlines get their first cue the morning before (or now, if that has passed).
    const dayBefore = atTime(toDateKey(addDays(fromDateKey(due.date), -1)), DAYPART_TIME.morning);
    return Math.max(dayBefore, now.getTime());
  }
  const time = due.time ?? DAYPART_TIME[due.daypart ?? 'morning'];
  return atTime(due.date, time);
}

/** How many ladder steps an item is allowed. */
export function maxStep(item: Pick<Item, 'importance' | 'isDeadline' | 'money' | 'kind'>): number {
  if (item.kind === 'waiting') return 1;
  if (item.importance === 'critical') return 4;
  if (item.importance === 'high' || item.isDeadline || item.money) return 3;
  if (item.importance === 'low') return 1;
  return 2;
}

function dueLabel(item: Item, now: Date): string {
  if (!item.due?.date) return '';
  return formatDay(item.due.date, now);
}

/** Ladder copy. Every string here is covered by the tone test. */
export function cueCopy(item: Item, step: number, now: Date): Pick<CueMessage, 'title' | 'body' | 'actions'> {
  const est = item.estMinutes ? ` · ~${item.estMinutes} min` : '';
  const when = dueLabel(item, now);

  if (item.kind === 'waiting') {
    return {
      title: `⏳ ${item.title}`,
      body: `This was expected ${when || 'by now'}. Want to nudge them?`,
      actions: ['do', 'still_waiting', 'done'],
    };
  }
  if (item.meds) {
    return { title: `💊 ${item.title}`, body: 'Tap when taken.', actions: ['taken', 'later'] };
  }
  if (item.postponeCount >= 3 && step >= 2) {
    return {
      title: `${item.title}`,
      body: 'This one keeps sliding. Want a smaller first step, or should we drop it?',
      actions: ['smaller', 'later', 'drop'],
    };
  }
  switch (step) {
    case 1:
      return {
        title: `💡 ${item.title}`,
        body: item.isDeadline && when ? `Due ${when}${est}.` : `Now's a good moment${est}.`,
        actions: ['do', 'later', 'done'],
      };
    case 2:
      return {
        title: item.title,
        body: item.why
          ? `Doing it now means: ${item.why.charAt(0).toLowerCase()}${item.why.slice(1)}. Want to start?`
          : item.money
            ? 'Handling it today avoids any late fees. Want to start?'
            : 'Still on your list. A 2-minute start is enough.',
        actions: ['do', 'smaller', 'later'],
      };
    case 3:
      return {
        title: item.title,
        body: 'Looks like that one slipped. Pick one: a 2-minute start now, or a better time?',
        actions: ['smaller', 'later', 'drop'],
      };
    default:
      return {
        title: `⏰ ${item.title}`,
        body: `Due ${when || 'soon'}. This one matters. Want to do it now?`,
        actions: ['do', 'later'],
      };
  }
}

/** Gap before the next ladder touch, if any. */
function nextTouchAt(item: Item, step: number, now: Date): number | null {
  if (step >= maxStep(item)) return null;
  const gap = step === 1 ? 3 * HOUR : 6 * HOUR;
  let next = now.getTime() + gap;
  if (item.isDeadline && item.due?.date) {
    // Make sure a touch lands on the deadline morning.
    const deadlineMorning = atTime(item.due.date, DAYPART_TIME.morning);
    if (deadlineMorning > now.getTime() + HOUR) next = Math.min(next, deadlineMorning);
  }
  return next;
}

export interface CueDecision {
  message: CueMessage | null;
  /** New `cueAt` for the item (null = no more time-based cues). */
  nextCueAt: number | null;
  cueStep: number;
  ledger: CueLedger;
}

/**
 * Evaluate a due item. Applies quiet hours, the per-item daily cap and the
 * daily interruption budget. Over-budget cues become digest entries.
 */
export function evaluateCue(item: Item, ledgerIn: CueLedger, now: Date, settings: CueSettings = DEFAULT_CUE_SETTINGS): CueDecision {
  const ledger = ledgerIn.dayKey === toDateKey(now) ? { ...ledgerIn, perItem: { ...ledgerIn.perItem } } : freshLedger(now);
  const critical = item.importance === 'critical';

  if (item.status !== 'open') return { message: null, nextCueAt: null, cueStep: item.cueStep, ledger };

  if (isQuietHours(now, settings) && !critical) {
    return { message: null, nextCueAt: quietEndsAt(now, settings), cueStep: item.cueStep, ledger };
  }

  const touches = ledger.perItem[item.id] ?? 0;
  if (touches >= MAX_TOUCHES_PER_ITEM_PER_DAY && !critical) {
    const tomorrowMorning = atTime(toDateKey(addDays(now, 1)), DAYPART_TIME.morning);
    return { message: null, nextCueAt: tomorrowMorning, cueStep: item.cueStep, ledger };
  }

  const step = Math.min(item.cueStep + 1, maxStep(item));
  const overBudget = ledger.used >= settings.budget && !critical;
  const tier: Tier = critical || step === 4 ? 'critical' : overBudget ? 'digest' : step >= 2 ? 'gentle' : 'cue';

  ledger.perItem[item.id] = touches + 1;
  if (tier !== 'digest' && !critical) ledger.used += 1;

  return {
    message: { itemId: item.id, step, tier, ...cueCopy(item, step, now) },
    nextCueAt: nextTouchAt(item, step, now),
    cueStep: step,
    ledger,
  };
}

// ---------------------------------------------------------------------------
// Smart "Later": event-anchored options first, never just "+10 min".

export type LaterOption =
  | { label: string; kind: 'time'; at: number }
  | { label: string; kind: 'trigger'; trigger: Trigger };

export function laterOptions(now: Date): LaterOption[] {
  const key = toDateKey(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const opts: LaterOption[] = [{ label: 'In an hour', kind: 'time', at: now.getTime() + HOUR }];
  if (mins < 17 * 60) opts.push({ label: 'This evening', kind: 'time', at: atTime(key, '19:00') });
  else if (mins < 20 * 60 + 30) opts.push({ label: 'Tonight, 9pm', kind: 'time', at: atTime(key, '21:00') });
  opts.push({ label: 'When I get home', kind: 'trigger', trigger: { type: 'place', place: 'home', on: 'arrive' } });
  opts.push({ label: 'Tomorrow morning', kind: 'time', at: atTime(toDateKey(addDays(now, 1)), DAYPART_TIME.morning) });
  return opts;
}

/** Apply a "Later" choice: reschedule, count the postponement, restart the ladder. */
export function applyLater(item: Item, option: LaterOption, now: Date): Item {
  const base = { ...item, postponeCount: item.postponeCount + 1, cueStep: 0, lastTouchedAt: now.getTime() };
  return option.kind === 'time'
    ? { ...base, cueAt: option.at, trigger: item.trigger?.type === 'leave_for' ? item.trigger : null }
    : { ...base, cueAt: null, trigger: option.trigger };
}

// ---------------------------------------------------------------------------
// Context events ("I'm home", "Leaving for work", "With Rahul").

export type ContextEvent =
  | { type: 'arrive'; place: string }
  | { type: 'leave'; place: string }
  | { type: 'leave_for'; place: string }
  | { type: 'person'; name: string };

const PLACE_ALIASES: Record<string, string> = { office: 'work', house: 'home', uni: 'school' };
const canonical = (p: string) => PLACE_ALIASES[p.toLowerCase()] ?? p.toLowerCase();

/** Items whose trigger matches a context event the user just reported. */
export function itemsForContext(items: Item[], ev: ContextEvent): Item[] {
  return items.filter((it) => {
    const t = it.trigger;
    if (it.status !== 'open' || !t) return false;
    switch (ev.type) {
      case 'arrive':
        return t.type === 'place' && t.on === 'arrive' && canonical(t.place) === canonical(ev.place);
      case 'leave':
        return t.type === 'place' && t.on === 'leave' && canonical(t.place) === canonical(ev.place);
      case 'leave_for':
        return t.type === 'leave_for' && canonical(t.place) === canonical(ev.place);
      case 'person':
        return t.type === 'person' && t.name.toLowerCase() === ev.name.toLowerCase();
    }
  });
}

/** A context-triggered cue always gets first-step copy and counts against the budget. */
export function contextCue(item: Item, now: Date): CueMessage {
  return { itemId: item.id, step: 1, tier: 'cue', ...cueCopy({ ...item, postponeCount: 0 }, 1, now) };
}

