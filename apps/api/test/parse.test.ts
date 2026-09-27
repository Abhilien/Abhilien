/**
 * The boundary where untyped JSON becomes a BirthData.
 *
 * TypeScript stops at the edge of the process; everything past `JSON.parse` is
 * whatever the client sent. These are the checks that have to hold there.
 */
import { describe, it, expect } from 'vitest';
import { parseBirth } from '../src/parse.js';
import { castChart } from '@jyotish/engine';

const valid = {
  year: 1990, month: 8, day: 15, hour: 14, minute: 35, second: 0,
  location: { latitude: 28.651, longitude: 77.231, timezone: 'Asia/Kolkata', label: 'Delhi' },
};

describe('required fields', () => {
  it('accepts a complete birth', () => {
    expect(parseBirth(valid).year).toBe(1990);
  });

  it('rejects anything missing a date, a time or a location', () => {
    for (const key of ['year', 'month', 'day', 'hour', 'minute', 'location']) {
      const broken: Record<string, unknown> = { ...valid };
      delete broken[key];
      expect(() => parseBirth(broken), key).toThrow(/must supply/);
    }
  });

  it('rejects coordinates off the globe', () => {
    expect(() => parseBirth({ ...valid, location: { ...valid.location, latitude: 91 } }))
      .toThrow(/within/);
    expect(() => parseBirth({ ...valid, location: { ...valid.location, longitude: -181 } }))
      .toThrow(/within/);
  });
});

describe('time accuracy', () => {
  it('accepts every accuracy the engine defines', () => {
    for (const a of ['Exact', 'ToMinute', 'ToFiveMin', 'ToFifteenMin', 'ToHour', 'ToPartOfDay', 'Unknown']) {
      expect(() => parseBirth({ ...valid, timeAccuracy: a }), a).not.toThrow();
    }
  });

  it('treats a missing accuracy as acceptable', () => {
    expect(() => parseBirth(valid)).not.toThrow();
  });

  it('rejects an accuracy it does not recognise', () => {
    // The failure this prevents is silent rather than loud: an unrecognised
    // value used to sail through the cast and be read as "known to the minute",
    // so a client typo bought a confidently stated ascendant for a guessed time.
    for (const a of ['WithinHour', 'PartOfDay', 'exact', '', 'approximate']) {
      expect(() => parseBirth({ ...valid, timeAccuracy: a }), JSON.stringify(a))
        .toThrow(/timeAccuracy must be one of/);
    }
  });

  it('never lets an imprecise time through without a warning on the chart', () => {
    for (const a of ['ToHour', 'ToPartOfDay'] as const) {
      const { warnings } = castChart(parseBirth({ ...valid, timeAccuracy: a }));
      expect(warnings.map((w) => w.code), a).toContain('COARSE_BIRTH_TIME');
    }
    const unknown = castChart(parseBirth({ ...valid, timeAccuracy: 'Unknown' }));
    expect(unknown.warnings.map((w) => w.code)).toContain('UNKNOWN_BIRTH_TIME');
  });
});
