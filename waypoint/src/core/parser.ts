// Capture parser: turns a messy brain dump ("pay rent by the 14th, call mom
// tomorrow, waiting on refund from Amazon") into structured items.
//
// Design rules (from the product spec, Part 7 §33):
//  - Extract only what the user said. Never invent a date.
//  - At most one ambiguity question per item, always with button options.
//  - Never infer health, mood or diagnosis. Medication is only a reminder.
//
// This is a deterministic rule-based parser so it works offline and is fully
// testable. An LLM can be layered on top for low-confidence input later.

import {
  DAYPART_TIME,
  HOUR,
  MIN,
  MONTHS,
  WEEKDAYS,
  addDays,
  daysUntilWeekday,
  formatDay,
  fromDateKey,
  toDateKey,
} from './dates';
import type { Daypart, Due, Importance, ItemKind, Size, Trigger } from './types';

export interface AmbiguityOption {
  label: string;
  patch: Partial<Pick<ParsedItem, 'due' | 'trigger'>>;
}

export interface Ambiguity {
  question: string;
  options: AmbiguityOption[];
}

export interface ParsedItem {
  title: string;
  kind: ItemKind;
  why: string | null;
  due: Due | null;
  isDeadline: boolean;
  trigger: Trigger | null;
  people: string[];
  money: boolean;
  meds: boolean;
  estMinutes: number | null;
  importance: Importance;
  /** A starting-size hint, e.g. "I can't deal with my taxes" → 'cant'. */
  sizeHint: Size | null;
  /** Present when the capture describes an appointment with travel time. */
  event: { travelMin: number } | null;
  ambiguity: Ambiguity | null;
  /** 0–1. Below ~0.6 the UI highlights the item for a glance. */
  confidence: number;
}

export interface ParseResult {
  items: ParsedItem[];
  /** Set when the capture reads as distress rather than tasks. */
  signal: 'overwhelm' | null;
}

const ACTION_VERBS = [
  'call', 'ring', 'phone', 'pay', 'email', 'e-mail', 'text', 'message', 'reply', 'buy',
  'finish', 'ask', 'book', 'send', 'take', 'pick', 'get', 'clean', 'tidy', 'write',
  'check', 'cancel', 'return', 'submit', 'fix', 'order', 'renew', 'file', 'post',
  'wash', 'do', 'make', 'meet', 'see', 'visit', 'start', 'read', 'study', 'remind',
  'remember', 'tell', 'collect', 'drop', 'print', 'sign', 'schedule', 'water', 'feed',
  'waiting', 'wait',
];

const GROCERIES = new Set([
  'groceries', 'grocery', 'milk', 'eggs', 'bread', 'butter', 'cheese', 'toothpaste',
  'shampoo', 'soap', 'coffee', 'tea', 'sugar', 'rice', 'pasta', 'apples', 'bananas',
  'onions', 'tomatoes', 'potatoes', 'chicken', 'yogurt', 'cereal', 'juice', 'water',
  'batteries', 'detergent', 'tissues', 'vegetables', 'fruit', 'flour', 'oil', 'salt',
]);

const FAMILY = new Set([
  'mom', 'mum', 'dad', 'mother', 'father', 'sister', 'brother', 'grandma', 'grandpa',
  'nan', 'wife', 'husband', 'partner', 'boss', 'manager', 'landlord', 'doctor',
]);

const NAME_VERBS = /\b(?:ask|call|ring|phone|text|email|message|tell|meet|see|remind|visit|thank|with)\s+([A-Za-z][a-z]+)/g;

// Full weekday names match anywhere. Abbreviations ("sat", "wed") only match
// after a preposition so "sat down" and "wed" in other senses are not dates.
const WEEKDAY_RE =
  '(monday|tuesday|wednesday|thursday|friday|saturday|sunday|(?<=(?:on|by|before|until|due|next|this) )(?:mon|tues?|wed|thu(?:rs?)?|fri|sat|sun))';

const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*';

const OVERWHELM_RE =
  /\b(so behind|too much|overwhelm\w*|can'?t cope|everything is|i'?m drowning|so much to do|can'?t do this)\b/i;

function weekdayIndex(token: string): number {
  const t = token.toLowerCase().slice(0, 3);
  return WEEKDAYS.findIndex((w) => w.startsWith(t));
}

function monthIndex(token: string): number {
  const t = token.toLowerCase().slice(0, 3);
  return MONTHS.findIndex((m) => m === t);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hhmm(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Interpret a bare hour with no am/pm the way people usually mean it. */
function resolveHour(h: number, meridiem: string | undefined): number {
  const mer = meridiem?.toLowerCase();
  if (mer === 'pm') return h === 12 ? 12 : h + 12;
  if (mer === 'am') return h === 12 ? 0 : h;
  if (h >= 7 && h <= 11) return h; // "at 8" → 8am
  if (h >= 1 && h <= 6) return h + 12; // "at 5" → 5pm
  return h;
}

/** Next date with this day-of-month (this month if not passed, else next). */
function nextDayOfMonth(now: Date, day: number, month?: number): Date {
  const year = now.getFullYear();
  const today = addDays(now, 0);
  if (month !== undefined) {
    const candidate = new Date(year, month, day);
    return candidate < today ? new Date(year + 1, month, day) : candidate;
  }
  return day < now.getDate()
    ? new Date(year, now.getMonth() + 1, day)
    : new Date(year, now.getMonth(), day);
}

/** Split a dump into individual capture segments. */
export function splitCapture(text: string): string[] {
  const cleaned = text
    .replace(/^\s*(okay|ok|um+|so|right)[,\s]+(so[,\s]+)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  // Commas, semicolons, newlines and sentence breaks separate items...
  const raw = cleaned.split(/\s*(?:[\n;]+|,|\.\s+)\s*/).filter(Boolean);

  // ...except a trailing "25 min drive" belongs to the previous segment.
  const merged: string[] = [];
  for (const seg of raw) {
    if (/^\d+\s*(?:min|mins|minutes)\s+(?:drive|walk|ride|away|travel|commute)/i.test(seg) && merged.length) {
      merged[merged.length - 1] += `, ${seg}`;
    } else {
      merged.push(seg);
    }
  }

  // "and <verb>" starts a new item; "mom and dad" does not.
  const verbAlt = ACTION_VERBS.join('|');
  const andSplit = new RegExp(`\\s+(?:and|then|also)\\s+(?:then\\s+)?(?=(?:${verbAlt})\\b)`, 'i');
  const out: string[] = [];
  for (const seg of merged) {
    for (const part of seg.split(andSplit)) {
      const p = part.replace(/^(and|then|also)\s+/i, '').trim();
      if (!p) continue;
      // "milk eggs bread" → three shopping items.
      const words = p.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w) => w && w !== 'and');
      if (words.length >= 2 && words.every((w) => GROCERIES.has(w))) {
        out.push(...words.map((w) => `buy ${w}`));
      } else {
        out.push(p);
      }
    }
  }
  return out;
}

/** Parse a whole capture (one or many items). */
export function parseCapture(text: string, now: Date): ParseResult {
  const segments = splitCapture(text);
  const items: ParsedItem[] = [];
  let signal: ParseResult['signal'] = null;

  for (const seg of segments) {
    const isDistress = OVERWHELM_RE.test(seg);
    const cantMatch = /\bcan'?t (?:deal with|face|do|handle|start)\s+(?:my |the |this )?(.+)$/i.exec(seg);
    if (cantMatch?.[1] && !/^(this|it|anything|everything|that)$/i.test(cantMatch[1].trim())) {
      const item = parseSegment(cantMatch[1], now);
      item.sizeHint = 'cant';
      items.push(item);
      continue;
    }
    if (isDistress) {
      signal = 'overwhelm';
      continue;
    }
    items.push(parseSegment(seg, now));
  }
  return { items: items.filter((i) => i.title.length > 0), signal };
}

/** Parse one item. Exported for focused tests. */
export function parseSegment(segment: string, now: Date): ParsedItem {
  let rest = ` ${segment.trim()} `;
  const lowerOriginal = segment.toLowerCase();

  // Remove the first match of `re` from `rest` and return it.
  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(rest);
    if (m) rest = `${rest.slice(0, m.index)} ${rest.slice(m.index + m[0].length)}`;
    return m;
  };

  let remindFlag = false;
  let why: string | null = null;
  let trigger: Trigger | null = null;
  let dateKey: string | null = null;
  let time: string | null = null;
  let daypart: Daypart | null = null;
  let isDeadline = false;
  let ambiguity: Ambiguity | null = null;
  let travelMin: number | null = null;
  let confidence = 0.9;

  // --- travel time for appointments ("dentist at 6pm, 25 min drive") ---
  const travel = take(/,?\s*(\d{1,3})\s*(?:min|mins|minutes)\s+(?:drive|walk|ride|away|travel|commute)\b/i);
  if (travel?.[1]) travelMin = Number(travel[1]);

  // --- "because ..." → why (and maybe a leave-for trigger) ---
  const because = take(/\s(?:because|since|'cause|cos)\s+(.+)$/i);
  if (because?.[1]) {
    why = because[1].trim().replace(/[.!]+$/, '');
    const goingTo = /going to (?:the )?([a-z]+)/i.exec(why);
    if (goingTo?.[1]) trigger = { type: 'leave_for', place: goingTo[1].toLowerCase() };
  }

  // --- "remind me (to)" / fillers ---
  if (take(/\b(?:please\s+)?remind me(?:\s+to)?\b/i)) remindFlag = true;
  if (take(/\bdon'?t let me forget(?:\s+to)?\b/i)) remindFlag = true;
  take(/^\s*(?:i\s+(?:really\s+)?(?:need|have|got|want)\s+to|i\s+need|need\s+to|have\s+to|gotta|i\s+should|i\s+must|remember\s+to|i'?ll|must)\s+/i);

  // --- event / place / person triggers ---
  if (take(/\bwhen i(?:'m| am| get| arrive| reach)?(?: back)?(?: at)? home\b/i)) {
    trigger = { type: 'place', place: 'home', on: 'arrive' };
  }
  const leaveFor = take(/\bwhen i leave for (?:the )?([a-z]+)\b/i);
  if (leaveFor?.[1]) trigger = { type: 'leave_for', place: leaveFor[1].toLowerCase() };
  const leavePlace = take(/\bwhen i leave (?:the )?(work|office|home|house|gym|school|uni)\b/i);
  if (leavePlace?.[1]) trigger = { type: 'place', place: leavePlace[1].toLowerCase(), on: 'leave' };
  const arrive = take(/\bwhen i(?:'m| am| get| arrive| reach)? (?:to |at )?(?:the )?(work|office|gym|pharmacy|supermarket|store|shop|bank|school|uni)\b/i);
  if (arrive?.[1]) trigger = { type: 'place', place: arrive[1].toLowerCase(), on: 'arrive' };
  const see = take(/\b(?:next time|when) i see ([A-Za-z]+)\b/i);
  if (see?.[1]) trigger = { type: 'person', name: capitalize(see[1]) };

  // --- relative times: "in 20 minutes", "in an hour" ---
  const rel = take(/\bin (\d+|an?|one|two|three|half an) (min|mins|minutes|hour|hours|hr|hrs)\b/i);
  if (rel?.[1] && rel[2]) {
    const n = /^\d+$/.test(rel[1]) ? Number(rel[1]) : ({ a: 1, an: 1, one: 1, two: 2, three: 3, 'half an': 0.5 } as Record<string, number>)[rel[1].toLowerCase()] ?? 1;
    const ms = rel[2].toLowerCase().startsWith('h') ? n * HOUR : n * MIN;
    const at = new Date(now.getTime() + ms);
    dateKey = toDateKey(at);
    time = hhmm(at.getHours(), at.getMinutes());
  }

  // --- dates ---
  const deadlineWord = '(?:(by|before|due|on|until)\\s+)?';
  if (take(/\bday after tomorrow\b/i)) dateKey = toDateKey(addDays(now, 2));
  const tomorrow = take(new RegExp(`\\b${deadlineWord}(tomorrow|tmrw|tmr)\\b`, 'i'));
  if (tomorrow) {
    dateKey = toDateKey(addDays(now, 1));
    if (tomorrow[1] && /by|before|due|until/i.test(tomorrow[1])) isDeadline = true;
  }
  if (take(/\btonight\b/i)) {
    dateKey = toDateKey(now);
    time = '20:00';
  }
  const thisPart = take(/\bthis (morning|afternoon|evening)\b/i);
  if (thisPart?.[1]) {
    dateKey = toDateKey(now);
    daypart = thisPart[1].toLowerCase() as Daypart;
  }
  const today = take(new RegExp(`\\b${deadlineWord}today\\b`, 'i'));
  if (today) {
    dateKey = toDateKey(now);
    if (today[1] && /by|before|due|until/i.test(today[1])) isDeadline = true;
  }
  if (take(/\b(?:this )?weekend\b/i)) {
    dateKey = toDateKey(addDays(now, daysUntilWeekday(now, 6) || 7));
    daypart ??= 'morning';
  }
  if (take(/\bnext week\b/i)) {
    dateKey = toDateKey(addDays(now, daysUntilWeekday(now, 1) || 7));
    confidence -= 0.2;
  }

  // Weekdays, ignoring topics like "email boss about Friday".
  const wd = new RegExp(`(\\babout\\s+|\\bre\\s+)?\\b${deadlineWord}(next |this )?${WEEKDAY_RE}\\b`, 'i').exec(rest);
  if (wd && !wd[1] && wd[4]) {
    rest = `${rest.slice(0, wd.index)} ${rest.slice(wd.index + wd[0].length)}`;
    const idx = weekdayIndex(wd[4]);
    const until = daysUntilWeekday(now, idx) || 7;
    const nearer = addDays(now, until);
    if (wd[2] && /by|before|due|until/i.test(wd[2])) isDeadline = true;
    if (wd[3]?.trim().toLowerCase() === 'next') {
      // "next Friday" is genuinely ambiguous. Default to the nearer date:
      // being reminded early is safer than being reminded late.
      const later = addDays(nearer, 7);
      dateKey = toDateKey(nearer);
      ambiguity = {
        question: 'Which Friday did you mean?'.replace('Friday', capitalize(WEEKDAYS[idx] ?? 'day')),
        options: [
          { label: `${capitalize(formatDay(toDateKey(nearer), now))} (${nearer.getDate()})`, patch: { due: { date: toDateKey(nearer), time: null, daypart: null } } },
          { label: `${capitalize(WEEKDAYS[idx]?.slice(0, 3) ?? '')} ${later.getDate()}`, patch: { due: { date: toDateKey(later), time: null, daypart: null } } },
        ],
      };
      confidence -= 0.2;
    } else {
      dateKey = toDateKey(nearer);
    }
  }

  // "14 Oct" / "Oct 14" / "the 14th"
  const dm = take(new RegExp(`\\b${deadlineWord}(?:the )?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\b`, 'i'));
  const md = dm ? null : take(new RegExp(`\\b${deadlineWord}${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'));
  const nth = dm || md ? null : take(new RegExp(`\\b${deadlineWord}(?:the )?(\\d{1,2})(st|nd|rd|th)\\b`, 'i'));
  if (dm?.[2] && dm[3]) {
    dateKey = toDateKey(nextDayOfMonth(now, Number(dm[2]), monthIndex(dm[3])));
    if (dm[1] && /by|before|due|until/i.test(dm[1])) isDeadline = true;
  } else if (md?.[2] && md[3]) {
    dateKey = toDateKey(nextDayOfMonth(now, Number(md[3]), monthIndex(md[2])));
    if (md[1] && /by|before|due|until/i.test(md[1])) isDeadline = true;
  } else if (nth?.[2]) {
    dateKey = toDateKey(nextDayOfMonth(now, Number(nth[2])));
    if (nth[1] && /by|before|due|until/i.test(nth[1])) isDeadline = true;
  }

  // --- times ---
  const clock = take(/\b(?:at\s+|@\s*)?(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (clock?.[1] && clock[2]) {
    time = hhmm(resolveHour(Number(clock[1]), clock[3]), Number(clock[2]));
  } else {
    const hour = take(/\b(?:at\s+|@\s*)(\d{1,2})\s*(am|pm)?\b/i) ?? take(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (hour?.[1]) time = hhmm(resolveHour(Number(hour[1]), hour[2]), 0);
  }
  if (take(/\b(?:at\s+)?(?:noon|midday)\b/i)) time = '12:00';
  const part = take(/\b(?:in the |this |tomorrow )?(morning|afternoon|evening)\b/i);
  if (part?.[1]) daypart = part[1].toLowerCase() as Daypart;

  // A bare time or daypart with no date means the next occurrence.
  if (!dateKey && (time || daypart)) {
    const probe = time ?? DAYPART_TIME[daypart ?? 'morning'];
    const [h, m] = probe.split(':').map(Number);
    const candidate = new Date(now);
    candidate.setHours(h ?? 0, m ?? 0, 0, 0);
    dateKey = toDateKey(candidate.getTime() > now.getTime() ? now : addDays(now, 1));
  }

  // --- kind ---
  let title = rest;
  let kind: ItemKind = 'task';
  if (/^\s*(idea|note)\s*[:\-–]/i.test(title)) {
    kind = 'note';
    title = title.replace(/^\s*(idea|note)\s*[:\-–]\s*/i, '');
  } else if (/^\s*(waiting|wait)\s+(for|on)\b/i.test(title) || /\b(will|should)\s+(send|get back|reply|email me|call me)\b|\bhear back\b/i.test(title)) {
    kind = 'waiting';
    title = title.replace(/^\s*(waiting|wait)\s+(for|on)\s+/i, '').replace(/^\s*to\s+/i, '');
  } else if (
    /^\s*(?:buy|get|pick up)\s+(\w+)/i.test(title) && GROCERIES.has((/^\s*(?:buy|get|pick up)\s+(\w+)/i.exec(title)?.[1] ?? '').toLowerCase())
  ) {
    kind = 'shopping';
    title = title.replace(/^\s*(?:buy|get|pick up)\s+/i, '');
  } else if (/^\s*(groceries|grocery shopping|[a-z]+)\s*$/i.test(title) && GROCERIES.has(title.trim().toLowerCase())) {
    kind = 'shopping';
  } else if (remindFlag || trigger || time || daypart) {
    kind = 'reminder';
  }

  // --- tidy the title ---
  title = title
    .replace(/\s+(on|by|at|for|before|until|due|to|the|and)\s*$/i, ' ')
    .replace(/^\s*(to|and|then)\s+/i, ' ')
    .replace(/[\s,.;:!?-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  title = capitalize(title);

  // --- people ---
  const people: string[] = [];
  for (const m of segment.matchAll(NAME_VERBS)) {
    const name = m[1] ?? '';
    const lower = name.toLowerCase();
    if (FAMILY.has(lower)) people.push(capitalize(lower));
    else if (/^[A-Z]/.test(name) && !WEEKDAYS.some((w) => w.startsWith(lower.slice(0, 3)))) people.push(name);
  }
  if (trigger?.type === 'person' && !people.includes(trigger.name)) people.push(trigger.name);

  // "ask Rahul about the car" is best cued when you next see Rahul.
  const askMatch = /\bask\s+([A-Z][a-z]+)\b/.exec(segment);
  if (!trigger && askMatch?.[1] && !dateKey && !FAMILY.has(askMatch[1].toLowerCase())) {
    const name = askMatch[1];
    trigger = { type: 'person', name };
    if (kind === 'task') kind = 'reminder';
    const sat = addDays(now, daysUntilWeekday(now, 6) || 7);
    ambiguity = {
      question: `When should I bring this up?`,
      options: [
        { label: `Next time I see ${name}`, patch: { trigger: { type: 'person', name } } },
        { label: 'Saturday morning', patch: { trigger: null, due: { date: toDateKey(sat), time: null, daypart: 'morning' } } },
      ],
    };
  }

  // --- money, meds, special deadlines ---
  const money = /\b(pay|paid|bill|bills|rent|invoice|fee|fine|refund|subscription|trial|credit card|loan|emi|tax|taxes|mortgage|insurance)\b|[$₹£€]/i.test(lowerOriginal);
  const meds = /\b(meds|medication|medicine|pills?|tablets?)\b/i.test(lowerOriginal);
  if (meds) kind = 'reminder';

  // Free trials and returns: cue a few days before the date the user named.
  if (dateKey && /\btrial\b/i.test(lowerOriginal)) {
    const named = fromDateKey(dateKey);
    why ??= `Trial charges ${formatDay(dateKey, now)}`;
    dateKey = toDateKey(addDays(named, -2));
    daypart ??= 'morning';
    isDeadline = false;
    kind = 'reminder';
  } else if (dateKey && /\breturn\b/i.test(lowerOriginal) && isDeadline) {
    const named = fromDateKey(dateKey);
    why ??= `Return window closes ${formatDay(dateKey, now)}`;
    dateKey = toDateKey(addDays(named, -3));
    isDeadline = false;
    kind = 'reminder';
  }

  // Waiting items default to "expected within a week".
  if (kind === 'waiting' && !dateKey) {
    dateKey = toDateKey(addDays(now, 7));
    isDeadline = true;
  }

  // --- ambiguity: a date with no time for a cue-type item ---
  if (!ambiguity && dateKey && !time && !daypart && !isDeadline && kind !== 'waiting' && kind !== 'shopping' && !trigger) {
    const label = formatDay(dateKey, now);
    ambiguity = {
      question: `When ${label}?`,
      options: (['morning', 'afternoon', 'evening'] as const).map((p) => ({
        label: capitalize(p),
        patch: { due: { date: dateKey, time: null, daypart: p } },
      })),
    };
    daypart = 'morning';
    confidence -= 0.1;
  }

  // --- estimate & importance ---
  const est = estimateMinutes(lowerOriginal, meds);
  const due: Due | null = dateKey ? { date: dateKey, time, daypart } : null;
  let importance: Importance = 'normal';
  if (meds || money) importance = 'high';
  if (due?.date && isDeadline) {
    const days = (fromDateKey(due.date).getTime() - fromDateKey(toDateKey(now)).getTime()) / (24 * HOUR);
    if (days <= 2) importance = 'high';
  }

  if (title.length < 3) confidence -= 0.3;
  if (!ACTION_VERBS.some((v) => lowerOriginal.includes(v)) && kind === 'task') confidence -= 0.15;

  return {
    title,
    kind,
    why,
    due,
    isDeadline,
    trigger,
    people,
    money,
    meds,
    estMinutes: est,
    importance,
    sizeHint: null,
    event: travelMin !== null ? { travelMin } : null,
    ambiguity,
    confidence: Math.max(0, Math.min(1, Number(confidence.toFixed(2)))),
  };
}

function estimateMinutes(text: string, meds: boolean): number | null {
  if (meds) return 1;
  if (/\b(pay|bill|rent|renew)\b/.test(text)) return 3;
  if (/\b(email|reply|text|message)\b/.test(text)) return 5;
  if (/\b(book|schedule|cancel)\b/.test(text)) return 5;
  if (/\b(call|ring|phone)\b/.test(text)) return 10;
  if (/\b(laundry|dishes|wash)\b/.test(text)) return 15;
  if (/\b(clean|tidy)\b/.test(text)) return 20;
  return null;
}
