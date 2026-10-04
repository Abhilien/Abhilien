// App state: a tiny external store (useSyncExternalStore) persisted to
// localStorage. Local-first by design: nothing leaves the device.

import { useRef, useSyncExternalStore } from 'react';
import {
  DEFAULT_CUE_SETTINGS,
  applyLater,
  contextCue,
  evaluateCue,
  freshLedger,
  itemsForContext,
  type ContextEvent,
  type CueLedger,
  type CueMessage,
  type LaterOption,
} from '../core/cues';
import { MIN, addDays, atTime, toDateKey } from '../core/dates';
import { daysAway, tidy } from '../core/freshStart';
import { itemFromParsed, leaveEventFromParsed } from '../core/items';
import { lateCorrection, planLeave } from '../core/leave';
import type { ParsedItem } from '../core/parser';
import type { Item, LeaveEvent, Park, Session } from '../core/types';
import { demoState } from './demo';

export interface Settings {
  budget: number;
  quietStart: string;
  quietEnd: string;
  learning: boolean;
  celebrate: boolean;
  systemNotifications: boolean;
}

export interface AppState {
  version: 1;
  items: Item[];
  parks: Park[];
  events: LeaveEvent[];
  sessions: Session[];
  /** Minutes the user left after the leave time we showed (lateness learning). */
  lags: number[];
  ledger: CueLedger;
  /** Fired cues waiting for the user (toasts) or for the digest. */
  inbox: CueMessage[];
  settings: Settings;
  lastOpenAt: number | null;
  overwhelmUntil: number | null;
  welcomeBackDays: number | null;
}

const KEY = 'waypoint:v1';

export const DEFAULT_SETTINGS: Settings = {
  budget: DEFAULT_CUE_SETTINGS.budget,
  quietStart: DEFAULT_CUE_SETTINGS.quietStart,
  quietEnd: DEFAULT_CUE_SETTINGS.quietEnd,
  learning: true,
  celebrate: true,
  systemNotifications: false,
};

export function emptyState(now: Date): AppState {
  return {
    version: 1,
    items: [],
    parks: [],
    events: [],
    sessions: [],
    lags: [],
    ledger: freshLedger(now),
    inbox: [],
    settings: DEFAULT_SETTINGS,
    lastOpenAt: null,
    overwhelmUntil: null,
    welcomeBackDays: null,
  };
}

function load(): AppState {
  const now = new Date();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 1) return { ...emptyState(now), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
    }
  } catch {
    // Storage blocked or corrupt: start fresh rather than crash.
  }
  return emptyState(now);
}

let state: AppState = typeof localStorage === 'undefined' ? emptyState(new Date()) : load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota: the app keeps working in memory.
  }
}

function set(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/**
 * Subscribe to a slice of state. The selector result is cached per state
 * version, so selectors may derive new arrays (e.g. `s.items.filter(...)`)
 * without causing render loops.
 */
export function useStore<T>(selector: (s: AppState) => T): T {
  const cache = useRef<{ source: AppState; value: T } | null>(null);
  const getSnapshot = () => {
    if (cache.current?.source !== state) cache.current = { source: state, value: selector(state) };
    return cache.current.value;
  };
  return useSyncExternalStore(subscribe, getSnapshot);
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

const touch = (s: AppState, id: string, patch: (i: Item) => Item): AppState => ({
  ...s,
  items: s.items.map((i) => (i.id === id ? patch(i) : i)),
  inbox: s.inbox.filter((m) => m.itemId !== id),
});

export const actions = {
  /** Called once when the app opens: fresh start + self-cleaning. */
  open(now: Date) {
    set((s) => {
      const { items } = tidy(s.items, now);
      return { ...s, items, welcomeBackDays: daysAway(s.lastOpenAt, now), lastOpenAt: now.getTime() };
    });
  },

  dismissWelcome() {
    set((s) => ({ ...s, welcomeBackDays: null }));
  },

  addParsed(parsed: ParsedItem[], now: Date) {
    set((s) => {
      const items = [...s.items];
      const events = [...s.events];
      for (const p of parsed) {
        const ev = leaveEventFromParsed(p, now, newId('ev'));
        if (ev) events.push(ev);
        else items.push(itemFromParsed(p, now, newId('it')));
      }
      return { ...s, items, events };
    });
  },

  complete(id: string, now: Date) {
    set((s) => touch(s, id, (i) => ({ ...i, status: 'done', doneAt: now.getTime(), cueAt: null, lastTouchedAt: now.getTime() })));
  },

  drop(id: string, now: Date) {
    set((s) => touch(s, id, (i) => ({ ...i, status: 'dropped', cueAt: null, lastTouchedAt: now.getTime() })));
  },

  restore(id: string, now: Date) {
    set((s) => touch(s, id, (i) => ({ ...i, status: 'open', bucket: i.due ? 'scheduled' : 'soon', lastTouchedAt: now.getTime() })));
  },

  later(id: string, option: LaterOption, now: Date) {
    set((s) => touch(s, id, (i) => applyLater(i, option, now)));
  },

  /** Medication "taken": log the time and cue again at the same time tomorrow. */
  taken(id: string, now: Date) {
    set((s) =>
      touch(s, id, (i) => ({
        ...i,
        doneAt: now.getTime(),
        cueStep: 0,
        cueAt: i.due?.time ? atTime(toDateKey(addDays(now, 1)), i.due.time) : null,
        lastTouchedAt: now.getTime(),
      })),
    );
  },

  stillWaiting(id: string, now: Date) {
    set((s) => touch(s, id, (i) => ({ ...i, cueAt: now.getTime() + 3 * 24 * 60 * MIN, lastTouchedAt: now.getTime() })));
  },

  skip(id: string, now: Date) {
    set((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, skippedAt: now.getTime() } : i)) }));
  },

  dismissMessage(itemId: string) {
    set((s) => ({ ...s, inbox: s.inbox.filter((m) => m.itemId !== itemId) }));
  },

  /** Scheduler tick: fire every item whose cue time has arrived. */
  tick(now: Date) {
    set((s) => {
      if (s.overwhelmUntil && s.overwhelmUntil > now.getTime()) return s;
      let ledger = s.ledger.dayKey === toDateKey(now) ? s.ledger : freshLedger(now);
      const inbox = [...s.inbox];
      let changed = false;
      const items = s.items.map((item) => {
        if (item.status !== 'open' || item.cueAt === null || item.cueAt > now.getTime()) return item;
        const d = evaluateCue(item, ledger, now, s.settings);
        ledger = d.ledger;
        changed = true;
        if (d.message) {
          const i = inbox.findIndex((m) => m.itemId === item.id);
          if (i >= 0) inbox.splice(i, 1);
          inbox.push(d.message);
        }
        return { ...item, cueAt: d.nextCueAt, cueStep: d.cueStep };
      });
      return changed ? { ...s, items, ledger, inbox } : s;
    });
  },

  /** "I'm home", "Leaving for work", "With Rahul". */
  context(ev: ContextEvent, now: Date): number {
    const matches = itemsForContext(state.items, ev);
    set((s) => ({
      ...s,
      inbox: [...s.inbox.filter((m) => !matches.some((x) => x.id === m.itemId)), ...matches.map((i) => contextCue(i, now))],
      items: s.items.map((i) => (matches.some((x) => x.id === i.id) ? { ...i, lastTouchedAt: now.getTime() } : i)),
    }));
    return matches.length;
  },

  // --- Start / Park / Resume ---------------------------------------------

  startSession(session: Session) {
    set((s) => ({
      ...s,
      sessions: [...s.sessions, session],
      items: session.itemId ? s.items.map((i) => (i.id === session.itemId ? { ...i, lastTouchedAt: session.startedAt } : i)) : s.items,
      inbox: session.itemId ? s.inbox.filter((m) => m.itemId !== session.itemId) : s.inbox,
    }));
  },

  endSession(id: string, reason: Session['endReason'], now: Date) {
    set((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, endedAt: now.getTime(), endReason: reason } : x)) }));
  },

  park(p: Omit<Park, 'id' | 'createdAt'>, now: Date) {
    set((s) => ({
      ...s,
      // One live park per task: a new snapshot replaces the old one.
      parks: [...s.parks.filter((x) => x.resumedAt || x.title !== p.title), { ...p, id: newId('pk'), createdAt: now.getTime() }],
    }));
  },

  resume(id: string, now: Date) {
    set((s) => ({ ...s, parks: s.parks.map((p) => (p.id === id ? { ...p, resumedAt: now.getTime() } : p)) }));
  },

  discardPark(id: string) {
    set((s) => ({ ...s, parks: s.parks.filter((p) => p.id !== id) }));
  },

  // --- Leave ------------------------------------------------------------

  addEvent(ev: Omit<LeaveEvent, 'id'>) {
    set((s) => ({ ...s, events: [...s.events, { ...ev, id: newId('ev') }] }));
  },

  toggleChecklist(eventId: string, index: number) {
    set((s) => ({
      ...s,
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, checklist: e.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c)) } : e,
      ),
    }));
  },

  /** "I'm leaving": records how late vs the leave time we displayed. */
  leaving(eventId: string, now: Date) {
    set((s) => {
      const ev = s.events.find((e) => e.id === eventId);
      if (!ev) return s;
      const shown = planLeave(ev, s.settings.learning ? lateCorrection(s.lags).correctionMin : 0).leaveAt;
      const lag = Math.round((now.getTime() - shown) / MIN);
      return {
        ...s,
        events: s.events.map((e) => (e.id === eventId ? { ...e, leftAt: now.getTime() } : e)),
        lags: s.settings.learning ? [...s.lags, lag].slice(-30) : s.lags,
      };
    });
  },

  removeEvent(id: string) {
    set((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
  },

  forgetLateness() {
    set((s) => ({ ...s, lags: [] }));
  },

  // --- Recover ----------------------------------------------------------

  setOverwhelm(until: number | null) {
    set((s) => ({ ...s, overwhelmUntil: until }));
  },

  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },

  exportJSON(): string {
    return JSON.stringify(state, null, 2);
  },

  deleteEverything(now: Date) {
    set(() => ({ ...emptyState(now), lastOpenAt: now.getTime() }));
  },

  loadDemo(now: Date) {
    set((s) => ({ ...demoState(now), settings: s.settings, lastOpenAt: now.getTime() }));
    actions.tick(now);
  },
};
