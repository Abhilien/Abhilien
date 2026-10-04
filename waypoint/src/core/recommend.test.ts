import { describe, expect, it } from 'vitest';
import { daysAway, tidy } from './freshStart';
import { itemFromParsed } from './items';
import { START_MINUTES, firstStep, nextStep, stepsFor } from './microsteps';
import { parseSegment } from './parser';
import { recommend } from './recommend';
import type { Item, Park } from './types';

const NOW = new Date(2026, 9, 1, 16, 0);
let n = 0;
const make = (text: string, extra: Partial<Item> = {}): Item => ({
  ...itemFromParsed(parseSegment(text, NOW), NOW, `i${++n}`),
  ...extra,
});

describe('recommend', () => {
  it('picks the urgent short task that fits the free time', () => {
    const bill = make('pay electricity by tomorrow');
    const r = recommend({
      items: [make('finish the presentation'), bill, make('clean the garage')],
      parks: [],
      now: NOW,
      minutesFree: 18,
      energy: null,
    });
    expect(r.kind).toBe('item');
    if (r.kind === 'item') {
      expect(r.item.id).toBe(bill.id);
      expect(r.reason).toBe('due tomorrow · ~3 min · you have 18 min');
    }
  });

  it('skips tasks that do not fit the time available', () => {
    const r = recommend({
      items: [make('clean the kitchen by tomorrow')],
      parks: [],
      now: NOW,
      minutesFree: 5,
      energy: null,
    });
    expect(r.kind).toBe('rest');
  });

  it('prefers resuming parked work when nothing is pressing', () => {
    const park: Park = { id: 'p1', itemId: null, title: 'Presentation', nextAction: 'Find X revenue', where: 'Slide 7', createdAt: NOW.getTime() - 3600_000 };
    const r = recommend({ items: [make('finish the presentation')], parks: [park], now: NOW, minutesFree: null, energy: null });
    expect(r.kind).toBe('resume');
  });

  it('respects a swipe-away for the rest of the day', () => {
    const skipped = make('pay electricity by tomorrow', { skippedAt: NOW.getTime() - 60_000 });
    const other = make('reply to Priya');
    const r = recommend({ items: [skipped, other], parks: [], now: NOW, minutesFree: null, energy: null });
    expect(r.kind === 'item' && r.item.id).toBe(other.id);
  });

  it('gives tasks that keep sliding the smallest start, not more pressure', () => {
    const sliding = make('reply to the landlord', { postponeCount: 4 });
    const r = recommend({ items: [sliding], parks: [], now: NOW, minutesFree: null, energy: null });
    expect(r.kind === 'item' && r.size).toBe('cant');
  });

  it('low energy favours short tasks', () => {
    const long = make('clean the kitchen');
    const short = make('reply to Priya');
    const r = recommend({ items: [long, short], parks: [], now: NOW, minutesFree: null, energy: 'low' });
    expect(r.kind === 'item' && r.item.id).toBe(short.id);
  });

  it('never recommends things waiting on others or tied to a place', () => {
    const r = recommend({
      items: [make('waiting for refund from Amazon'), make('when I get home take the chicken out')],
      parks: [],
      now: NOW,
      minutesFree: null,
      energy: null,
    });
    expect(r.kind).toBe('rest');
  });
});

describe('fresh start', () => {
  const DAY = 24 * 3600_000;
  it('tucks away undated items untouched for 14 days', () => {
    const old = make('learn the ukulele', { lastTouchedAt: NOW.getTime() - 15 * DAY });
    const recent = make('learn Spanish', { lastTouchedAt: NOW.getTime() - 2 * DAY });
    const dated = make('pay rent by the 14th', { lastTouchedAt: NOW.getTime() - 30 * DAY });
    const { items, tucked } = tidy([old, recent, dated], NOW);
    expect(tucked).toBe(1);
    expect(items.map((i) => i.bucket)).toEqual(['someday', 'soon', 'scheduled']);
  });

  it('welcomes people back after five or more days away', () => {
    expect(daysAway(NOW.getTime() - 4 * DAY, NOW)).toBeNull();
    expect(daysAway(NOW.getTime() - 9 * DAY, NOW)).toBe(9);
    expect(daysAway(null, NOW)).toBeNull();
  });
});

describe('micro-steps', () => {
  it('gives the smallest physical step when it feels impossible', () => {
    expect(firstStep('Clean my room', 'cant').text).toBe('Put one thing away. Just one.');
    expect(START_MINUTES.cant).toBe(2);
  });

  it('heavier feelings start earlier in the sequence', () => {
    expect(firstStep('Taxes', 'cant').index).toBeLessThan(firstStep('Taxes', 'fine').index);
  });

  it('reveals one next step at a time and ends cleanly', () => {
    const steps = stepsFor('Call the dentist');
    expect(nextStep('Call the dentist', 0)?.text).toBe(steps[1]);
    expect(nextStep('Call the dentist', steps.length - 1)).toBeNull();
  });

  it('falls back to a generic first step for unknown tasks', () => {
    expect(firstStep('Fix the bike', 'cant').text).toBe('Get the first thing you need for "fix the bike" in front of you.');
  });
});
