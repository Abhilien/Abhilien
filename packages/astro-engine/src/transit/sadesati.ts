/**
 * Sade Sati and the other Saturn transits over the natal Moon.
 *
 * This is the single most searched topic in Indian astrology and the one the
 * industry monetises hardest, so two things are built in rather than left to
 * the presentation layer:
 *
 *  - Every period is reported with the plain fact that Sade Sati is universal.
 *    Saturn passes over everyone's Moon on the same 29.5-year cycle, so every
 *    person alive gets two or three of these, and a long enough life gets a
 *    third. It is a phase of a planetary cycle, not a verdict on a person.
 *  - The classical mitigations are reported alongside the period, because they
 *    are part of what the texts say and omitting them is how a transit becomes
 *    something to sell a remedy against.
 *
 * The implementation's one real difficulty is that Saturn does not enter a sign
 * once. It enters, retrogrades back out, and re-enters — the 2017 Dhanu ingress
 * had a 125-day excursion and the 2022 Kumbha ingress a 190-day one. Treating
 * those as separate periods would report three Sade Satis where there is one,
 * so short gaps are merged.
 */
import * as Astro from 'astronomy-engine';
import { siderealLongitudeOf } from '../core/ephemeris.js';
import { ayanamsa } from '../core/ayanamsa.js';
import { RASHI_NAMES_SA } from '../core/constants.js';
import type { Kundali, RashiIndex, AyanamsaSystem } from '../core/types.js';

const DAY_MS = 86_400_000;

/**
 * Saturn's retrograde excursions out of a freshly entered sign last up to about
 * six months, so gaps shorter than this are part of one continuous passage.
 * Sade Sati phases run about two and a half years, so there is no risk of
 * merging genuinely separate periods.
 */
const MERGE_GAP_DAYS = 250;

/** Coarse scan step. Saturn takes ~2.5 years per sign, so ten days is ample. */
const SCAN_STEP_DAYS = 10;

export interface Interval {
  start: Date;
  end: Date;
  /** True when the interval runs up against the edge of the searched range and
   *  is therefore cut short rather than genuinely ending there. */
  truncated?: boolean;
}

/** Saturn's sidereal sign at an instant, computed without the speed overhead. */
function saturnSign(date: Date, system: AyanamsaSystem): RashiIndex {
  const time = Astro.MakeTime(date);
  const longitude = siderealLongitudeOf('Saturn', time, ayanamsa(time, system));
  return Math.floor(longitude / 30) as RashiIndex;
}

/**
 * Intervals in which Saturn occupies any of the given signs.
 *
 * Coarse scan to bracket each transition, then bisection to the day, then a
 * merge pass for retrograde re-entry.
 */
export function findSaturnIntervals(
  signs: RashiIndex[],
  from: Date,
  to: Date,
  system: AyanamsaSystem = 'Lahiri',
  mergeGapDays = MERGE_GAP_DAYS,
): Interval[] {
  const wanted = new Set(signs);
  const inside = (d: Date) => wanted.has(saturnSign(d, system));

  /**
   * Bisect a bracketed transition to the minute.
   *
   * A coarser tolerance is tempting — almanacs publish these to the day — but
   * stopping at a day makes the answer depend on where the ten-day scan grid
   * happened to fall, so the same ingress came out as 18:00, 21:00 or 00:00
   * depending on the search start, and occasionally on the adjacent date. One
   * second costs a handful more iterations and makes the boundary a property of
   * the sky rather than of the caller's arguments.
   *
   * Note the returned instant is UTC. Saturn's 2025 Meena ingress lands at
   * 16:31 UTC on 29 March, which is 22:01 IST the same day — so the Indian date
   * is the 29th, as published tables give it.
   */
  const refine = (before: Date, after: Date): Date => {
    let lo = before.getTime();
    let hi = after.getTime();
    const target = inside(after);
    while (hi - lo > 1_000) {
      const mid = lo + (hi - lo) / 2;
      if (inside(new Date(mid)) === target) hi = mid; else lo = mid;
    }
    return new Date(hi);
  };

  const raw: Interval[] = [];
  let openedAt: Date | null = inside(from) ? from : null;
  let previous = from;

  for (let t = from.getTime() + SCAN_STEP_DAYS * DAY_MS; t <= to.getTime(); t += SCAN_STEP_DAYS * DAY_MS) {
    const now = new Date(t);
    const wasInside = openedAt !== null;
    const isInside = inside(now);

    if (isInside && !wasInside) {
      openedAt = refine(previous, now);
    } else if (!isInside && wasInside) {
      raw.push({ start: openedAt!, end: refine(previous, now) });
      openedAt = null;
    }
    previous = now;
  }
  if (openedAt !== null) raw.push({ start: openedAt, end: to, truncated: true });

  // Merge retrograde excursions.
  const merged: Interval[] = [];
  for (const interval of raw) {
    const last = merged[merged.length - 1];
    if (last && interval.start.getTime() - last.end.getTime() <= mergeGapDays * DAY_MS) {
      last.end = interval.end;
      if (interval.truncated) last.truncated = true;
    } else {
      merged.push({ ...interval });
    }
  }
  // An interval that starts at the very beginning of the range was already in
  // progress, so its start is cut short too.
  const first = merged[0];
  if (first && first.start.getTime() === from.getTime() && inside(from)) first.truncated = true;
  return merged;
}

export type SadeSatiPhase = 'Rising' | 'Peak' | 'Setting';

export interface SadeSatiPhaseSpan {
  phase: SadeSatiPhase;
  sign: RashiIndex;
  signName: string;
  start: Date;
  end: Date;
}

export interface SadeSatiPeriod extends Interval {
  /**
   * The three phases, partitioning the period with no overlap.
   *
   * Each boundary is Saturn's FINAL ingress into the next sign, not its first.
   * Saturn typically enters a sign, retrogrades back out and re-enters months
   * later — it first touched Kumbha in April 2022 but did not settle there
   * until 17 January 2023 — so taking the first ingress would make consecutive
   * phases overlap by most of a year. The final ingress is also the date
   * published almanacs quote.
   */
  phases: SadeSatiPhaseSpan[];
  /**
   * The raw sign occupancies, unmerged, including every retrograde re-entry.
   * Use these when the exact sign on a given day matters; use `phases` to
   * describe the period to a reader.
   */
  segments: SadeSatiPhaseSpan[];
  /** Which phase is running at the reference date, when the period is current. */
  currentPhase: SadeSatiPhase | null;
  /** Approximate length in years. */
  years: number;
}

const PHASE_LABEL: Record<SadeSatiPhase, string> = {
  Rising: 'the 12th from the Moon, read as the phase of expense and unsettled ground',
  Peak: 'over the Moon itself, read as the phase that asks most of the mind',
  Setting: 'the 2nd from the Moon, read as the phase of consolidation and family matters',
};

/** Every Sade Sati between two dates. */
export function sadeSatiPeriods(
  natal: Kundali,
  from: Date,
  to: Date,
  asOf: Date = new Date(),
  system: AyanamsaSystem = 'Lahiri',
): SadeSatiPeriod[] {
  const moon = natal.positions.Moon.rashi;
  const twelfth = ((moon + 11) % 12) as RashiIndex;
  const second = ((moon + 1) % 12) as RashiIndex;

  const spans = findSaturnIntervals([twelfth, moon, second], from, to, system);

  return spans.map((span) => {
    const phaseOf: { phase: SadeSatiPhase; sign: RashiIndex }[] = [
      { phase: 'Rising', sign: twelfth },
      { phase: 'Peak', sign: moon },
      { phase: 'Setting', sign: second },
    ];

    // Raw occupancies: merging is switched off so every retrograde re-entry
    // shows up as its own segment.
    const segments = phaseOf.flatMap(({ phase, sign }) =>
      findSaturnIntervals([sign], span.start, span.end, system, 0).map((i) => ({
        phase, sign, signName: RASHI_NAMES_SA[sign]!, start: i.start, end: i.end,
      })));
    segments.sort((a, b) => a.start.getTime() - b.start.getTime());

    // A phase ends when Saturn leaves its sign for the LAST time.
    //
    // The tempting rule — the final ingress into the next sign — is wrong when
    // Saturn re-enters a sign late in the period. In the 2020s period Saturn
    // entered Meena in March 2025, retrograded out in June 2027 and returned in
    // October 2027; taking that last ingress would date the Setting phase from
    // 2027 and lose two and a half years of it. Last departure is stable
    // against re-entry and lands on the dates almanacs publish.
    const lastDeparture = phaseOf.map(({ phase, sign }) => {
      const own = segments.filter((seg) => seg.sign === sign);
      const last = own[own.length - 1];
      return { phase, sign, leaves: last ? last.end : span.start };
    });

    const phases: SadeSatiPhaseSpan[] = lastDeparture.map((entry, i) => ({
      phase: entry.phase,
      sign: entry.sign,
      signName: RASHI_NAMES_SA[entry.sign]!,
      start: i === 0 ? span.start : lastDeparture[i - 1]!.leaves,
      // The final phase runs to the period's end rather than to Saturn's last
      // departure, so the three phases cover the whole span.
      end: i < lastDeparture.length - 1 ? entry.leaves : span.end,
    }));

    const active = asOf >= span.start && asOf < span.end;
    const current = active
      ? phases.find((p) => asOf >= p.start && asOf < p.end)?.phase ?? null
      : null;

    return {
      ...span,
      phases,
      segments,
      currentPhase: current,
      years: (span.end.getTime() - span.start.getTime()) / (365.25 * DAY_MS),
    };
  });
}

export interface SadeSatiStatus {
  active: boolean;
  phase: SadeSatiPhase | null;
  period: SadeSatiPeriod | null;
  /** The next one, when none is running. */
  next: SadeSatiPeriod | null;
  /** All periods across the span searched. */
  all: SadeSatiPeriod[];
  summary: string;
}

/**
 * Sade Sati status at a date, searched across a plausible lifetime.
 *
 * The summary always states that this is a universal cycle, because the single
 * most useful thing to tell someone frightened by the phrase is that everyone
 * they know has been through it too.
 */
export function sadeSatiStatus(
  natal: Kundali,
  asOf: Date = new Date(),
  lifespanYears = 100,
  system: AyanamsaSystem = 'Lahiri',
): SadeSatiStatus {
  const birth = new Date(natal.utcISO);
  const end = new Date(birth.getTime() + lifespanYears * 365.25 * DAY_MS);
  const all = sadeSatiPeriods(natal, birth, end, asOf, system);

  const current = all.find((p) => asOf >= p.start && asOf < p.end) ?? null;
  const next = all.find((p) => p.start > asOf) ?? null;

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const moonName = RASHI_NAMES_SA[natal.positions.Moon.rashi]!;

  const universal =
    `Saturn takes about twenty-nine and a half years to circle the zodiac, so it passes over `
    + `everyone's natal Moon on the same schedule. This chart has ${all.length} Sade Sati `
    + `periods across a hundred years, which is the ordinary number. It is a phase of a planetary `
    + `cycle that everyone alive shares, not a verdict on a person.`;

  const mitigations =
    `Classical texts qualify the period heavily: it is read as much milder when Saturn is `
    + `dignified in the natal chart, when it holds four or more bindus in the sign it is `
    + `crossing, and when the natal Moon is strong. Texts describe it as a period of work, `
    + `patience and reduced margin rather than of disaster.`;

  const summary = current
    ? `Sade Sati is running, having begun ${iso(current.start)} and ending ${iso(current.end)}. `
      + `Saturn is currently in ${PHASE_LABEL[current.currentPhase ?? 'Peak']}, with the natal Moon `
      + `in ${moonName}. ${mitigations} ${universal}`
    : next
      ? `Sade Sati is not running. The next begins ${iso(next.start)} and ends ${iso(next.end)}. `
        + `${universal}`
      : `Sade Sati is not running, and no further period falls within the span searched. ${universal}`;

  return { active: Boolean(current), phase: current?.currentPhase ?? null, period: current, next, all, summary };
}

export type DhaiyaKind = 'KantakaShani' | 'AshtamaShani';

export interface DhaiyaPeriod extends Interval {
  kind: DhaiyaKind;
  sign: RashiIndex;
  signName: string;
  years: number;
  description: string;
}

/**
 * The two-and-a-half-year Saturn transits often called the "small panoti":
 * Saturn in the 4th from the Moon (Kantaka Shani) and in the 8th (Ashtama
 * Shani).
 */
export function dhaiyaPeriods(
  natal: Kundali,
  from: Date,
  to: Date,
  system: AyanamsaSystem = 'Lahiri',
): DhaiyaPeriod[] {
  const moon = natal.positions.Moon.rashi;
  const config: { kind: DhaiyaKind; sign: RashiIndex; description: string }[] = [
    {
      kind: 'KantakaShani',
      sign: ((moon + 3) % 12) as RashiIndex,
      description: 'Saturn in the 4th from the Moon, read as pressure on home, property and peace of mind.',
    },
    {
      kind: 'AshtamaShani',
      sign: ((moon + 7) % 12) as RashiIndex,
      description: 'Saturn in the 8th from the Moon, read as a period of upheaval and slow change.',
    },
  ];

  return config
    .flatMap(({ kind, sign, description }) =>
      findSaturnIntervals([sign], from, to, system).map((i) => ({
        ...i,
        kind,
        sign,
        signName: RASHI_NAMES_SA[sign]!,
        years: (i.end.getTime() - i.start.getTime()) / (365.25 * DAY_MS),
        description,
      })))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
