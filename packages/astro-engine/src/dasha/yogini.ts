/**
 * Yogini dasha — a 36-year cycle of eight yoginis.
 *
 * Widely used in North India as a second opinion alongside Vimshottari,
 * especially for short-term timing, because its periods are much shorter.
 */
import { NAKSHATRA_SPAN } from '../core/constants.js';
import type { Graha, Kundali } from '../core/types.js';
import { type DashaPeriod, type DashaOptions, addYears, MS_PER_DAY, YEAR_DAYS } from './types.js';

export interface Yogini {
  name: string;
  lord: Graha;
  years: number;
  /** The quality the yogini is traditionally read for. */
  nature: 'Auspicious' | 'Mixed' | 'Difficult';
}

/** The eight yoginis in order. Their years run 1..8 and sum to 36. */
export const YOGINIS: readonly Yogini[] = [
  { name: 'Mangala',  lord: 'Moon',    years: 1, nature: 'Auspicious' },
  { name: 'Pingala',  lord: 'Sun',     years: 2, nature: 'Difficult'  },
  { name: 'Dhanya',   lord: 'Jupiter', years: 3, nature: 'Auspicious' },
  { name: 'Bhramari', lord: 'Mars',    years: 4, nature: 'Mixed'      },
  { name: 'Bhadrika', lord: 'Mercury', years: 5, nature: 'Auspicious' },
  { name: 'Ulka',     lord: 'Saturn',  years: 6, nature: 'Difficult'  },
  { name: 'Siddha',   lord: 'Venus',   years: 7, nature: 'Auspicious' },
  { name: 'Sankata',  lord: 'Rahu',    years: 8, nature: 'Difficult'  },
] as const;

export const YOGINI_TOTAL_YEARS = 36;

export interface YoginiPeriod extends DashaPeriod {
  yogini: Yogini;
}

/**
 * Which yogini is running at birth.
 *
 * The rule is to add three to the birth nakshatra's number and take the
 * remainder on division by eight, a remainder of zero meaning the eighth.
 */
export function startingYogini(chart: Kundali): { yogini: Yogini; index: number } {
  const nakshatraNumber = chart.positions.Moon.nakshatra + 1;   // 1-based
  const remainder = (nakshatraNumber + 3) % 8;
  const index = (remainder === 0 ? 8 : remainder) - 1;
  return { yogini: YOGINIS[index]!, index };
}

/** Yogini mahadashas from birth, covering at least `spanYears`. */
export function yoginiDashas(
  chart: Kundali,
  options: DashaOptions & { spanYears?: number } = {},
): YoginiPeriod[] {
  const yearLength = options.yearLength ?? 'Julian365_25';
  const span = options.spanYears ?? 108;          // three full cycles

  const { index } = startingYogini(chart);
  const fraction = chart.positions.Moon.degreeInNakshatra / NAKSHATRA_SPAN;

  const periods: YoginiPeriod[] = [];
  let cursor = new Date(chart.utcISO);
  let i = index;
  let years = YOGINIS[index]!.years * (1 - fraction);
  let covered = 0;

  while (covered < span) {
    const yogini = YOGINIS[i % 8]!;
    const end = addYears(cursor, years, yearLength);
    periods.push({
      lord: yogini.lord, level: 1, start: cursor, end, years, ancestry: [], yogini,
    });
    covered += years;
    cursor = end;
    i += 1;
    years = YOGINIS[i % 8]!.years;
  }

  return periods;
}

/** Sub-periods of a yogini dasha, proportioned by yogini years out of 36. */
export function yoginiSubPeriods(
  parent: YoginiPeriod,
  yearLength: NonNullable<DashaOptions['yearLength']> = 'Julian365_25',
): YoginiPeriod[] {
  const parentDays = (parent.end.getTime() - parent.start.getTime()) / MS_PER_DAY;
  const startIndex = YOGINIS.findIndex((y) => y.name === parent.yogini.name);

  const out: YoginiPeriod[] = [];
  let cursor = parent.start;

  for (let i = 0; i < 8; i++) {
    const yogini = YOGINIS[(startIndex + i) % 8]!;
    const days = parentDays * (yogini.years / YOGINI_TOTAL_YEARS);
    const end = i === 7 ? parent.end : new Date(cursor.getTime() + days * MS_PER_DAY);
    out.push({
      lord: yogini.lord,
      level: 2,
      start: cursor,
      end,
      years: days / YEAR_DAYS[yearLength],
      ancestry: [parent.lord],
      yogini,
    });
    cursor = end;
  }
  return out;
}
