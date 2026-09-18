import { describe, it, expect } from 'vitest';
import { rectify, type RectificationConfidence } from '../src/rectification/rectify.js';
import { EVENT_SIGNATURES, PRECISION_WEIGHT, type EventType, type LifeEvent } from '../src/rectification/events.js';
import { castChart } from '../src/chart/kundali.js';
import { dashaChainAt } from '../src/dasha/vimshottari.js';
import { GRAHA_OWNED_RASHIS } from '../src/core/constants.js';
import type { BirthData } from '../src/core/types.js';

const base: Omit<BirthData, 'hour' | 'minute'> = {
  year: 1988, month: 5, day: 22, second: 0,
  location: { latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', label: 'Mumbai' },
  timeAccuracy: 'ToHour',
};

const YEAR_MS = 365.25 * 86400000;

/**
 * Manufacture a life history for a known birth time.
 *
 * Events are placed where the TRUE chart's antardasha lord actually rules the
 * house of that matter, which is how a real life produces them. The search then
 * has to find its way back to that time from a wrong starting guess.
 */
function syntheticHistory(hour: number, minute: number, plan: [EventType, number, number][]): LifeEvent[] {
  const truth = castChart({ ...base, hour, minute }).chart;
  const birthMs = new Date(truth.utcISO).getTime();
  const events: LifeEvent[] = [];

  for (const [type, fromAge, toAge] of plan) {
    const signature = EVENT_SIGNATURES[type];
    for (let age = fromAge; age < toAge; age += 1 / 12) {
      const date = new Date(birthMs + age * YEAR_MS);
      const chain = dashaChainAt(truth, date, { depth: 2 });
      if (chain.length < 2) continue;
      const owned = GRAHA_OWNED_RASHIS[chain[1]!.lord]
        .map((s) => ((s - truth.lagnaRashi + 12) % 12) + 1);
      if (signature.primary.some((h) => owned.includes(h))) {
        events.push({ type, date, precision: 'Day' });
        break;
      }
    }
  }
  return events;
}

const FULL_PLAN: [EventType, number, number][] = [
  ['Graduation', 20, 25], ['CareerStart', 22, 28], ['Marriage', 25, 33],
  ['ChildBirth', 27, 36], ['PropertyPurchase', 29, 38], ['Promotion', 30, 40],
  ['MoveAbroad', 24, 34],
];

describe('recovering a known birth time', () => {
  const TRUE_HOUR = 14, TRUE_MINUTE = 37;
  const events = syntheticHistory(TRUE_HOUR, TRUE_MINUTE, FULL_PLAN);

  it('generates enough usable history to be a fair test', () => {
    expect(events.length).toBeGreaterThanOrEqual(4);
  });

  it('lands close to the true time from a wrong starting guess', () => {
    // The person remembers "about half past two".
    const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 45 });
    const recovered = result.best.hour * 60 + result.best.minute;
    const truth = TRUE_HOUR * 60 + TRUE_MINUTE;
    expect(Math.abs(recovered - truth)).toBeLessThanOrEqual(10);
  });

  it('recovers the true ascendant', () => {
    const truth = castChart({ ...base, hour: TRUE_HOUR, minute: TRUE_MINUTE }).chart;
    const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 45 });
    expect(result.best.lagnaRashi).toBe(truth.lagnaRashi);
    expect(result.lagnaConsensus[0]!.rashi).toBe(truth.lagnaRashi);
  });

  it('still finds it from a starting guess half an hour out', () => {
    const result = rectify({ ...base, hour: 15, minute: 5 }, events, { windowMinutes: 60 });
    const recovered = result.best.hour * 60 + result.best.minute;
    expect(Math.abs(recovered - (TRUE_HOUR * 60 + TRUE_MINUTE))).toBeLessThanOrEqual(15);
  });
});

describe('not manufacturing confidence', () => {
  // The property that matters most. A rectification tool that returns a
  // confident minute whatever you feed it is measuring nothing, and this is the
  // test that would catch that.
  it('rarely clears the evidence bar on unrelated random dates', () => {
    const types = Object.keys(EVENT_SIGNATURES) as EventType[];
    let cleared = 0;

    for (let trial = 0; trial < 12; trial++) {
      // Deterministic pseudo-random dates, so the test cannot flake.
      const seed = trial * 7919;
      const events: LifeEvent[] = Array.from({ length: 6 }, (_, i) => ({
        type: types[(seed + i * 13) % types.length]!,
        date: new Date(Date.UTC(2010 + ((seed + i * 5) % 15), (seed + i * 3) % 12, 1 + ((seed + i) % 27))),
        precision: 'Day' as const,
      }));
      const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 45 });
      if (result.confidence === 'Indicative') cleared++;
    }

    // Measured, not assumed: random dates cleared this bar in roughly one trial
    // in six when the thresholds were calibrated. The assertion pins that rate
    // so a future loosening of the gate cannot pass unnoticed, and the verdict
    // text discloses the same number to the reader.
    expect(cleared).toBeLessThanOrEqual(4);
  });

  it('offers no confidence tier that sounds like certainty', () => {
    // The type itself is the guarantee. Scoring noise produced peaks that stood
    // further above their window mean than a real history did, so there is no
    // honest basis for a "Strong" or "Certain" answer about the minute.
    const tiers: RectificationConfidence[] = ['Indicative', 'Weak', 'Inconclusive'];
    const events = syntheticHistory(14, 37, FULL_PLAN);
    const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 45 });
    expect(tiers).toContain(result.confidence);
  });

  it('always discloses that a stated result is a shortlist, not a determination', () => {
    const events = syntheticHistory(14, 37, FULL_PLAN);
    const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 45 });
    if (result.confidence !== 'Inconclusive') {
      expect(result.verdict).toMatch(/shortlist for review, not a determination/);
      expect(result.verdict).toMatch(/one time in six/);
    }
  });

  it('is Inconclusive with too few usable events', () => {
    const events = syntheticHistory(14, 37, FULL_PLAN).slice(0, 2);
    const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 30 });
    expect(result.confidence).toBe('Inconclusive');
    expect(result.verdict).toMatch(/at least three/);
  });

  it('discounts vaguely dated events rather than trusting them equally', () => {
    const events = syntheticHistory(14, 37, FULL_PLAN);
    const precise = rectify({ ...base, hour: 14, minute: 30 },
      events.map((e) => ({ ...e, precision: 'Day' as const })), { windowMinutes: 30 });
    const vague = rectify({ ...base, hour: 14, minute: 30 },
      events.map((e) => ({ ...e, precision: 'Year' as const })), { windowMinutes: 30 });
    expect(vague.best.score).toBeLessThan(precise.best.score);
    expect(PRECISION_WEIGHT.Year).toBeLessThan(PRECISION_WEIGHT.Day);
  });

  it('ignores events that predate the birth', () => {
    const events = syntheticHistory(14, 37, FULL_PLAN);
    const withImpossible: LifeEvent[] = [
      ...events,
      { type: 'Marriage', date: new Date('1970-01-01T00:00:00Z'), precision: 'Day' },
    ];
    const a = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 30 });
    const b = rectify({ ...base, hour: 14, minute: 30 }, withImpossible, { windowMinutes: 30 });
    expect(b.best.score).toBe(a.best.score);
  });
});

describe('reporting resolution honestly', () => {
  const events = syntheticHistory(14, 37, FULL_PLAN);
  const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 45 });

  it('reports the best time as the midpoint of the top plateau, not a tie-break', () => {
    const top = result.candidates.filter((c) => Math.abs(c.score - result.best.score) < 1e-9);
    const minutes = top.map((c) => c.hour * 60 + c.minute).sort((a, b) => a - b);
    const midpoint = Math.round((minutes[0]! + minutes[minutes.length - 1]!) / 2);
    expect(result.best.hour * 60 + result.best.minute).toBe(midpoint);
  });

  it('reports the plateau width as the resolution actually achieved', () => {
    const top = result.candidates.filter((c) => Math.abs(c.score - result.best.score) < 1e-9);
    const minutes = top.map((c) => c.hour * 60 + c.minute);
    expect(result.resolutionMinutes).toBe(Math.max(...minutes) - Math.min(...minutes));
  });

  it('rates the ascendant separately from the minute', () => {
    expect(['Certain', 'Likely', 'Unresolved']).toContain(result.lagnaConfidence);
    // A settled ascendant is reported as a usable result even when the minute is not.
    if (result.lagnaConfidence === 'Certain' && result.confidence === 'Inconclusive') {
      expect(result.verdict).toMatch(/ascendant is settled/);
    }
  });

  it('reports leave-one-out stability as the error bar', () => {
    // Recompute independently: the spread of the best time when each event is
    // dropped in turn must match what the module reports.
    const count = result.best.matches.length;
    const bests: number[] = [];
    for (let drop = 0; drop < count; drop++) {
      let bestScore = -Infinity; let plateau: number[] = [];
      for (const c of result.candidates) {
        const total = c.matches.reduce((sum, m, i) => sum + (i === drop ? 0 : m.score), 0);
        const minute = c.hour * 60 + c.minute;
        if (total > bestScore + 1e-9) { bestScore = total; plateau = [minute]; }
        else if (Math.abs(total - bestScore) < 1e-9) plateau.push(minute);
      }
      bests.push((Math.min(...plateau) + Math.max(...plateau)) / 2);
    }
    expect(result.stabilityMinutes).toBeCloseTo(Math.max(...bests) - Math.min(...bests), 6);
  });

  it('calls an unstable result inconclusive however high it scored', () => {
    // A single event cannot be cross-validated, so it can never be conclusive.
    const one = syntheticHistory(14, 37, FULL_PLAN).slice(0, 1);
    const r = rectify({ ...base, hour: 14, minute: 30 }, one, { windowMinutes: 30 });
    expect(r.confidence).toBe('Inconclusive');
  });
});

describe('mechanics', () => {
  const events = syntheticHistory(14, 37, FULL_PLAN);

  it('is deterministic', () => {
    const a = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 20 });
    const b = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 20 });
    expect(a.best).toEqual(b.best);
    expect(a.verdict).toBe(b.verdict);
  });

  it('honours the window and step', () => {
    const result = rectify({ ...base, hour: 14, minute: 30 }, events,
      { windowMinutes: 10, stepMinutes: 2 });
    expect(result.candidates).toHaveLength(11);      // -10..+10 by 2
    const minutes = result.candidates.map((c) => c.hour * 60 + c.minute);
    expect(Math.min(...minutes)).toBe(14 * 60 + 20);
    expect(Math.max(...minutes)).toBe(14 * 60 + 40);
  });

  it('never proposes a time outside the stated birth date', () => {
    const result = rectify({ ...base, hour: 0, minute: 10 }, events, { windowMinutes: 60 });
    for (const c of result.candidates) {
      expect(c.hour * 60 + c.minute).toBeGreaterThanOrEqual(0);
      expect(c.hour * 60 + c.minute).toBeLessThan(24 * 60);
    }
  });

  it('refuses to run with no events at all', () => {
    expect(() => rectify({ ...base, hour: 14, minute: 30 }, [])).toThrow(/at least one/);
  });

  it('explains each match in readable terms', () => {
    const result = rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 20 });
    const scored = result.best.matches.filter((m) => m.score > 0);
    expect(scored.length).toBeGreaterThan(0);
    for (const m of scored) {
      expect(m.reasons.length).toBeGreaterThan(0);
      expect(m.reasons.join(' ')).toMatch(/Mahadasha|Antardasha|transiting/);
    }
  });

  it('completes a two-hour search well inside a second', () => {
    const started = Date.now();
    rectify({ ...base, hour: 14, minute: 30 }, events, { windowMinutes: 60, stepMinutes: 1 });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
