import { describe, expect, it } from 'vitest';
import { MIN } from './dates';
import { lateCorrection, leaveStatus, planLeave, runningLateDraft } from './leave';
import type { LeaveEvent } from './types';

const START = new Date(2026, 9, 1, 18, 0).getTime(); // 6:00pm
const ev: LeaveEvent = {
  id: 'e1',
  title: 'Dentist',
  startAt: START,
  travelMin: 25,
  prepMin: 20,
  bufferMin: 5,
  checklist: [],
};
const at = (h: number, m: number) => new Date(2026, 9, 1, h, m).getTime();

describe('planLeave', () => {
  it('works back from the start time', () => {
    const p = planLeave(ev);
    expect(p.leaveAt).toBe(at(17, 30)); // 6:00 − 25 travel − 5 buffer
    expect(p.prepAt).toBe(at(17, 10)); // − 20 prep
  });

  it('applies the personal lateness correction', () => {
    expect(planLeave(ev, 10).leaveAt).toBe(at(17, 20));
  });
});

describe('leaveStatus', () => {
  const plan = planLeave(ev);
  const state = (h: number, m: number) => leaveStatus(ev, plan, at(h, m)).state;

  it('moves through free → ready → soon → now → late', () => {
    expect(state(16, 0)).toBe('free');
    expect(state(17, 10)).toBe('ready');
    expect(state(17, 25)).toBe('soon');
    expect(state(17, 30)).toBe('now');
    expect(state(17, 45)).toBe('late');
  });

  it('shows a countdown in the soon state', () => {
    expect(leaveStatus(ev, plan, at(17, 22)).headline).toBe('Leave in 8 min');
  });

  it('predicts arrival when late', () => {
    const s = leaveStatus(ev, plan, at(17, 42));
    expect(s.headline).toBe("You'll arrive ~6:07pm");
  });

  it('is "gone" once the user has left', () => {
    expect(leaveStatus({ ...ev, leftAt: at(17, 29) }, plan, at(17, 40)).state).toBe('gone');
  });
});

describe('runningLateDraft', () => {
  it('drafts a polite message with the delay', () => {
    expect(runningLateDraft(ev, START + 7 * MIN)).toBe(
      "Hi, I'm running about 7 min late for Dentist. I'll be there around 6:07pm. Sorry about that.",
    );
  });
});

describe('lateCorrection', () => {
  it('needs three observations before correcting anything', () => {
    expect(lateCorrection([12, 9]).correctionMin).toBe(0);
  });

  it('uses the median and shrinks it with little data', () => {
    // median 10, n=3 → 3/6 × 10 = 5
    expect(lateCorrection([8, 10, 30])).toEqual({ correctionMin: 5, n: 3, medianMin: 10 });
  });

  it('approaches the median with more data, rounded to 5 minutes', () => {
    // median 10, n=9 → 9/12 × 10 = 7.5 → rounds to 10 (nearest 5)
    expect(lateCorrection([10, 10, 9, 11, 10, 12, 8, 10, 10]).correctionMin).toBe(10);
  });

  it('never moves the plan later for early leavers', () => {
    expect(lateCorrection([-5, -10, -3, -8]).correctionMin).toBe(0);
  });

  it('caps the correction at 30 minutes', () => {
    expect(lateCorrection(Array(10).fill(90)).correctionMin).toBe(25); // 10/13 × 30 = 23 → 25
  });

  it('only uses the 10 most recent observations', () => {
    const old = Array(20).fill(30);
    const recent = Array(10).fill(0);
    expect(lateCorrection([...old, ...recent]).correctionMin).toBe(0);
  });
});
