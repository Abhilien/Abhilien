// Demo-only: stands in for the other person's side of a connection so the
// prototype's flows can be experienced end-to-end on a single device.

import { checkIn, name, other, sendMessage, setMeetingReady, submitFeedback } from '../domain/rules';
import { TRAITS } from '../domain/trust';
import type { Connection, State, Trait } from '../domain/types';

const REPLIES: Record<string, string[]> = {
  ananya: [
    'Ha, I was just thinking about that.',
    'Tell me more — I like where this is going.',
    'That’s such a lovely way to put it.',
    'Okay, you’ve earned a chai on me.',
  ],
  rahul: ['Haha, classic.', 'Sorted. See you there.', 'You’re buying the phirni this time.'],
  default: [
    'That’s really nice to hear.',
    'I’d like that.',
    'Haha — okay, you have my attention.',
    'Tell me more?',
    'Same here, honestly.',
  ],
};

export function partnerReply(s: State, c: Connection, viewerId: string): State {
  const them = other(c, viewerId);
  const pool = REPLIES[them] ?? REPLIES.default;
  const count = c.messages.filter((m) => m.from === them).length;
  return sendMessage(s, c.id, them, pool[count % pool.length]);
}

export function partnerReadyToMeet(s: State, connId: string, viewerId: string): State {
  const c = s.connections.find((x) => x.id === connId);
  if (!c || c.status === 'closed') return s;
  return setMeetingReady(s, connId, other(c, viewerId), true);
}

export function partnerCheckIn(s: State, connId: string, viewerId: string): State {
  const c = s.connections.find((x) => x.id === connId);
  if (!c || c.checkins[other(c, viewerId)]) return s;
  return checkIn(s, connId, other(c, viewerId), 'continue');
}

/** After a closure, the other person also leaves (kind) feedback, which releases both. */
export function partnerFeedback(s: State, connId: string, viewerId: string): State {
  const c = s.connections.find((x) => x.id === connId);
  if (!c) return s;
  const them = other(c, viewerId);
  if (!c.feedbackDue.includes(them)) return s;
  const traits = Object.fromEntries(TRAITS.map((t) => [t, t !== 'responsiveness'])) as Record<Trait, boolean>;
  return submitFeedback(
    s,
    connId,
    them,
    traits,
    `Easy to talk to and honest about where things stood. Thank you${c.fromRomance ? ', friend' : ''}.`,
  ).state;
}

export const partnerName = (s: State, c: Connection, viewerId: string) => name(s, other(c, viewerId));
