/**
 * Vimshottari dasha — the 120-year cycle, and by far the most used timing system
 * in Indian practice.
 *
 * The whole system falls out of one fact: the Moon's position within its
 * nakshatra at birth. That fixes both which mahadasha is running and how much of
 * it is left, and every deeper level is proportional subdivision from there.
 *
 * Because it is proportional all the way down, one rule generates all five
 * levels: a sub-period of lord X inside a period of length L runs for
 * L × years(X) / 120.
 */
import { NAKSHATRA_SPAN } from '../core/constants.js';
import type { Graha, Kundali } from '../core/types.js';
import {
  type DashaPeriod, type DashaLevel, type DashaOptions,
  addYears, YEAR_DAYS, MS_PER_DAY,
} from './types.js';

/** Dasha years for each lord. These sum to exactly 120. */
export const VIMSHOTTARI_YEARS: Record<Graha, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

/** The fixed cyclic order of lords. */
export const VIMSHOTTARI_ORDER: readonly Graha[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
] as const;

export const VIMSHOTTARI_TOTAL_YEARS = 120;

/** Where the given lord sits in the cycle. */
function orderIndex(lord: Graha): number {
  const i = VIMSHOTTARI_ORDER.indexOf(lord);
  if (i < 0) throw new Error(`${lord} is not a Vimshottari dasha lord`);
  return i;
}

export interface DashaBalance {
  /** Lord of the mahadasha running at birth. */
  lord: Graha;
  /** Years of that mahadasha still to run at the moment of birth. */
  remainingYears: number;
  /** Years of it already elapsed before birth. */
  elapsedYears: number;
  /** Fraction of the Moon's nakshatra already traversed, in [0,1). */
  nakshatraFraction: number;
}

/**
 * The dasha balance at birth, from the Moon's position within its nakshatra.
 *
 * A nakshatra spans the full period of its lord, so the proportion of the
 * nakshatra still ahead of the Moon is the proportion of the mahadasha still to
 * run.
 */
export function dashaBalance(chart: Kundali): DashaBalance {
  const moon = chart.positions.Moon;
  const lord = moon.nakshatraLord;
  const fraction = moon.degreeInNakshatra / NAKSHATRA_SPAN;
  const total = VIMSHOTTARI_YEARS[lord];
  return {
    lord,
    remainingYears: total * (1 - fraction),
    elapsedYears: total * fraction,
    nakshatraFraction: fraction,
  };
}

/**
 * Mahadashas from birth, covering at least `spanYears`.
 *
 * The first period is truncated to the balance remaining at birth, which is why
 * a chart's first mahadasha is almost never a full one.
 */
export function mahadashas(
  chart: Kundali,
  options: DashaOptions & { spanYears?: number } = {},
): DashaPeriod[] {
  const yearLength = options.yearLength ?? 'Julian365_25';
  const span = options.spanYears ?? VIMSHOTTARI_TOTAL_YEARS;

  const balance = dashaBalance(chart);
  const birth = new Date(chart.utcISO);

  const periods: DashaPeriod[] = [];
  let cursor = birth;
  let index = orderIndex(balance.lord);
  let years = balance.remainingYears;

  let covered = 0;
  while (covered < span) {
    const lord = VIMSHOTTARI_ORDER[index % 9]!;
    const end = addYears(cursor, years, yearLength);
    periods.push({ lord, level: 1, start: cursor, end, years, ancestry: [] });

    covered += years;
    cursor = end;
    index += 1;
    years = VIMSHOTTARI_YEARS[VIMSHOTTARI_ORDER[index % 9]!];
  }

  return periods;
}

/**
 * Subdivide a period into its sub-periods.
 *
 * The sequence always begins with the parent's own lord and then follows the
 * fixed cycle, and each child takes a share of the parent proportional to its
 * own dasha years.
 */
export function subPeriods(parent: DashaPeriod, yearLength: DashaYearLengthArg = 'Julian365_25'): DashaPeriod[] {
  if (parent.level >= 5) return [];

  const parentDays = (parent.end.getTime() - parent.start.getTime()) / MS_PER_DAY;
  const childLevel = (parent.level + 1) as DashaLevel;
  const startIndex = orderIndex(parent.lord);

  const out: DashaPeriod[] = [];
  let cursor = parent.start;

  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIndex + i) % 9]!;
    const share = VIMSHOTTARI_YEARS[lord] / VIMSHOTTARI_TOTAL_YEARS;
    const days = parentDays * share;
    // The last child is closed on the parent's end so that rounding never
    // leaves a gap or an overlap between adjacent periods.
    const end = i === 8
      ? parent.end
      : new Date(cursor.getTime() + days * MS_PER_DAY);

    out.push({
      lord,
      level: childLevel,
      start: cursor,
      end,
      years: (days / YEAR_DAYS[yearLength]),
      ancestry: [...parent.ancestry, parent.lord],
    });
    cursor = end;
  }

  return out;
}

type DashaYearLengthArg = NonNullable<DashaOptions['yearLength']>;

/**
 * The full chain of running dashas at a given moment, outermost first.
 *
 * This is what a reading actually needs — "you are in Jupiter–Saturn–Mercury" —
 * and it is computed by descending the tree rather than materialising 59,049
 * periods.
 */
export function dashaChainAt(
  chart: Kundali,
  date: Date,
  options: DashaOptions = {},
): DashaPeriod[] {
  const yearLength = options.yearLength ?? 'Julian365_25';
  const depth = options.depth ?? 5;

  const birth = new Date(chart.utcISO);
  if (date.getTime() < birth.getTime()) return [];

  let level: DashaPeriod[] = mahadashas(chart, { yearLength, spanYears: 130 });
  const chain: DashaPeriod[] = [];

  for (let d = 1; d <= depth; d++) {
    const current = level.find(
      (p) => date.getTime() >= p.start.getTime() && date.getTime() < p.end.getTime(),
    );
    if (!current) break;
    chain.push(current);
    if (d === depth) break;
    level = subPeriods(current, yearLength);
  }

  return chain;
}

/** Render a chain as the conventional shorthand, e.g. `Jupiter-Saturn-Mercury`. */
export function formatChain(chain: DashaPeriod[]): string {
  return chain.map((p) => p.lord).join('-');
}

/**
 * Build a dasha tree to a given depth.
 *
 * Guarded because depth 5 over a full 120 years is 59,049 periods; callers
 * wanting that should ask for it explicitly and narrow the span.
 */
export function dashaTree(
  chart: Kundali,
  options: DashaOptions & { spanYears?: number } = {},
): { period: DashaPeriod; children: ReturnType<typeof buildChildren> }[] {
  const yearLength = options.yearLength ?? 'Julian365_25';
  const depth = options.depth ?? 2;
  return mahadashas(chart, options).map((period) => ({
    period,
    children: buildChildren(period, depth, yearLength),
  }));
}

function buildChildren(
  parent: DashaPeriod, depth: DashaLevel, yearLength: DashaYearLengthArg,
): { period: DashaPeriod; children: unknown[] }[] {
  if (parent.level >= depth) return [];
  return subPeriods(parent, yearLength).map((period) => ({
    period,
    children: buildChildren(period, depth, yearLength),
  }));
}
