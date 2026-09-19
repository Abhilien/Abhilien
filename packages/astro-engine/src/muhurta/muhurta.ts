/**
 * Muhurta — finding auspicious windows for an activity.
 *
 * Two-pass by necessity. The full panchang costs about 18ms a day because it
 * bisects for each limb's end time, so scanning six months would take over
 * three seconds on a laptop and far worse on the budget Android this app is
 * built for. The first pass therefore derives the limb *indices* arithmetically
 * from the Sun and Moon at sunrise — two ephemeris calls, no bisection — and
 * only the days that survive get the full treatment.
 *
 * Scoring is a weighted sum of traditional preferences, reported factor by
 * factor so a reader can see exactly why a day scored what it did. It ranks
 * times by how well they satisfy the tradition. It does not predict outcomes.
 */
import * as Astro from 'astronomy-engine';
import { siderealLongitudeOf } from '../core/ephemeris.js';
import { ayanamsa } from '../core/ayanamsa.js';
import { norm360 } from '../core/angle.js';
import { ordinal } from '../core/format.js';
import {
  dayDivisions, solarDay, localWeekday,
  YOGA_NAMES, TITHI_NAMES, type DayWindow,
} from '../panchang/panchang.js';
import { NAKSHATRA_SPAN, NAKSHATRA_NAMES_SA, WEEKDAY_NAMES_SA } from '../core/constants.js';
import {
  ACTIVITY_RULES, NAKSHATRA_NATURE, INAUSPICIOUS_YOGAS, RIKTA_TITHIS,
  TARA_NAMES, INAUSPICIOUS_TARAS, FAVOURABLE_CHANDRA_HOUSES,
  type MuhurtaActivity,
} from './activities.js';
import type {
  GeoLocation, Kundali, AyanamsaSystem, NakshatraIndex, RashiIndex,
} from '../core/types.js';

const DAY_MS = 86_400_000;

export interface MuhurtaFactor {
  name: string;
  /** Whether this factor favours the activity. */
  ok: boolean;
  /** Points contributed out of the factor's maximum. */
  points: number;
  maximum: number;
  detail: string;
}

export interface MuhurtaWindow {
  start: Date;
  end: Date;
  /** Name of the choghadiya or muhurta this window is. */
  name: string;
  /** 0-100, combining the day's score with the window's own quality. */
  score: number;
  grade: 'Excellent' | 'Good' | 'Acceptable';
  /** The day this window belongs to, and why that day scored as it did. */
  day: {
    date: string;
    weekday: string;
    tithi: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    score: number;
    factors: MuhurtaFactor[];
  };
}

export interface MuhurtaOptions {
  /** Natal chart, enabling Tara bala and Chandra bala. Strongly recommended. */
  natal?: Kundali;
  ayanamsa?: AyanamsaSystem;
  /** Maximum windows to return. */
  limit?: number;
  /** Minimum day score, 0-100, before a day's windows are considered. */
  minimumDayScore?: number;
}

export interface MuhurtaResult {
  activity: MuhurtaActivity;
  label: string;
  windows: MuhurtaWindow[];
  /** Days examined in the range. */
  daysExamined: number;
  /** Set when the activity carries a standing warning the UI must show. */
  caution?: string;
  summary: string;
}

/** The five limbs at one instant, by index only — no end times, no bisection. */
function limbsAt(date: Date, system: AyanamsaSystem) {
  const time = Astro.MakeTime(date);
  const ayan = ayanamsa(time, system);
  const sun = siderealLongitudeOf('Sun', time, ayan);
  const moon = siderealLongitudeOf('Moon', time, ayan);

  const elongation = norm360(moon - sun);
  const tithiIndex = Math.floor(elongation / 12);           // 0..29
  return {
    sun,
    moon,
    tithiIndex,
    tithiNumber: (tithiIndex % 15) + 1,
    paksha: tithiIndex < 15 ? 'Shukla' : 'Krishna',
    nakshatra: Math.floor(moon / NAKSHATRA_SPAN) as NakshatraIndex,
    yogaIndex: Math.floor(norm360(sun + moon) / NAKSHATRA_SPAN),
    karanaIndex: Math.floor(elongation / 6),                // 0..59
  };
}

/** Score one day against an activity's preferences. */
function scoreDay(
  sunrise: Date,
  location: GeoLocation,
  activity: MuhurtaActivity,
  system: AyanamsaSystem,
  natal?: Kundali,
): { score: number; factors: MuhurtaFactor[]; limbs: ReturnType<typeof limbsAt>; weekday: number } {
  const rule = ACTIVITY_RULES[activity];
  // Traditional practice reads the day's limbs as they stand at sunrise.
  const limbs = limbsAt(sunrise, system);
  const weekday = localWeekday(sunrise, location.timezone);
  const factors: MuhurtaFactor[] = [];

  const nature = NAKSHATRA_NATURE[limbs.nakshatra]!;
  const natureOk = rule.natures.includes(nature);
  factors.push({
    name: 'Nakshatra',
    ok: natureOk,
    points: natureOk ? 25 : 0,
    maximum: 25,
    detail: `${NAKSHATRA_NAMES_SA[limbs.nakshatra]} is a ${nature} nakshatra; this activity `
      + `favours ${rule.natures.join(', ')}.`,
  });

  const weekdayOk = rule.weekdays.includes(weekday);
  factors.push({
    name: 'Weekday',
    ok: weekdayOk,
    points: weekdayOk ? 15 : 0,
    maximum: 15,
    detail: `${WEEKDAY_NAMES_SA[weekday]} is ${weekdayOk ? 'among' : 'not among'} the weekdays `
      + `the tradition favours for this.`,
  });

  const isAmavasya = limbs.tithiIndex === 29;
  const isRikta = RIKTA_TITHIS.includes(limbs.tithiNumber);
  const extraAvoid = rule.extraAvoidTithis?.includes(limbs.tithiNumber) ?? false;
  const tithiOk = !isAmavasya && !isRikta && !extraAvoid;
  const tithiName = limbs.tithiNumber === 15
    ? (limbs.paksha === 'Shukla' ? 'Purnima' : 'Amavasya')
    : TITHI_NAMES[limbs.tithiNumber - 1]!;
  factors.push({
    name: 'Tithi',
    ok: tithiOk,
    points: tithiOk ? 15 : 0,
    maximum: 15,
    detail: `${limbs.paksha} ${tithiName}`
      + (isAmavasya ? ' — Amavasya is avoided for beginnings.'
        : isRikta ? ' — a rikta tithi, which the tradition treats as empty.'
          : ' carries no tithi objection.'),
  });

  const yogaOk = !INAUSPICIOUS_YOGAS.includes(limbs.yogaIndex);
  factors.push({
    name: 'Yoga',
    ok: yogaOk,
    points: yogaOk ? 15 : 0,
    maximum: 15,
    detail: `${YOGA_NAMES[limbs.yogaIndex]} yoga`
      + (yogaOk ? ' is not among the nine avoided.' : ' is one of the nine avoided yogas.'),
  });

  // Vishti (Bhadra) is the seventh of the repeating karanas.
  const isVishti = limbs.karanaIndex >= 1 && limbs.karanaIndex <= 56
    && (limbs.karanaIndex - 1) % 7 === 6;
  factors.push({
    name: 'Karana',
    ok: !isVishti,
    points: isVishti ? 0 : 10,
    maximum: 10,
    detail: isVishti
      ? 'Vishti (Bhadra) karana is running, which is avoided for auspicious work.'
      : 'No Vishti karana objection.',
  });

  if (natal) {
    const natalNakshatra = natal.positions.Moon.nakshatra;
    const taraNumber = (((limbs.nakshatra - natalNakshatra + 27) % 27) % 9) + 1;
    const taraOk = !INAUSPICIOUS_TARAS.includes(taraNumber);
    factors.push({
      name: 'Tara bala',
      ok: taraOk,
      points: taraOk ? 10 : 0,
      maximum: 10,
      detail: `${TARA_NAMES[taraNumber - 1]} tara counted from the natal Moon`
        + (taraOk ? '.' : ', which the tradition treats as obstructive.'),
    });

    const moonSign = Math.floor(limbs.moon / 30) as RashiIndex;
    const houseFromNatalMoon = (((moonSign - natal.positions.Moon.rashi + 12) % 12) + 1);
    const chandraOk = FAVOURABLE_CHANDRA_HOUSES.includes(houseFromNatalMoon);
    factors.push({
      name: 'Chandra bala',
      ok: chandraOk,
      points: chandraOk ? 10 : 0,
      maximum: 10,
      detail: `The Moon is in the ${ordinal(houseFromNatalMoon)} from the natal Moon`
        + (chandraOk ? ', which supports action.' : ', which the tradition does not favour.'),
    });
  }

  const earned = factors.reduce((sum, f) => sum + f.points, 0);
  const possible = factors.reduce((sum, f) => sum + f.maximum, 0);
  return { score: Math.round((earned / possible) * 100), factors, limbs, weekday };
}

/** Choghadiya names the tradition treats as auspicious, in descending order. */
const CHOGHADIYA_QUALITY: Record<string, number> = {
  Amrit: 10, Shubh: 9, Labh: 8, Char: 5, Udveg: 0, Rog: 0, Kaal: 0,
};

/** Remove from `window` any part overlapping one of `blocked`. */
function subtract(window: DayWindow, blocked: (DayWindow | null)[]): DayWindow[] {
  let pieces: DayWindow[] = [window];
  for (const block of blocked) {
    if (!block) continue;
    const next: DayWindow[] = [];
    for (const piece of pieces) {
      const overlapStart = Math.max(piece.start.getTime(), block.start.getTime());
      const overlapEnd = Math.min(piece.end.getTime(), block.end.getTime());
      if (overlapStart >= overlapEnd) { next.push(piece); continue; }
      if (piece.start.getTime() < overlapStart) {
        next.push({ name: piece.name, start: piece.start, end: new Date(overlapStart) });
      }
      if (overlapEnd < piece.end.getTime()) {
        next.push({ name: piece.name, start: new Date(overlapEnd), end: piece.end });
      }
    }
    pieces = next;
  }
  // A sliver is not a usable muhurta.
  return pieces.filter((p) => p.end.getTime() - p.start.getTime() >= 20 * 60_000);
}

/** Find auspicious windows for an activity across a date range. */
export function findMuhurtas(
  activity: MuhurtaActivity,
  from: Date,
  to: Date,
  location: GeoLocation,
  options: MuhurtaOptions = {},
): MuhurtaResult {
  const system = options.ayanamsa ?? 'Lahiri';
  const limit = options.limit ?? 12;
  const minimumDayScore = options.minimumDayScore ?? 60;
  const rule = ACTIVITY_RULES[activity];

  const windows: MuhurtaWindow[] = [];
  let daysExamined = 0;

  const seen = new Set<number>();

  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    // Query at midday so the lookup lands unambiguously inside the day rather
    // than on a sunrise boundary, and so it matches what the panchang would say.
    const { sunrise, sunset } = solarDay(new Date(t + DAY_MS / 2), location);
    if (!sunrise || !sunset) continue;

    // Sunrise drifts against the 24-hour step, so the same day can come up
    // twice near the ends of the range.
    if (seen.has(sunrise.getTime())) continue;
    seen.add(sunrise.getTime());
    daysExamined++;

    const day = scoreDay(sunrise, location, activity, system, options.natal);
    if (day.score < minimumDayScore) continue;

    // Only the divisions are needed, not the limb end times, so this skips four
    // bisections a day.
    const divisions = dayDivisions(sunrise, sunset, null, day.weekday);

    const blocked = [divisions.rahuKaal, divisions.gulikaKaal, divisions.yamaganda];

    const candidates: DayWindow[] = [
      ...divisions.choghadiya.filter((c) => (CHOGHADIYA_QUALITY[c.name] ?? 0) >= 8),
      ...(divisions.abhijitMuhurta ? [divisions.abhijitMuhurta] : []),
    ];

    for (const candidate of candidates) {
      for (const piece of subtract(candidate, blocked)) {
        // Abhijit is the strongest general-purpose muhurta, so it outranks a
        // merely good choghadiya on an equally good day.
        const quality = piece.name === 'Abhijit Muhurta'
          ? 10
          : CHOGHADIYA_QUALITY[piece.name] ?? 0;
        const score = Math.round(day.score * 0.8 + quality * 2);

        windows.push({
          start: piece.start,
          end: piece.end,
          name: piece.name,
          score,
          grade: score >= 85 ? 'Excellent' : score >= 72 ? 'Good' : 'Acceptable',
          day: {
            date: sunrise.toISOString().slice(0, 10),
            weekday: WEEKDAY_NAMES_SA[day.weekday]!,
            tithi: `${day.limbs.paksha} ${day.limbs.tithiNumber}`,
            nakshatra: NAKSHATRA_NAMES_SA[day.limbs.nakshatra]!,
            yoga: YOGA_NAMES[day.limbs.yogaIndex]!,
            karana: String(day.limbs.karanaIndex),
            score: day.score,
            factors: day.factors,
          },
        });
      }
    }
  }

  windows.sort((a, b) => b.score - a.score || a.start.getTime() - b.start.getTime());
  const top = windows.slice(0, limit);

  const summary = top.length === 0
    ? `No window in the range searched met the threshold for ${rule.label.toLowerCase()}. `
      + `Widen the date range, or lower the minimum day score to see the best of a poor set. `
      + `A thin result is information: the tradition does not consider every week suitable.`
    : `${top.length} window${top.length === 1 ? '' : 's'} on `
      + `${new Set(top.map((w) => w.day.date)).size} day`
      + `${new Set(top.map((w) => w.day.date)).size === 1 ? '' : 's'}, out of ${daysExamined} `
      + `examined, for ${rule.label.toLowerCase()}. The best is on ${top[0]!.day.date}, scoring `
      + `${top[0]!.score} `
      + `out of 100. These are ranked by how well each satisfies traditional preferences for `
      + `this activity — the nakshatra's nature, the weekday, the tithi, the yoga, the karana`
      + `${options.natal ? ', and the Moon’s relationship to your own natal Moon' : ''}. `
      + `Muhurta is a statement of what the tradition prefers, not a prediction that things will `
      + `go well.`;

  return {
    activity,
    label: rule.label,
    windows: top,
    daysExamined,
    ...(rule.caution ? { caution: rule.caution } : {}),
    summary,
  };
}
