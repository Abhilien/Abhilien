// Leave engine: turns "Dentist at 6pm, 25 min drive" into a countdown with a
// preparation phase, and learns how late this particular person tends to run.
//
// Spec: Part 3 §8.3, Part 7 §34.
//   leave_time = start − travel − buffer − personal lateness correction
//   prep_start = leave_time − prep

import { MIN, formatDuration, formatTime } from './dates';
import type { LeaveEvent } from './types';

export interface LeavePlan {
  prepAt: number;
  leaveAt: number;
  arriveAt: number;
  correctionMin: number;
}

export type LeaveStateName = 'free' | 'ready' | 'soon' | 'now' | 'late' | 'gone';

export interface LeaveStatus {
  state: LeaveStateName;
  /** Minutes until the (corrected) leave time; negative once it has passed. */
  minutesToLeave: number;
  /** Predicted arrival if leaving right now. */
  etaIfLeavingNow: number;
  headline: string;
  detail: string;
}

/** "Leave soon" starts this many minutes before the leave time. */
export const SOON_MIN = 10;
/** Grace period after the leave time before "late" mode. */
export const NOW_GRACE_MIN = 3;

export function planLeave(ev: LeaveEvent, correctionMin = 0): LeavePlan {
  const leaveAt = ev.startAt - (ev.travelMin + ev.bufferMin + correctionMin) * MIN;
  return {
    leaveAt,
    prepAt: leaveAt - ev.prepMin * MIN,
    arriveAt: ev.startAt - ev.bufferMin * MIN,
    correctionMin,
  };
}

export function leaveStatus(ev: LeaveEvent, plan: LeavePlan, now: number): LeaveStatus {
  const minutesToLeave = Math.round((plan.leaveAt - now) / MIN);
  const etaIfLeavingNow = now + ev.travelMin * MIN;
  const base = { minutesToLeave, etaIfLeavingNow };

  if (ev.leftAt) {
    return { ...base, state: 'gone', headline: 'On your way', detail: `${ev.title} at ${formatTime(ev.startAt)}` };
  }
  if (now < plan.prepAt) {
    return {
      ...base,
      state: 'free',
      headline: `Free until ${formatTime(plan.prepAt)}`,
      detail: `${ev.title} in ${formatDuration(ev.startAt - now)} · leave ~${formatTime(plan.leaveAt)}`,
    };
  }
  if (minutesToLeave > SOON_MIN) {
    return {
      ...base,
      state: 'ready',
      headline: 'Start getting ready',
      detail: `Leave in ${formatDuration(plan.leaveAt - now)} for ${ev.title}`,
    };
  }
  if (minutesToLeave > 0) {
    return { ...base, state: 'soon', headline: `Leave in ${minutesToLeave} min`, detail: `${ev.title} at ${formatTime(ev.startAt)}` };
  }
  if (minutesToLeave > -NOW_GRACE_MIN && etaIfLeavingNow <= ev.startAt) {
    return { ...base, state: 'now', headline: 'Leave now', detail: `Arrive about ${formatTime(etaIfLeavingNow)}` };
  }
  const lateBy = Math.max(0, Math.round((etaIfLeavingNow - ev.startAt) / MIN));
  return {
    ...base,
    state: 'late',
    headline: lateBy > 0 ? `You'll arrive ~${formatTime(etaIfLeavingNow)}` : 'Leave now',
    detail: lateBy > 0 ? `About ${lateBy} min after the start. Want a heads-up message?` : 'Still on time if you go now',
  };
}

/** A ready-to-send "running late" message. The app never sends it itself. */
export function runningLateDraft(ev: LeaveEvent, eta: number): string {
  const lateBy = Math.max(1, Math.round((eta - ev.startAt) / MIN));
  return `Hi, I'm running about ${lateBy} min late for ${ev.title}. I'll be there around ${formatTime(eta)}. Sorry about that.`;
}

/**
 * Personal lateness correction (Part 7 §34). `lagsMin` are past differences
 * between when the user actually left and the leave time we showed them.
 *  - No correction until 3 observations exist.
 *  - Median, clamped to [0, 30]: we only ever move the plan *earlier*.
 *  - Shrunk toward 0 with little data: n / (n + 3).
 *  - Rounded to 5 minutes so it reads as a human number.
 */
export function lateCorrection(lagsMin: number[]): { correctionMin: number; n: number; medianMin: number } {
  const recent = lagsMin.slice(-10);
  const n = recent.length;
  if (n < 3) return { correctionMin: 0, n, medianMin: 0 };
  const sorted = [...recent].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  const clamped = Math.min(30, Math.max(0, median));
  const shrunk = (n / (n + 3)) * clamped;
  return { correctionMin: Math.round(shrunk / 5) * 5, n, medianMin: Math.round(median) };
}
