// Shared domain types. The core is pure TypeScript with no DOM or React,
// so every rule here can be unit-tested deterministically.

export type ItemKind = 'task' | 'reminder' | 'waiting' | 'shopping' | 'note';
export type Daypart = 'morning' | 'afternoon' | 'evening';
export type Importance = 'low' | 'normal' | 'high' | 'critical';
export type Size = 'fine' | 'heavy' | 'cant';
export type Energy = 'low' | 'ok' | 'good';

export type Trigger =
  | { type: 'time' }
  | { type: 'place'; place: string; on: 'arrive' | 'leave' }
  | { type: 'person'; name: string }
  | { type: 'leave_for'; place: string };

export interface Due {
  /** Local calendar date, YYYY-MM-DD. */
  date: string | null;
  /** Local time, HH:MM (24h). */
  time: string | null;
  daypart: Daypart | null;
}

export interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  why?: string;
  status: 'open' | 'done' | 'dropped';
  bucket: 'soon' | 'scheduled' | 'waiting' | 'someday';
  due: Due | null;
  /** True when `due` is a hard deadline ("by the 14th") rather than a cue time. */
  isDeadline: boolean;
  trigger: Trigger | null;
  /** Epoch ms of the next time-based cue, if any. */
  cueAt: number | null;
  importance: Importance;
  money: boolean;
  meds: boolean;
  people: string[];
  estMinutes: number | null;
  postponeCount: number;
  /** How far up the reminder ladder this item has gone (0 = not cued yet). */
  cueStep: number;
  /** Set when the user swiped this away in "What now?" (cleared daily). */
  skippedAt?: number;
  createdAt: number;
  lastTouchedAt: number;
  doneAt?: number;
}

export interface Park {
  id: string;
  itemId: string | null;
  title: string;
  nextAction: string;
  where?: string;
  link?: string;
  createdAt: number;
  resumedAt?: number;
}

export interface LeaveEvent {
  id: string;
  title: string;
  /** Epoch ms of the event start. */
  startAt: number;
  travelMin: number;
  prepMin: number;
  bufferMin: number;
  checklist: { text: string; done: boolean }[];
  leftAt?: number;
}

export interface Session {
  id: string;
  itemId: string | null;
  title: string;
  size: Size;
  plannedMin: number;
  startedAt: number;
  endedAt?: number;
  endReason?: 'stop_here' | 'done' | 'kept_going' | 'parked';
}
