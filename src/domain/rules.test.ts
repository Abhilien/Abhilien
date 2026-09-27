import { describe, expect, it } from 'vitest';
import { curate, eligible, ensureDaily } from './discovery';
import {
  closeConnection,
  expressInterest,
  moveToFriendship,
  pauseConnection,
  primaryOf,
  returnToWaiting,
  setPlan,
  slotFree,
  startPrimary,
  submitFeedback,
  updateSettings,
  waitingOf,
} from './rules';
import { createSeedState } from './seed';
import { feedbackAccess, maturity, screenComment, summarizeFeedback, TRAITS } from './trust';
import type { State, Trait } from './types';

const fresh = (): State => createSeedState(Date.UTC(2026, 8, 27));
const allTrue = Object.fromEntries(TRAITS.map((t) => [t, true])) as Record<Trait, boolean>;

describe('relationship capacity', () => {
  it('seeds exactly one romantic and one friendship Primary for Abhishek', () => {
    const s = fresh();
    expect(primaryOf(s, 'abhishek', 'romantic')?.id).toBe('c_ananya');
    expect(primaryOf(s, 'abhishek', 'friendship')?.id).toBe('c_rahul');
    expect(waitingOf(s, 'abhishek', 'romantic').map((c) => c.id)).toEqual(['c_neha', 'c_priya', 'c_riya', 'c_sarah']);
  });

  it('refuses a second Primary while the slot is occupied', () => {
    const s = fresh();
    const r = startPrimary(s, 'c_riya', 'abhishek');
    expect(r.outcome).toBe('slot-occupied');
    expect(r.state).toBe(s);
  });

  it('a paused Primary keeps the slot reserved', () => {
    const s = pauseConnection(fresh(), 'c_ananya', 'abhishek', 'Travel');
    expect(slotFree(s, 'abhishek', 'romantic')).toBe(false);
    expect(startPrimary(s, 'c_riya', 'abhishek').outcome).toBe('slot-occupied');
  });

  it('returning a Primary to waiting frees both slots and keeps mutual interest', () => {
    let s = returnToWaiting(fresh(), 'c_ananya', 'abhishek');
    expect(slotFree(s, 'abhishek', 'romantic')).toBe(true);
    expect(waitingOf(s, 'ananya', 'romantic').map((c) => c.id)).toContain('c_ananya');
    const r = startPrimary(s, 'c_riya', 'abhishek');
    expect(r.outcome).toBe('primary');
    s = r.state;
    expect(primaryOf(s, 'abhishek', 'romantic')?.id).toBe('c_riya');
    expect(primaryOf(s, 'riya', 'romantic')?.id).toBe('c_riya');
  });

  it('holds an invitation when the other person’s slot is occupied', () => {
    let s = fresh();
    // Sarah's slot is free, Abhishek's is not.
    const r = startPrimary(s, 'c_sarah', 'sarah');
    expect(r.outcome).toBe('invited');
    s = r.state;
    expect(s.connections.find((c) => c.id === 'c_sarah')?.status).toBe('mutual');
    expect(s.connections.find((c) => c.id === 'c_sarah')?.invite?.by).toBe('sarah');
  });
});

describe('mutual interest', () => {
  it('interest alone never opens a conversation', () => {
    const r = expressInterest(fresh(), 'abhishek', 'aisha', 'romantic');
    expect(r.outcome.type).toBe('sent');
    expect(r.state.connections.some((c) => c.users.includes('aisha'))).toBe(false);
  });

  it('reciprocal interest creates a waiting connection when the slot is occupied', () => {
    const r = expressInterest(fresh(), 'abhishek', 'kavya', 'romantic');
    expect(r.outcome).toMatchObject({ type: 'mutual', slotFree: false });
    expect(waitingOf(r.state, 'abhishek', 'romantic').some((c) => c.users.includes('kavya'))).toBe(true);
  });

  it('a person with a Primary stays discoverable', () => {
    const s = fresh();
    // Abhishek is dating Ananya; Aisha (Delhi) can still discover him.
    expect(primaryOf(s, 'abhishek', 'romantic')).toBeDefined();
    expect(eligible(s, s.users.aisha, s.users.abhishek, 'romantic')).toBe(true);
  });
});

describe('romance → friendship', () => {
  it('frees the romantic slot; waits if friendship slot is taken', () => {
    const r = moveToFriendship(fresh(), 'c_ananya', 'abhishek');
    expect(r.outcome).toBe('waiting'); // Rahul holds Abhishek's friendship slot
    expect(slotFree(r.state, 'abhishek', 'romantic')).toBe(true);
    const c = r.state.connections.find((x) => x.id === 'c_ananya')!;
    expect(c.kind).toBe('friendship');
    expect(c.fromRomance).toBe(true);
  });

  it('becomes Primary friendship when both friendship slots are free', () => {
    const s = closeConnection(fresh(), 'c_rahul', 'abhishek', 'Something else.');
    const r = moveToFriendship(s, 'c_ananya', 'abhishek');
    expect(r.outcome).toBe('primary');
    expect(primaryOf(r.state, 'abhishek', 'friendship')?.id).toBe('c_ananya');
  });
});

describe('closure and feedback', () => {
  it('closing a Primary invites both people to leave feedback', () => {
    const s = closeConnection(fresh(), 'c_ananya', 'abhishek', "Our long-term goals don't align.");
    const c = s.connections.find((x) => x.id === 'c_ananya')!;
    expect(c.status).toBe('closed');
    expect(c.feedbackDue.sort()).toEqual(['abhishek', 'ananya']);
  });

  it('feedback is double-blind: released only once both submit', () => {
    let s = closeConnection(fresh(), 'c_ananya', 'abhishek', 'Something else.');
    let r = submitFeedback(s, 'c_ananya', 'abhishek', allTrue, 'Kind and honest.');
    expect(r.status).toBe('awaiting-release');
    s = r.state;
    r = submitFeedback(s, 'c_ananya', 'ananya', allTrue);
    expect(r.status).toBe('published');
    expect(r.state.feedback.filter((f) => f.connectionId === 'c_ananya').every((f) => f.status === 'published')).toBe(true);
  });

  it('releases Mansi’s held feedback when Abhishek submits', () => {
    const r = submitFeedback(fresh(), 'c_mansi', 'abhishek', allTrue);
    expect(r.state.feedback.find((f) => f.id === 'f_mansi_abhishek')?.status).toBe('published');
  });

  it('holds comments that look like harassment or doxxing for review', () => {
    expect(screenComment('Total scammer. Lives at Bandra.')).toBe('hold');
    expect(screenComment('Very respectful and easy to talk to.')).toBe('ok');
  });

  it('never summarises from too few responses', () => {
    const s = fresh();
    expect(summarizeFeedback(s.feedback, 'riya').enough).toBe(false);
    expect(summarizeFeedback(s.feedback, 'riya').pct).toEqual({});
    expect(summarizeFeedback(s.feedback, 'ananya').enough).toBe(true);
  });
});

describe('reciprocal feedback visibility — to see, you must show', () => {
  it('Free members cannot view others’ feedback, but theirs is visible', () => {
    const s = fresh();
    expect(feedbackAccess(s.users.meera, s.users.ananya)).toEqual({ allowed: false, reason: 'free-plan' });
    expect(feedbackAccess(s.users.abhishek, s.users.ananya)).toEqual({ allowed: true }); // Ananya is Free
  });

  it('Premium with visibility OFF cannot view anyone', () => {
    const s = fresh();
    expect(feedbackAccess(s.users.sarah, s.users.ananya)).toEqual({ allowed: false, reason: 'viewer-hidden' });
  });

  it('nobody can view a Premium member who hid their feedback', () => {
    const s = fresh();
    expect(feedbackAccess(s.users.abhishek, s.users.sarah)).toEqual({ allowed: false, reason: 'target-hidden' });
  });

  it('downgrading to Free forces feedback visible again', () => {
    const s = setPlan(fresh(), 'sarah', 'free');
    expect(s.users.sarah.settings.feedbackVisible).toBe(true);
    expect(s.users.sarah.settings.reach).toBe('regional');
  });
});

describe('discovery', () => {
  it('shows at most five, and never someone already connected', () => {
    const s = fresh();
    const ids = curate(s, 'abhishek', 'romantic');
    expect(ids.length).toBeLessThanOrEqual(5);
    for (const id of ['ananya', 'priya', 'riya', 'sarah', 'neha', 'mansi']) expect(ids).not.toContain(id);
  });

  it('Free reach is limited to the region', () => {
    const s = fresh();
    const ids = curate(s, 'meera', 'romantic');
    for (const id of ids) expect(s.users[id].profile.place.region).toBe('South India');
  });

  it('Premium international reach surfaces selected countries only', () => {
    const s = updateSettings(fresh(), 'abhishek', { reach: 'international', countries: ['Canada'] });
    const viewer = s.users.abhishek;
    expect(eligible(s, viewer, s.users.maya, 'romantic')).toBe(true); // Canada
    expect(eligible(s, viewer, s.users.sofia, 'romantic')).toBe(false); // Portugal
  });

  it('paused profiles leave discovery', () => {
    const s = updateSettings(fresh(), 'kavya', { discoveryPaused: true });
    expect(curate(s, 'abhishek', 'romantic')).not.toContain('kavya');
  });

  it('the daily set is fixed for the day', () => {
    const s = ensureDaily(fresh(), 'abhishek', 'romantic');
    expect(ensureDaily(s, 'abhishek', 'romantic')).toBe(s);
  });
});

describe('maturity', () => {
  it('uses neutral, transparent tiers', () => {
    const s = fresh();
    expect(maturity(s.users.ananya, s.now)).toBe('established');
    expect(maturity(s.users.riya, s.now)).toBe('limited');
    expect(maturity(s.users.aisha, s.now)).toBe('new');
  });
});
