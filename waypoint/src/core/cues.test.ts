import { describe, expect, it } from 'vitest';
import { toneCheck } from './copy';
import {
  DEFAULT_CUE_SETTINGS,
  MAX_TOUCHES_PER_ITEM_PER_DAY,
  applyLater,
  cueCopy,
  evaluateCue,
  freshLedger,
  initialCueAt,
  isQuietHours,
  itemsForContext,
  laterOptions,
  maxStep,
} from './cues';
import { atTime } from './dates';
import { itemFromParsed } from './items';
import { parseSegment } from './parser';
import type { Item } from './types';

const NOW = new Date(2026, 9, 1, 10, 0); // Thu 1 Oct 2026, 10:00

const make = (text: string, now = NOW, id = 'i1'): Item => itemFromParsed(parseSegment(text, now), now, id);

describe('initialCueAt', () => {
  it('uses the stated time', () => {
    expect(make('call the bank at 3').cueAt).toBe(atTime('2026-10-01', '15:00'));
  });

  it('cues deadlines the morning before', () => {
    expect(make('pay electricity by the 14th').cueAt).toBe(atTime('2026-10-13', '08:30'));
  });

  it('cues a deadline due tomorrow right away (the morning before has passed)', () => {
    expect(make('pay rent by tomorrow').cueAt).toBe(NOW.getTime());
  });

  it('context-triggered items have no clock time', () => {
    expect(make('when I get home take the chicken out').cueAt).toBeNull();
  });

  it('undated tasks are not cued', () => {
    expect(initialCueAt(make('finish the presentation'), NOW)).toBeNull();
  });

  it('waiting items follow up in the afternoon they were expected', () => {
    expect(make('waiting for refund from Amazon').cueAt).toBe(atTime('2026-10-08', '16:00'));
  });
});

describe('reminder ladder', () => {
  it('climbs one step per touch and stops at the item’s max step', () => {
    let item = make('pay electricity by the 14th');
    let ledger = freshLedger(NOW);
    const steps: number[] = [];
    for (let h = 0; h < 4; h++) {
      const d = evaluateCue(item, ledger, new Date(2026, 9, 1, 10 + h));
      steps.push(d.cueStep);
      item = { ...item, cueStep: d.cueStep };
      ledger = d.ledger;
    }
    expect(maxStep(item)).toBe(3);
    expect(steps).toEqual([1, 2, 3, 3]);
  });

  it('normal tasks get at most two touches up the ladder', () => {
    expect(maxStep(make('water the plants tonight'))).toBe(2);
  });

  it('caps touches per item per day', () => {
    const item = make('pay electricity by the 14th');
    const ledger = { ...freshLedger(NOW), perItem: { [item.id]: MAX_TOUCHES_PER_ITEM_PER_DAY } };
    const d = evaluateCue(item, ledger, NOW);
    expect(d.message).toBeNull();
    expect(d.nextCueAt).toBe(atTime('2026-10-02', '08:30'));
  });

  it('turns over-budget cues into digest entries instead of interruptions', () => {
    const item = make('water the plants tonight');
    const ledger = { ...freshLedger(NOW), used: DEFAULT_CUE_SETTINGS.budget };
    const d = evaluateCue(item, ledger, NOW);
    expect(d.message?.tier).toBe('digest');
    expect(d.ledger.used).toBe(DEFAULT_CUE_SETTINGS.budget);
  });

  it('holds non-critical cues during quiet hours', () => {
    const late = new Date(2026, 9, 1, 23, 15);
    const d = evaluateCue(make('water the plants tonight', late), freshLedger(late), late);
    expect(d.message).toBeNull();
    expect(d.nextCueAt).toBe(atTime('2026-10-02', '07:30'));
  });

  it('resets the ledger on a new day', () => {
    const ledger = { dayKey: '2026-09-30', used: 6, perItem: { i1: 3 } };
    const d = evaluateCue(make('water the plants tonight'), ledger, NOW);
    expect(d.message).not.toBeNull();
    expect(d.ledger.dayKey).toBe('2026-10-01');
  });

  it('uses rescue copy once a task keeps sliding', () => {
    const item = { ...make('finish the presentation'), postponeCount: 3 };
    expect(cueCopy(item, 2, NOW).actions).toEqual(['smaller', 'later', 'drop']);
  });

  it('medication cues offer a "taken" action', () => {
    expect(cueCopy(make('take meds at 8'), 1, NOW).actions).toContain('taken');
  });

  it('every ladder message passes the no-shame tone check', () => {
    const variants = [
      make('pay electricity by the 14th'),
      make('finish the presentation'),
      { ...make('finish the presentation'), postponeCount: 5 },
      make('waiting for refund from Amazon'),
      make('take meds at 8'),
      make("take the documents because I'm going to the office"),
    ];
    for (const item of variants) {
      for (const step of [1, 2, 3, 4]) {
        const { title, body } = cueCopy(item, step, NOW);
        expect(toneCheck(`${title} ${body}`)).toEqual({ ok: true, hits: [] });
      }
    }
  });
});

describe('quiet hours', () => {
  it('handles windows that cross midnight', () => {
    expect(isQuietHours(new Date(2026, 9, 1, 23, 0), DEFAULT_CUE_SETTINGS)).toBe(true);
    expect(isQuietHours(new Date(2026, 9, 1, 6, 0), DEFAULT_CUE_SETTINGS)).toBe(true);
    expect(isQuietHours(new Date(2026, 9, 1, 12, 0), DEFAULT_CUE_SETTINGS)).toBe(false);
  });
});

describe('smart later', () => {
  it('offers event-anchored options, not just "+10 min"', () => {
    const labels = laterOptions(NOW).map((o) => o.label);
    expect(labels).toEqual(['In an hour', 'This evening', 'When I get home', 'Tomorrow morning']);
  });

  it('counts the postponement and restarts the ladder', () => {
    const item = { ...make('finish the presentation'), cueStep: 2 };
    const opt = laterOptions(NOW).find((o) => o.label === 'When I get home')!;
    const later = applyLater(item, opt, NOW);
    expect(later.postponeCount).toBe(1);
    expect(later.cueStep).toBe(0);
    expect(later.trigger).toEqual({ type: 'place', place: 'home', on: 'arrive' });
  });
});

describe('context triggers', () => {
  const items = [
    make('when I get home take the chicken out', NOW, 'a'),
    make('ask Rahul about the car', NOW, 'b'),
    make("tomorrow morning remind me to take the documents because I'm going to the office", NOW, 'c'),
    make('buy milk when I leave work', NOW, 'd'),
  ];

  it('fires on arrive', () => {
    expect(itemsForContext(items, { type: 'arrive', place: 'home' }).map((i) => i.id)).toEqual(['a']);
  });

  it('fires on seeing a person (case-insensitive)', () => {
    expect(itemsForContext(items, { type: 'person', name: 'rahul' }).map((i) => i.id)).toEqual(['b']);
  });

  it('treats office and work as the same place', () => {
    expect(itemsForContext(items, { type: 'leave_for', place: 'work' }).map((i) => i.id)).toEqual(['c']);
    expect(itemsForContext(items, { type: 'leave', place: 'office' }).map((i) => i.id)).toEqual(['d']);
  });
});
