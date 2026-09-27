import { entitlements } from './entitlements';
import type { FeedbackEntry, Trait, User } from './types';

export const TRAITS: Trait[] = [
  'respect',
  'communication',
  'authenticity',
  'responsiveness',
  'reliability',
  'clarity',
  'overall',
];

/** Below this, percentages would be misleading, so we show none. */
export const MIN_FEEDBACK_FOR_SUMMARY = 5;

/** Feedback is released once both people submit, or after this many days. */
export const FEEDBACK_RELEASE_DAYS = 14;

const DAY = 86_400_000;

export function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY));
}

// ---------------------------------------------------------------------------
// Reciprocal feedback visibility: TO SEE → YOU MUST SHOW
// ---------------------------------------------------------------------------

/**
 * Whether a person's own Connection Feedback is visible to others.
 * Free members can't hide it; Premium members choose.
 */
export function isFeedbackVisible(user: User): boolean {
  return entitlements(user.plan).feedbackVisibilityControl ? user.settings.feedbackVisible : true;
}

export type FeedbackAccess =
  | { allowed: true }
  | { allowed: false; reason: 'free-plan' | 'viewer-hidden' | 'target-hidden' };

export function feedbackAccess(viewer: User, target: User): FeedbackAccess {
  if (viewer.id === target.id) return { allowed: true };
  if (!entitlements(viewer.plan).feedbackVisibilityControl) return { allowed: false, reason: 'free-plan' };
  if (!isFeedbackVisible(viewer)) return { allowed: false, reason: 'viewer-hidden' };
  if (!isFeedbackVisible(target)) return { allowed: false, reason: 'target-hidden' };
  return { allowed: true };
}

export interface FeedbackSummary {
  count: number;
  enough: boolean;
  pct: Partial<Record<Trait, number>>;
  comments: { id: string; text: string }[];
}

export function summarizeFeedback(entries: FeedbackEntry[], about: string): FeedbackSummary {
  const published = entries.filter((f) => f.about === about && f.status === 'published');
  const count = published.length;
  const enough = count >= MIN_FEEDBACK_FOR_SUMMARY;
  const pct: FeedbackSummary['pct'] = {};
  if (enough) {
    for (const t of TRAITS) {
      const positive = published.filter((f) => f.traits[t]).length;
      pct[t] = Math.round((positive / count) * 100);
    }
  }
  // Newest first; never include author identity.
  const comments = enough
    ? published
        .filter((f) => f.comment)
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((f) => ({ id: f.id, text: f.comment! }))
    : [];
  return { count, enough, pct, comments };
}

// ---------------------------------------------------------------------------
// Profile maturity — transparent, neutral criteria
// ---------------------------------------------------------------------------

export type Maturity = 'established' | 'limited' | 'new';

export const MATURITY_LABEL: Record<Maturity, string> = {
  established: 'Established member',
  limited: 'Limited history',
  new: 'New member',
};

export const MATURITY_CRITERIA: Record<Maturity, string> = {
  established: 'Member for 6+ months with 10+ meaningful interactions.',
  limited: 'Member for 1+ month or with 3+ meaningful interactions.',
  new: 'Recently joined. A new member simply has less history — nothing more.',
};

export function maturity(user: User, now: string): Maturity {
  const months = daysBetween(user.history.memberSince, now) / 30.4;
  const n = user.history.meaningfulInteractions;
  if (months >= 6 && n >= 10) return 'established';
  if (months >= 1 || n >= 3) return 'limited';
  return 'new';
}

// ---------------------------------------------------------------------------
// Interaction statistics
// ---------------------------------------------------------------------------

export interface InteractionStats {
  average: number;
  median: number;
  shortest: number;
  longest: number;
}

export function interactionStats(durations: number[]): InteractionStats | null {
  if (durations.length < 3) return null;
  const s = [...durations].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  return {
    average: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
    median,
    shortest: s[0],
    longest: s[s.length - 1],
  };
}

// ---------------------------------------------------------------------------
// Feedback moderation: a first-pass screen before anything is published.
// Held comments go to human review; nothing is auto-labelled.
// ---------------------------------------------------------------------------

const SCREEN_PATTERNS: RegExp[] = [
  /\b(scam+er|fraud|liar|creep|psycho|stalker)\b/i,
  /\b(kill|hurt|destroy|ruin)\s+(you|him|her|them)\b/i,
  /\b\d{10}\b/, // phone numbers
  /@[a-z0-9_.]{3,}/i, // social handles
  /\b(address|lives at|works at)\b/i,
  /https?:\/\//i,
];

export function screenComment(text: string | undefined): 'ok' | 'hold' {
  if (!text) return 'ok';
  return SCREEN_PATTERNS.some((p) => p.test(text)) ? 'hold' : 'ok';
}
