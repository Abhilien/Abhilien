/**
 * Predictions are where an astrology app most invites invention, so these tests
 * are mostly about what the engine must refuse to do: speak above its evidence,
 * say the same thing every day, or let a factor that cannot know about Tuesday
 * decide what Tuesday looks like.
 */
import { describe, it, expect } from 'vitest';
import { castChart } from '../src/chart/kundali.js';
import { predict, HOUSE_SIGNIFICATIONS, houseMeaning } from '../src/prediction/predict.js';
import { taraBala, chandraBala } from '../src/prediction/bala.js';
import type { BirthData } from '../src/core/types.js';
import {
  TITHI_NAMES_HI, YOGA_NAMES_HI, KARANA_NAMES_HI, TARA_NAMES_HI,
} from '../src/prediction/devanagari.js';
import { TITHI_NAMES, YOGA_NAMES } from '../src/panchang/panchang.js';
import { TARA_NAMES } from '../src/muhurta/activities.js';

const birth: BirthData = {
  year: 1990, month: 8, day: 15, hour: 14, minute: 35, second: 0,
  location: { latitude: 24.949, longitude: 84.016, timezone: 'Asia/Kolkata', label: 'Sasaram, Bihar' },
  timeAccuracy: 'ToMinute',
};
const chart = castChart(birth).chart;
const day = new Date('2026-10-01T06:00:00Z');

describe('shape', () => {
  it('produces factors for every span', () => {
    for (const span of ['Day', 'Month', 'Year'] as const) {
      const p = predict(chart, day, span);
      expect(p.factors.length, span).toBeGreaterThan(0);
      expect(p.quiet, span).toBe(false);
      expect(p.span).toBe(span);
    }
  });

  it('bounds the window to the span it claims', () => {
    const d = predict(chart, day, 'Day');
    expect(d.to.getTime() - d.from.getTime()).toBe(86400000);

    const m = predict(chart, day, 'Month');
    expect(m.from.getDate()).toBe(1);
    expect(m.to.getMonth()).toBe((m.from.getMonth() + 1) % 12);

    const y = predict(chart, day, 'Year');
    expect(y.from.getMonth()).toBe(0);
    expect(y.from.getDate()).toBe(1);
    expect(y.to.getFullYear()).toBe(y.from.getFullYear() + 1);
  });

  it('keeps the tenor inside its stated range', () => {
    for (const span of ['Day', 'Month', 'Year'] as const) {
      const { tenor } = predict(chart, day, span);
      expect(tenor, span).toBeGreaterThanOrEqual(-1);
      expect(tenor, span).toBeLessThanOrEqual(1);
    }
  });
});

describe('a span only hears what can speak at its resolution', () => {
  it('never lets the panchang or the balas into a yearly reading', () => {
    const year = predict(chart, day, 'Year');
    const daily = year.factors.filter((f) => ['Panchang', 'TaraBala', 'ChandraBala'].includes(f.source));
    expect(daily).toEqual([]);
  });

  it('weights the daily measures above the dasha in a daily reading', () => {
    const d = predict(chart, day, 'Day');
    const tara = d.factors.find((f) => f.source === 'TaraBala')!;
    const dasha = d.factors.find((f) => f.source === 'Dasha')!;
    expect(tara.weight).toBeGreaterThan(dasha.weight);
  });

  it('weights the dasha above everything in a yearly reading', () => {
    const y = predict(chart, day, 'Year');
    expect(y.factors[0]!.source).toBe('Dasha');
  });
});

describe('a daily reading actually differs by day', () => {
  it('does not say the same thing on thirty consecutive days', () => {
    // The failure this guards is the one every such app has: slow factors
    // dominate, and the reading is identical for a year and a half.
    const texts = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(day.getTime() + i * 86400000);
      const p = predict(chart, d, 'Day');
      texts.add(p.factors.filter((f) => f.weight >= 0.7).map((f) => f.text).join('|'));
    }
    expect(texts.size).toBeGreaterThan(20);
  });

  it('moves the tenor around rather than reporting one mood all month', () => {
    const tenors = Array.from({ length: 30 }, (_, i) =>
      predict(chart, new Date(day.getTime() + i * 86400000), 'Day').tenor);
    expect(Math.max(...tenors) - Math.min(...tenors)).toBeGreaterThan(0.2);
  });
});

describe('it does not speak above its evidence', () => {
  it('claims no houses when the birth time cannot support them', () => {
    const blind = castChart({ ...birth, timeAccuracy: 'Unknown' }).chart;
    const p = predict(blind, day, 'Year');
    expect(p.factors.every((f) => f.houses.length === 0)).toBe(true);
    expect(p.areas).toEqual([]);
  });

  it('still reads the dasha without a birth time, since it does not need one', () => {
    const blind = castChart({ ...birth, timeAccuracy: 'Unknown' }).chart;
    expect(predict(blind, day, 'Year').factors.some((f) => f.source === 'Dasha')).toBe(true);
  });

  it('names a house only from the fixed signification table', () => {
    const p = predict(chart, day, 'Year');
    for (const area of p.areas) expect(HOUSE_SIGNIFICATIONS[area.house]).toBeTruthy();
  });

  it('attributes every factor to a computation', () => {
    const sources = new Set(predict(chart, day, 'Day').factors.map((f) => f.source));
    for (const source of sources) {
      expect(['Dasha', 'Antardasha', 'Gochar', 'SadeSati', 'Panchang', 'TaraBala', 'ChandraBala'])
        .toContain(source);
    }
  });

  it('never promises or threatens in the fixed wording', () => {
    // Health, death and money guarantees are the three things that get an
    // astrology app removed from a store, and the three the engine must not say.
    const all = (['Day', 'Month', 'Year'] as const)
      .flatMap((s) => predict(chart, day, s).factors.map((f) => f.text))
      .join(' ');
    expect(all).not.toMatch(/\b(will die|guaranteed|cure|cancer|definitely will)\b/i);
  });
});

describe('bala', () => {
  it('runs tara 1..9 and names each one', () => {
    const seen = new Map<number, string>();
    for (let n = 0; n < 27; n += 1) {
      const t = taraBala(chart, n);
      expect(t.number).toBeGreaterThanOrEqual(1);
      expect(t.number).toBeLessThanOrEqual(9);
      seen.set(t.number, t.name);
    }
    expect(seen.size).toBe(9);
    // Janma tara is the birth star itself, and is one of the obstructive ones.
    expect(taraBala(chart, chart.positions.Moon.nakshatra).number).toBe(1);
  });

  it('counts chandra bala 1..12 from the natal Moon', () => {
    for (let sign = 0; sign < 12; sign += 1) {
      const c = chandraBala(chart, sign as 0);
      expect(c.houseFromMoon).toBeGreaterThanOrEqual(1);
      expect(c.houseFromMoon).toBeLessThanOrEqual(12);
    }
    expect(chandraBala(chart, chart.positions.Moon.rashi).houseFromMoon).toBe(1);
  });
});

describe('Hindi', () => {
  const DEVANAGARI = /[\u0900-\u097f]/;

  it('writes the whole reading in Devanagari, not just the headings', () => {
    for (const span of ['Day', 'Month', 'Year'] as const) {
      const p = predict(chart, day, span, { lang: 'hi' });
      for (const f of p.factors) {
        expect(DEVANAGARI.test(f.text), `${span} ${f.source} text`).toBe(true);
        expect(DEVANAGARI.test(f.subject), `${span} ${f.source} subject`).toBe(true);
      }
    }
  });

  it('leaves no English sentence fragments behind in the Hindi reading', () => {
    // The usual half-translated failure: the frame is Hindi and a clause that
    // only one branch produces is still English.
    const all = predict(chart, day, 'Day', { lang: 'hi' }).factors.map((f) => f.text).join(' ');
    expect(all).not.toMatch(/\b(the|is|and|which|from|your)\b/);
  });

  it('reads the same facts in both languages', () => {
    const en = predict(chart, day, 'Day');
    const hi = predict(chart, day, 'Day', { lang: 'hi' });
    expect(hi.factors.map((f) => f.source)).toEqual(en.factors.map((f) => f.source));
    expect(hi.factors.map((f) => f.polarity)).toEqual(en.factors.map((f) => f.polarity));
    expect(hi.tenor).toBe(en.tenor);
    expect(hi.areas).toEqual(en.areas);
  });

  it('translates the house meanings too', () => {
    for (let h = 1; h <= 12; h += 1) {
      expect(DEVANAGARI.test(houseMeaning(h, 'hi')), `house ${h}`).toBe(true);
      expect(houseMeaning(h, 'en')).toBeTruthy();
    }
  });
});

describe('the Devanagari tables line up with the Latin ones', () => {
  it('has a Hindi name for every tithi, yoga, karana and tara', () => {
    // Index-aligned tables drift silently when one gains an entry. The engine
    // would then print a Latin name in the middle of a Hindi sentence, which is
    // exactly the half-translated reading this was added to fix.
    expect(TITHI_NAMES_HI.length).toBe(TITHI_NAMES.length);
    expect(YOGA_NAMES_HI.length).toBe(YOGA_NAMES.length);
    expect(TARA_NAMES_HI.length).toBe(TARA_NAMES.length);
    for (const karana of ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti',
      'Kimstughna', 'Shakuni', 'Chatushpada', 'Naga']) {
      expect(KARANA_NAMES_HI[karana], karana).toBeTruthy();
    }
  });

  // Every third day across a year: 122 readings, each computing a full panchang.
  // The cycles being sampled are 15, 27, 11 and 9 long, so a stride of three
  // still visits all of them, and the test costs twelve seconds instead of
  // thirty-seven. The budget is stated rather than left to time out at five.
  it('leaves no Latin transliteration in a Hindi daily reading', { timeout: 60_000 }, () => {
    for (let i = 0; i < 366; i += 3) {
      const d = new Date(day.getTime() + i * 86400000);
      const text = predict(chart, d, 'Day', { lang: 'hi' }).factors.map((f) => f.text).join(' ');
      const latin = text.match(/[A-Za-z]{3,}/g) ?? [];
      // "am" and "pm" come from the time formatter and are expected.
      const unexpected = latin.filter((wordToken) => !/^(am|pm)$/i.test(wordToken));
      expect(unexpected, `day +${i}: ${unexpected.join(', ')}`).toEqual([]);
    }
  });
});
