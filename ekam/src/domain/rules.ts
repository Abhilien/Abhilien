// The connection engine. Pure functions: State in, State out.
//
// Invariants enforced here:
//  • A person holds at most ONE Primary per kind (a paused Primary still holds the slot).
//  • Mutual interest never auto-creates a conversation; it creates a waiting connection.
//  • A Primary is always shared: both people hold the same connection in their slot.

import { entitlements, PRIMARY_SLOTS_PER_KIND } from './entitlements';
import { daysBetween, FEEDBACK_RELEASE_DAYS, screenComment } from './trust';
import type {
  CheckIn,
  Connection,
  DatePlan,
  FeedbackEntry,
  Kind,
  Plan,
  ReportReason,
  Settings,
  Stage,
  State,
  Trait,
} from './types';
import { REACH_ORDER } from './labels';

let counter = 0;
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const clone = <T>(v: T): T => structuredClone(v);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const other = (c: Connection, uid: string) => (c.users[0] === uid ? c.users[1] : c.users[0]);
export const involves = (c: Connection, uid: string) => c.users.includes(uid);
export const holdsSlot = (c: Connection) => c.status === 'primary' || c.status === 'paused';

export function primaryOf(s: State, uid: string, kind: Kind): Connection | undefined {
  return s.connections.find((c) => c.kind === kind && holdsSlot(c) && involves(c, uid));
}

export function slotFree(s: State, uid: string, kind: Kind, exceptId?: string): boolean {
  const held = s.connections.filter(
    (c) => c.id !== exceptId && c.kind === kind && holdsSlot(c) && involves(c, uid),
  ).length;
  return held < PRIMARY_SLOTS_PER_KIND;
}

export function waitingOf(s: State, uid: string, kind: Kind): Connection[] {
  return s.connections
    .filter((c) => c.kind === kind && c.status === 'mutual' && involves(c, uid))
    .sort((a, b) => a.mutualAt.localeCompare(b.mutualAt));
}

export function openConnectionBetween(s: State, a: string, b: string): Connection | undefined {
  return s.connections.find((c) => c.status !== 'closed' && involves(c, a) && involves(c, b));
}

export const hasInterest = (s: State, from: string, to: string, kind: Kind) =>
  s.interests.some((i) => i.from === from && i.to === to && i.kind === kind);

export const hasPassed = (s: State, from: string, to: string, kind: Kind) =>
  s.passes.some((p) => p.from === from && p.to === to && p.kind === kind);

export const name = (s: State, uid: string) => s.users[uid]?.profile.firstName ?? 'Someone';

// ---------------------------------------------------------------------------
// Internal helpers (operate on a draft)
// ---------------------------------------------------------------------------

function notify(d: State, forId: string, text: string, link?: string) {
  d.notices.unshift({ id: newId('n'), for: forId, text, at: d.now, read: false, link });
}

function system(c: Connection, text: string, at: string) {
  c.messages.push({ id: newId('m'), from: 'system', text, at, kind: 'system' });
}

function find(d: State, connId: string): Connection {
  const c = d.connections.find((x) => x.id === connId);
  if (!c) throw new Error(`Connection ${connId} not found`);
  return c;
}

function blankConnection(a: string, b: string, kind: Kind, at: string): Connection {
  return {
    id: newId('c'),
    users: [a, b],
    kind,
    status: 'mutual',
    mutualAt: at,
    stagesReached: [],
    messages: [],
    meetingReady: {},
    checkins: {},
    feedbackDue: [],
  };
}

function activate(d: State, c: Connection) {
  c.status = 'primary';
  c.primarySince = d.now;
  c.invite = undefined;
  c.checkins = {};
  if (!c.stagesReached.includes('primary')) c.stagesReached.push('primary');
}

// ---------------------------------------------------------------------------
// Discovery → Mutual interest
// ---------------------------------------------------------------------------

export type InterestOutcome =
  | { type: 'sent' }
  | { type: 'exists'; connId: string }
  | { type: 'mutual'; connId: string; slotFree: boolean };

export function expressInterest(
  s: State,
  from: string,
  to: string,
  kind: Kind,
): { state: State; outcome: InterestOutcome } {
  const existing = openConnectionBetween(s, from, to);
  if (existing) return { state: s, outcome: { type: 'exists', connId: existing.id } };

  const d = clone(s);
  if (!hasInterest(d, from, to, kind)) d.interests.push({ from, to, kind, at: d.now });

  if (!hasInterest(d, to, from, kind)) return { state: d, outcome: { type: 'sent' } };

  const c = blankConnection(from, to, kind, d.now);
  d.connections.push(c);
  const label = kind === 'romantic' ? 'mutual interest' : 'mutual friendship interest';
  notify(d, to, `You have ${label} with ${name(d, from)}.`, `/connections?kind=${kind}`);
  notify(d, from, `You have ${label} with ${name(d, to)}.`, `/connections?kind=${kind}`);
  return { state: d, outcome: { type: 'mutual', connId: c.id, slotFree: slotFree(d, from, kind) } };
}

export function pass(s: State, from: string, to: string, kind: Kind): State {
  if (hasPassed(s, from, to, kind)) return s;
  const d = clone(s);
  d.passes.push({ from, to, kind });
  return d;
}

// ---------------------------------------------------------------------------
// Mutual interest → Primary
// ---------------------------------------------------------------------------

export type StartOutcome = 'primary' | 'invited' | 'slot-occupied';

/**
 * Ask to make a waiting connection Primary. It becomes Primary only when both
 * people have a free slot; otherwise the invitation is held, respectfully.
 */
export function startPrimary(s: State, connId: string, by: string): { state: State; outcome: StartOutcome } {
  const c0 = find(s, connId);
  if (c0.status !== 'mutual') throw new Error('Only a waiting connection can become Primary');
  if (!slotFree(s, by, c0.kind)) return { state: s, outcome: 'slot-occupied' };

  const d = clone(s);
  const c = find(d, connId);
  const them = other(c, by);
  if (slotFree(d, them, c.kind)) {
    activate(d, c);
    system(
      c,
      c.kind === 'romantic'
        ? "You're now each other's Primary connection. Take your time."
        : "You're now each other's Primary friend.",
      d.now,
    );
    notify(d, them, `${name(d, by)} is now your Primary ${c.kind === 'romantic' ? 'connection' : 'friend'}.`, `/chat/${c.id}`);
    return { state: d, outcome: 'primary' };
  }
  c.invite = { by, at: d.now };
  notify(d, them, `${name(d, by)} would like to make your connection Primary whenever you're ready.`, `/connections?kind=${c.kind}`);
  return { state: d, outcome: 'invited' };
}

// ---------------------------------------------------------------------------
// Resolving a Primary
// ---------------------------------------------------------------------------

/** Pause in place: the slot stays reserved until someone explicitly releases it. */
export function pauseConnection(s: State, connId: string, by: string, reason: string): State {
  const d = clone(s);
  const c = find(d, connId);
  if (c.status !== 'primary') return s;
  c.status = 'paused';
  c.pause = { by, reason, at: d.now };
  system(c, `${name(d, by)} paused this connection (${reason.toLowerCase()}). It stays reserved for you both.`, d.now);
  notify(d, other(c, by), `${name(d, by)} paused your connection for a little while. It's still reserved.`, `/chat/${c.id}`);
  return d;
}

export function resumeConnection(s: State, connId: string, by: string): State {
  const d = clone(s);
  const c = find(d, connId);
  if (c.status !== 'paused') return s;
  c.status = 'primary';
  c.pause = undefined;
  system(c, `${name(d, by)} resumed this connection.`, d.now);
  notify(d, other(c, by), `${name(d, by)} resumed your connection.`, `/chat/${c.id}`);
  return d;
}

/** Release the Primary slot but keep the mutual interest: both return to waiting. */
export function returnToWaiting(s: State, connId: string, by: string): State {
  const d = clone(s);
  const c = find(d, connId);
  if (!holdsSlot(c)) return s;
  c.status = 'mutual';
  c.pause = undefined;
  c.primarySince = undefined;
  c.mutualAt = d.now;
  system(c, `${name(d, by)} stepped back from Primary. Your mutual interest is kept.`, d.now);
  notify(d, other(c, by), `${name(d, by)} stepped back from your Primary connection. Your mutual interest is kept.`, `/connections?kind=${c.kind}`);
  return d;
}

/**
 * Romantic → friendship. In the product this is a mutual choice; the UI asks
 * both people before calling this.
 */
export function moveToFriendship(
  s: State,
  connId: string,
  by: string,
): { state: State; outcome: 'primary' | 'waiting' } {
  const d = clone(s);
  const c = find(d, connId);
  if (c.kind !== 'romantic' || c.status === 'closed') throw new Error('Only an open romantic connection can move to friendship');
  const them = other(c, by);
  c.kind = 'friendship';
  c.fromRomance = true;
  c.pause = undefined;
  c.meetingReady = {};
  c.stagesReached = c.stagesReached.filter((st) => st !== 'relationship' && st !== 'marriage');
  const both = slotFree(d, by, 'friendship', c.id) && slotFree(d, them, 'friendship', c.id);
  if (both) {
    activate(d, c);
  } else {
    c.status = 'mutual';
    c.primarySince = undefined;
    c.mutualAt = d.now;
  }
  system(c, 'You both chose friendship. Your romantic slots are free; this friendship continues.', d.now);
  notify(d, them, `You and ${name(d, by)} moved your connection to friendship.`, both ? `/chat/${c.id}` : '/connections?kind=friendship');
  return { state: d, outcome: both ? 'primary' : 'waiting' };
}

export function closeConnection(s: State, connId: string, by: string, reason: string, note?: string): State {
  const d = clone(s);
  const c = find(d, connId);
  if (c.status === 'closed') return s;
  const meaningful = holdsSlot(c) || c.messages.some((m) => m.kind !== 'system');
  const them = other(c, by);
  c.status = 'closed';
  c.closure = { by, reason, note: note?.trim() || undefined, at: d.now };
  c.invite = undefined;
  c.feedbackDue = meaningful ? [...c.users] : [];
  system(c, `${name(d, by)} closed this connection. “${reason}”`, d.now);
  notify(d, them, `${name(d, by)} closed your connection respectfully and shared why.`, `/chat/${c.id}`);
  if (meaningful) {
    notify(d, by, `When you're ready, you can share Connection Feedback about ${name(d, them)}.`, `/feedback/${c.id}`);
  }
  // Neither person is resurfaced to the other in Discovery.
  for (const [a, b] of [[by, them], [them, by]] as const) {
    if (!hasPassed(d, a, b, c.kind)) d.passes.push({ from: a, to: b, kind: c.kind });
  }
  return d;
}

// ---------------------------------------------------------------------------
// Inside a Primary connection
// ---------------------------------------------------------------------------

export function sendMessage(s: State, connId: string, from: string, text: string, failed = false): State {
  const d = clone(s);
  const c = find(d, connId);
  c.messages.push({ id: newId('m'), from, text, at: d.now, kind: 'text', failed });
  const spoke = new Set(c.messages.filter((m) => m.kind === 'text' && !m.failed).map((m) => m.from));
  if (c.users.every((u) => spoke.has(u)) && !c.stagesReached.includes('conversation')) {
    c.stagesReached.push('conversation');
  }
  return d;
}

export function retryMessage(s: State, connId: string, msgId: string): State {
  const d = clone(s);
  const m = find(d, connId).messages.find((x) => x.id === msgId);
  if (m) m.failed = false;
  return d;
}

export function reachStage(s: State, connId: string, stage: Stage): State {
  const c0 = find(s, connId);
  if (c0.stagesReached.includes(stage)) return s;
  const d = clone(s);
  find(d, connId).stagesReached.push(stage);
  return d;
}

export function setMeetingReady(s: State, connId: string, uid: string, ready: boolean): State {
  const d = clone(s);
  const c = find(d, connId);
  c.meetingReady[uid] = ready;
  if (c.users.every((u) => c.meetingReady[u])) {
    system(c, "You're both interested in meeting.", d.now);
  }
  return d;
}

export const bothReadyToMeet = (c: Connection) => c.users.every((u) => c.meetingReady[u]);

export function setDatePlan(s: State, connId: string, by: string, plan: DatePlan): State {
  const d = clone(s);
  const c = find(d, connId);
  c.datePlan = plan;
  c.messages.push({
    id: newId('m'),
    from: by,
    text: `${plan.venue} · ${plan.time}`,
    at: d.now,
    kind: 'plan',
  });
  return d;
}

export function checkIn(s: State, connId: string, uid: string, value: CheckIn): State {
  const d = clone(s);
  find(d, connId).checkins[uid] = value;
  return d;
}

// ---------------------------------------------------------------------------
// Connection Feedback
// ---------------------------------------------------------------------------

export function submitFeedback(
  s: State,
  connId: string,
  author: string,
  traits: Record<Trait, boolean>,
  comment?: string,
): { state: State; status: FeedbackEntry['status'] } {
  const d = clone(s);
  const c = find(d, connId);
  const about = other(c, author);
  if (!c.feedbackDue.includes(author)) throw new Error('No feedback is due for this connection');

  const theirs = d.feedback.find((f) => f.connectionId === connId && f.author === about);
  const windowPassed = c.closure ? daysBetween(c.closure.at, d.now) >= FEEDBACK_RELEASE_DAYS : false;
  const release = !!theirs || windowPassed;
  const status: FeedbackEntry['status'] =
    screenComment(comment) === 'hold' ? 'held' : release ? 'published' : 'awaiting-release';

  d.feedback.push({
    id: newId('f'),
    about,
    author,
    connectionId: connId,
    traits,
    comment: comment?.trim() || undefined,
    at: d.now,
    status,
  });
  // Double-blind release: neither person's feedback appears before both submit.
  if (release && theirs && theirs.status === 'awaiting-release') theirs.status = 'published';
  c.feedbackDue = c.feedbackDue.filter((u) => u !== author);
  return { state: d, status };
}

export function releaseDueFeedback(s: State): State {
  const due = s.feedback.filter(
    (f) => f.status === 'awaiting-release' && daysBetween(f.at, s.now) >= FEEDBACK_RELEASE_DAYS,
  );
  if (!due.length) return s;
  const d = clone(s);
  for (const f of d.feedback) if (due.some((x) => x.id === f.id)) f.status = 'published';
  return d;
}

export function reportFeedback(s: State, id: string, by: string, reason: ReportReason): State {
  const d = clone(s);
  const f = d.feedback.find((x) => x.id === id);
  if (!f || f.status === 'removed') return s;
  f.status = 'reported';
  f.report = { by, reason, at: d.now };
  return d;
}

/** Trust & Safety decision. Removal never labels the recipient. */
export function moderateFeedback(s: State, id: string, decision: 'publish' | 'remove'): State {
  const d = clone(s);
  const f = d.feedback.find((x) => x.id === id);
  if (!f) return s;
  f.status = decision === 'publish' ? 'published' : 'removed';
  return d;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export function updateSettings(s: State, uid: string, patch: Partial<Settings>): State {
  const d = clone(s);
  const u = d.users[uid];
  const wasPaused = u.settings.discoveryPaused;
  u.settings = { ...u.settings, ...patch };
  if (wasPaused && !u.settings.discoveryPaused) {
    notify(d, uid, 'Welcome back. Your connections are waiting.', '/');
  }
  return d;
}

export function setPlan(s: State, uid: string, plan: Plan): State {
  const d = clone(s);
  const u = d.users[uid];
  u.plan = plan;
  const e = entitlements(plan);
  if (REACH_ORDER.indexOf(u.settings.reach) > REACH_ORDER.indexOf(e.maxReach)) u.settings.reach = e.maxReach;
  if (!e.incognito) u.settings.incognito = false;
  if (!e.anonymousDiscovery) u.settings.anonymousDiscovery = false;
  if (!e.feedbackVisibilityControl) u.settings.feedbackVisible = true;
  if (!e.progressiveSharing) {
    u.settings.sharing = { profession: 'discovery', education: 'discovery', future: 'mutual', languages: 'discovery' };
  }
  return d;
}

export function markNoticesRead(s: State, uid: string): State {
  if (!s.notices.some((n) => n.for === uid && !n.read)) return s;
  const d = clone(s);
  for (const n of d.notices) if (n.for === uid) n.read = true;
  return d;
}
