// "What now?": one recommendation with a reason, never a list of 17 options.
// A transparent heuristic (Part 3 §8.8). It is easy to explain and easy to test,
// and it can be swapped for learned weights later.

import { DAY, HOUR, atTime, formatDay } from './dates';
import type { Energy, Item, Park, Size } from './types';

export type Recommendation =
  | { kind: 'item'; item: Item; reason: string; size: Size; score: number }
  | { kind: 'resume'; park: Park; reason: string }
  | { kind: 'rest'; reason: string };

export interface RecommendInput {
  items: Item[];
  parks: Park[];
  now: Date;
  /** Minutes until the next fixed commitment (e.g. start getting ready), if known. */
  minutesFree: number | null;
  energy: Energy | null;
}

const DEFAULT_EST = 15;

function deadlineMs(item: Item): number | null {
  if (!item.due?.date) return null;
  return atTime(item.due.date, item.due.time ?? '23:59');
}

export function scoreItem(item: Item, input: RecommendInput): number {
  const now = input.now.getTime();
  const est = item.estMinutes ?? DEFAULT_EST;
  let score = 0;

  // Urgency: deadlines and consequences.
  const dl = deadlineMs(item);
  if (dl !== null) {
    const until = dl - now;
    if (until < 0) score += 4;
    else if (until < DAY) score += 5;
    else if (until < 3 * DAY) score += 3;
    else if (until < 7 * DAY) score += 1;
  }
  if (item.money) score += 2;
  if (item.importance === 'high') score += 1;
  if (item.importance === 'critical') score += 3;

  // Fit: does it fit in the time available?
  if (input.minutesFree !== null && est > input.minutesFree) score -= 10;

  // Energy match (only when the user said how they feel).
  if (input.energy === 'low') score += est <= 10 ? 2 : -2;
  if (input.energy === 'good' && est >= 20) score += 1;

  // Recently swiped away: respect that today.
  if (item.skippedAt && now - item.skippedAt < 12 * HOUR) score -= 10;

  // Things that keep sliding are not pushed harder; they get a smaller start.
  return score;
}

function reasonFor(item: Item, input: RecommendInput): string {
  const parts: string[] = [];
  if (item.due?.date && item.isDeadline) parts.push(`due ${formatDay(item.due.date, input.now)}`);
  if (item.estMinutes) parts.push(`~${item.estMinutes} min`);
  if (input.minutesFree !== null) parts.push(`you have ${input.minutesFree} min`);
  if (item.why) parts.push(item.why);
  return parts.join(' · ') || 'a good next step';
}

function sizeFor(item: Item, energy: Energy | null): Size {
  if (item.postponeCount >= 3 || energy === 'low') return 'cant';
  if (item.postponeCount >= 2) return 'heavy';
  return 'fine';
}

export function recommend(input: RecommendInput): Recommendation {
  const candidates = input.items.filter(
    (i) => i.status === 'open' && i.bucket !== 'someday' && i.kind !== 'note' && i.kind !== 'waiting' && i.kind !== 'shopping' && !(i.trigger && i.trigger.type !== 'leave_for'),
  );

  const scored = candidates
    .map((item) => ({ item, score: scoreItem(item, input) }))
    .sort((a, b) => b.score - a.score || a.item.createdAt - b.item.createdAt);

  const best = scored[0];
  const unresumed = input.parks.filter((p) => !p.resumedAt).sort((a, b) => b.createdAt - a.createdAt)[0];

  // Nothing pressing, but there is a parked task: momentum wins.
  if ((!best || best.score < 3) && unresumed && (input.minutesFree === null || input.minutesFree >= 10)) {
    return { kind: 'resume', park: unresumed, reason: `You stopped at: ${unresumed.where ?? unresumed.nextAction}` };
  }
  if (!best || best.score <= -5) {
    return { kind: 'rest', reason: input.minutesFree !== null && input.minutesFree < 10 ? 'Not enough time to start something. Get ready at your own pace.' : 'Nothing is urgent. A break is a fine choice.' };
  }
  return { kind: 'item', item: best.item, reason: reasonFor(best.item, input), size: sizeFor(best.item, input.energy), score: best.score };
}
