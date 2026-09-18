import { describe, it, expect } from 'vitest';
import * as Astro from 'astronomy-engine';
import { computePanchang, TITHI_NAMES, YOGA_NAMES } from '../src/panchang/panchang.js';
import { WEEKDAY_LORDS } from '../src/core/constants.js';
import type { GeoLocation } from '../src/core/types.js';

const VARANASI: GeoLocation = {
  latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata', label: 'Varanasi',
};

describe('the five limbs', () => {
  it('reports a tithi in range with a consistent paksha', () => {
    for (let day = 1; day <= 28; day++) {
      const p = computePanchang(new Date(Date.UTC(2025, 5, day, 6, 0)), VARANASI);
      expect(p.tithi.index).toBeGreaterThanOrEqual(1);
      expect(p.tithi.index).toBeLessThanOrEqual(30);
      expect(p.tithi.number).toBeGreaterThanOrEqual(1);
      expect(p.tithi.number).toBeLessThanOrEqual(15);
      expect(p.tithi.paksha).toBe(p.tithi.index <= 15 ? 'Shukla' : 'Krishna');
    }
  });

  it('calls the full moon Purnima and the new moon Amavasya', () => {
    // Anchor on the actual lunar phases rather than on calendar dates.
    const full = Astro.SearchMoonPhase(180, Astro.MakeTime(new Date(Date.UTC(2025, 0, 1))), 40)!;
    const nw = Astro.SearchMoonPhase(0, Astro.MakeTime(new Date(Date.UTC(2025, 0, 1))), 40)!;

    // Step just inside each tithi so we are not sitting exactly on the boundary.
    const atFull = computePanchang(new Date(full.date.getTime() - 3600_000), VARANASI);
    const atNew = computePanchang(new Date(nw.date.getTime() - 3600_000), VARANASI);

    expect(atFull.tithi.name).toBe('Purnima');
    expect(atFull.tithi.paksha).toBe('Shukla');
    expect(atNew.tithi.name).toBe('Amavasya');
    expect(atNew.tithi.paksha).toBe('Krishna');
  });

  it('names tithis from the standard list', () => {
    const p = computePanchang(new Date(Date.UTC(2025, 5, 10, 6, 0)), VARANASI);
    expect([...TITHI_NAMES, 'Purnima', 'Amavasya']).toContain(p.tithi.name);
  });

  it('reports a nakshatra, yoga and karana in range', () => {
    const p = computePanchang(new Date(Date.UTC(2025, 5, 10, 6, 0)), VARANASI);
    expect(p.nakshatra.index).toBeGreaterThanOrEqual(0);
    expect(p.nakshatra.index).toBeLessThanOrEqual(26);
    expect(YOGA_NAMES).toContain(p.yoga.name);
    expect(p.karana.index).toBeGreaterThanOrEqual(0);
    expect(p.karana.index).toBeLessThanOrEqual(59);
  });

  it('runs the karana cycle correctly over a whole lunar month', () => {
    // Kimstughna opens the month, the seven movable karanas repeat eight times,
    // and Shakuni, Chatushpada and Naga close it.
    const names = new Set<string>();
    const start = Astro.SearchMoonPhase(0, Astro.MakeTime(new Date(Date.UTC(2025, 2, 1))), 40)!;
    for (let h = 0; h < 30 * 24; h += 3) {
      const p = computePanchang(new Date(start.date.getTime() + h * 3600_000), VARANASI);
      names.add(p.karana.name);
    }
    expect(names.size).toBe(11);
    for (const fixed of ['Kimstughna', 'Shakuni', 'Chatushpada', 'Naga', 'Vishti']) {
      expect(names, fixed).toContain(fixed);
    }
  });

  it('gives each limb an end time in the future and within its maximum span', () => {
    const now = new Date(Date.UTC(2025, 5, 10, 6, 0));
    const p = computePanchang(now, VARANASI);
    for (const limb of [p.tithi, p.nakshatra, p.yoga, p.karana]) {
      expect(limb.endsAt.getTime()).toBeGreaterThan(now.getTime());
      expect(limb.elapsed).toBeGreaterThanOrEqual(0);
      expect(limb.elapsed).toBeLessThan(1);
    }
    // A karana is half a tithi, so it can never outlast one.
    expect(p.karana.endsAt.getTime()).toBeLessThanOrEqual(p.tithi.endsAt.getTime() + 1000);
  });
});

describe('the sunrise-anchored day', () => {
  it('finds sunrise before sunset before the next sunrise', () => {
    const p = computePanchang(new Date(Date.UTC(2025, 5, 10, 8, 0)), VARANASI);
    expect(p.sunrise).not.toBeNull();
    expect(p.sunset!.getTime()).toBeGreaterThan(p.sunrise!.getTime());
    expect(p.nextSunrise!.getTime()).toBeGreaterThan(p.sunset!.getTime());
  });

  it('anchors the vara on the sunrise that opened the Hindu day', () => {
    // 02:00 IST is before sunrise, so it still belongs to the previous vara.
    const beforeSunrise = computePanchang(new Date('2025-06-10T20:30:00Z'), VARANASI); // 02:00 IST 11 Jun
    const afterSunrise = computePanchang(new Date('2025-06-11T06:00:00Z'), VARANASI);  // 11:30 IST 11 Jun
    expect(beforeSunrise.sunrise!.getTime()).toBeLessThan(afterSunrise.sunrise!.getTime());
    expect(beforeSunrise.vara.index).toBe((afterSunrise.vara.index + 6) % 7);
  });
});

describe('day divisions', () => {
  const p = computePanchang(new Date(Date.UTC(2025, 5, 10, 8, 0)), VARANASI);

  it('makes Rahu Kaal exactly one eighth of the daylight, inside daylight', () => {
    const daylight = p.sunset!.getTime() - p.sunrise!.getTime();
    const span = p.rahuKaal!.end.getTime() - p.rahuKaal!.start.getTime();
    expect(span).toBeCloseTo(daylight / 8, -2);
    expect(p.rahuKaal!.start.getTime()).toBeGreaterThanOrEqual(p.sunrise!.getTime());
    expect(p.rahuKaal!.end.getTime()).toBeLessThanOrEqual(p.sunset!.getTime() + 1);
  });

  it('keeps Rahu Kaal, Gulika and Yamaganda in different parts of the day', () => {
    const starts = [p.rahuKaal!, p.gulikaKaal!, p.yamaganda!].map((w) => w.start.getTime());
    expect(new Set(starts).size).toBe(3);
  });

  it('omits Abhijit on Wednesday and provides it otherwise', () => {
    for (let day = 8; day <= 14; day++) {
      const q = computePanchang(new Date(Date.UTC(2025, 5, day, 8, 0)), VARANASI);
      if (q.vara.index === 3) expect(q.abhijitMuhurta, 'Wednesday').toBeNull();
      else expect(q.abhijitMuhurta, q.vara.name).not.toBeNull();
    }
  });

  it('tiles the daylight with eight choghadiya segments', () => {
    expect(p.choghadiya).toHaveLength(8);
    expect(p.choghadiya[0]!.start.getTime()).toBe(p.sunrise!.getTime());
    expect(p.choghadiya[7]!.end.getTime()).toBe(p.sunset!.getTime());
    for (let i = 1; i < 8; i++) {
      expect(p.choghadiya[i]!.start.getTime()).toBe(p.choghadiya[i - 1]!.end.getTime());
    }
  });

  it('starts the horas with the lord of the day and runs twenty-four', () => {
    expect(p.hora).toHaveLength(24);
    expect(p.hora[0]!.name).toBe(WEEKDAY_LORDS[p.vara.index]);
    expect(p.hora[0]!.start.getTime()).toBe(p.sunrise!.getTime());
    expect(p.hora[23]!.end.getTime()).toBe(p.nextSunrise!.getTime());
  });

  it('gives the next day the lord that follows in the weekday cycle', () => {
    // Twenty-four horas in Chaldean order advance the day lord by exactly one.
    const today = computePanchang(new Date(Date.UTC(2025, 5, 10, 8, 0)), VARANASI);
    const tomorrow = computePanchang(new Date(Date.UTC(2025, 5, 11, 8, 0)), VARANASI);
    expect(tomorrow.vara.index).toBe((today.vara.index + 1) % 7);
    expect(tomorrow.hora[0]!.name).toBe(WEEKDAY_LORDS[tomorrow.vara.index]);
  });
});

describe('high latitude', () => {
  it('degrades gracefully where the sun may not rise', () => {
    const tromso: GeoLocation = {
      latitude: 69.65, longitude: 18.96, timezone: 'Europe/Oslo', label: 'Tromso',
    };
    const p = computePanchang(new Date(Date.UTC(2025, 11, 21, 12, 0)), tromso);
    // The five limbs never depend on sunrise, so they must still be present.
    expect(p.tithi.name).toBeTruthy();
    expect(p.nakshatra.name).toBeTruthy();
    // Day divisions may legitimately be unavailable.
    expect(p.choghadiya.length === 0 || p.choghadiya.length === 8).toBe(true);
  });
});
