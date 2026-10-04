import { describe, expect, it } from 'vitest';
import { parseCapture, parseSegment, splitCapture } from './parser';

// Thursday 1 October 2026, 10:00 local time.
const NOW = new Date(2026, 9, 1, 10, 0);

const one = (text: string, now = NOW) => {
  const { items } = parseCapture(text, now);
  expect(items).toHaveLength(1);
  return items[0]!;
};

describe('splitCapture', () => {
  it('splits a messy brain dump into items', () => {
    const parts = splitCapture(
      'okay so I need groceries, call mom, finish the presentation, toothpaste, pay the credit card, email my manager about Friday, and ask Rahul about the car',
    );
    expect(parts).toHaveLength(7);
  });

  it('does not split "mom and dad"', () => {
    expect(splitCapture('call mom and dad tonight')).toEqual(['call mom and dad tonight']);
  });

  it('splits "X and <verb> Y" into two items', () => {
    expect(splitCapture('pay rent and call the landlord')).toHaveLength(2);
  });

  it('expands a bare grocery list', () => {
    expect(splitCapture('milk eggs bread')).toEqual(['buy milk', 'buy eggs', 'buy bread']);
  });

  it('keeps travel time attached to its appointment', () => {
    expect(splitCapture('dentist at 6pm, 25 min drive')).toEqual(['dentist at 6pm, 25 min drive']);
  });
});

// Golden cases from the product spec (Part 7 §33.4).
describe('golden cases', () => {
  it('remind me to call mom tomorrow → asks which part of the day', () => {
    const item = one('remind me to call mom tomorrow');
    expect(item.title).toBe('Call mom');
    expect(item.kind).toBe('reminder');
    expect(item.due?.date).toBe('2026-10-02');
    expect(item.ambiguity?.options.map((o) => o.label)).toEqual(['Morning', 'Afternoon', 'Evening']);
    expect(item.people).toContain('Mom');
  });

  it('pay electricity by the 14th → money deadline', () => {
    const item = one('pay electricity by the 14th');
    expect(item.title).toBe('Pay electricity');
    expect(item.due?.date).toBe('2026-10-14');
    expect(item.isDeadline).toBe(true);
    expect(item.money).toBe(true);
    expect(item.estMinutes).toBe(3);
    expect(item.ambiguity).toBeNull();
  });

  it('documents for the office → leave-for trigger with a reason', () => {
    const item = one("tomorrow morning remind me to take the documents because I'm going to the office");
    expect(item.title).toBe('Take the documents');
    expect(item.trigger).toEqual({ type: 'leave_for', place: 'office' });
    expect(item.why).toBe("I'm going to the office");
    expect(item.due).toEqual({ date: '2026-10-02', time: null, daypart: 'morning' });
  });

  it('when I get home → place trigger', () => {
    const item = one('when I get home take the chicken out');
    expect(item.title).toBe('Take the chicken out');
    expect(item.trigger).toEqual({ type: 'place', place: 'home', on: 'arrive' });
    expect(item.kind).toBe('reminder');
  });

  it('waiting for a refund → waiting item expected within a week', () => {
    const item = one('waiting for refund from Amazon');
    expect(item.kind).toBe('waiting');
    expect(item.title).toBe('Refund from Amazon');
    expect(item.due?.date).toBe('2026-10-08');
  });

  it('ask Rahul about the car → person trigger with an alternative', () => {
    const item = one('ask Rahul about the car');
    expect(item.trigger).toEqual({ type: 'person', name: 'Rahul' });
    expect(item.people).toEqual(['Rahul']);
    expect(item.ambiguity?.options[0]?.label).toBe('Next time I see Rahul');
  });

  it('"next Friday" said on a Thursday is ambiguous and defaults to the nearer date', () => {
    const item = one('book the haircut next Friday');
    expect(item.due?.date).toBe('2026-10-02');
    expect(item.ambiguity?.options).toHaveLength(2);
    expect(item.ambiguity?.options[1]?.patch.due?.date).toBe('2026-10-09');
  });

  it('milk eggs bread → three shopping items', () => {
    const { items } = parseCapture('milk eggs bread', NOW);
    expect(items.map((i) => [i.kind, i.title])).toEqual([
      ['shopping', 'Milk'],
      ['shopping', 'Eggs'],
      ['shopping', 'Bread'],
    ]);
  });

  it('distress without a task → overwhelm signal, no items', () => {
    const result = parseCapture("I'm so behind on everything", NOW);
    expect(result.items).toHaveLength(0);
    expect(result.signal).toBe('overwhelm');
  });

  it('take meds at 8 → 8am medication reminder, no dosing text', () => {
    const item = one('take meds at 8');
    expect(item.meds).toBe(true);
    expect(item.due?.time).toBe('08:00');
    expect(item.due?.date).toBe('2026-10-02'); // 8am already passed today
    expect(item.importance).toBe('high');
  });

  it('cancel a trial → reminder two days before it charges', () => {
    const item = one('cancel Netflix trial before it charges on the 20th');
    expect(item.money).toBe(true);
    expect(item.due?.date).toBe('2026-10-18');
    expect(item.why).toMatch(/Trial charges/);
  });
});

describe('dates and times', () => {
  it('bare afternoon hours are pm', () => {
    expect(parseSegment('call the bank at 3', NOW).due?.time).toBe('15:00');
  });

  it('explicit clock times', () => {
    expect(parseSegment('standup at 9:45am tomorrow', NOW).due).toEqual({ date: '2026-10-02', time: '09:45', daypart: null });
  });

  it('tonight', () => {
    expect(parseSegment('water the plants tonight', NOW).due).toEqual({ date: '2026-10-01', time: '20:00', daypart: null });
  });

  it('relative times', () => {
    expect(parseSegment('check the oven in 20 minutes', NOW).due).toEqual({ date: '2026-10-01', time: '10:20', daypart: null });
  });

  it('day and month', () => {
    expect(parseSegment('renew passport by 3 Nov', NOW).due?.date).toBe('2026-11-03');
    expect(parseSegment('dentist on Dec 12', NOW).due?.date).toBe('2026-12-12');
  });

  it('a day-of-month already passed rolls to next month', () => {
    expect(parseSegment('pay rent on the 1st', new Date(2026, 9, 15, 9)).due?.date).toBe('2026-11-01');
  });

  it('weekday topics are not dates', () => {
    const item = parseSegment('email my manager about Friday', NOW);
    expect(item.due).toBeNull();
    expect(item.title).toBe('Email my manager about Friday');
  });

  it('"sat down" is not Saturday', () => {
    const item = parseSegment('sat down to fix the bike on saturday', NOW);
    expect(item.due?.date).toBe('2026-10-03');
    expect(item.title).toBe('Sat down to fix the bike');
  });

  it('abbreviated weekdays after a preposition', () => {
    expect(parseSegment('lunch with Sam at noon on Mon', NOW).due).toEqual({ date: '2026-10-05', time: '12:00', daypart: null });
  });

  it('never invents a date', () => {
    expect(parseSegment('finish the presentation', NOW).due).toBeNull();
  });
});

describe('items and metadata', () => {
  it('appointments with travel time become leave events', () => {
    const item = one('dentist at 6pm, 25 min drive');
    expect(item.title).toBe('Dentist');
    expect(item.event).toEqual({ travelMin: 25 });
    expect(item.due?.time).toBe('18:00');
  });

  it("I can't deal with my taxes → task with the smallest start size", () => {
    const item = one("I can't deal with my taxes");
    expect(item.title).toBe('Taxes');
    expect(item.sizeHint).toBe('cant');
  });

  it('notes are kept as notes', () => {
    const item = one('idea: a podcast about maps');
    expect(item.kind).toBe('note');
    expect(item.title).toBe('A podcast about maps');
  });

  it('a whole brain dump', () => {
    const { items } = parseCapture(
      'okay so I need groceries, call mom, finish the presentation, toothpaste, pay the credit card, email my manager about Friday, and ask Rahul about the car',
      NOW,
    );
    expect(items.map((i) => i.kind)).toEqual(['shopping', 'task', 'task', 'shopping', 'task', 'task', 'reminder']);
    expect(items.find((i) => i.title === 'Pay the credit card')?.money).toBe(true);
  });

  it('people after "with"', () => {
    expect(parseSegment('lunch with Sam at noon', NOW).people).toEqual(['Sam']);
  });

  it('when I see someone → person trigger', () => {
    expect(parseSegment('give the book back when I see Priya', NOW).trigger).toEqual({ type: 'person', name: 'Priya' });
  });
});
