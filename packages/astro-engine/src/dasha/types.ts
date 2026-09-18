/** Shared shapes for every dasha system. */
import type { Graha } from '../core/types.js';

/** 1 = Mahadasha, 2 = Antardasha, 3 = Pratyantardasha, 4 = Sookshma, 5 = Prana. */
export type DashaLevel = 1 | 2 | 3 | 4 | 5;

export const DASHA_LEVEL_NAMES: Record<DashaLevel, string> = {
  1: 'Mahadasha',
  2: 'Antardasha',
  3: 'Pratyantardasha',
  4: 'Sookshma Dasha',
  5: 'Prana Dasha',
};

export interface DashaPeriod {
  lord: Graha;
  level: DashaLevel;
  start: Date;
  end: Date;
  /** Length in years of the system's own year, for display. */
  years: number;
  /** Lords of the enclosing periods, outermost first. */
  ancestry: Graha[];
}

/**
 * How long a "year" is when a dasha system says years.
 *
 * Schools genuinely differ, and the choice shifts period boundaries by months
 * over a lifetime, so it is exposed rather than buried. The default matches the
 * Julian year used by most Indian software, so periods line up with what a user
 * will see elsewhere.
 */
export type DashaYearLength = 'Julian365_25' | 'Gregorian365_2425' | 'Savana360' | 'Sidereal365_2564';

export const YEAR_DAYS: Record<DashaYearLength, number> = {
  Julian365_25: 365.25,
  Gregorian365_2425: 365.2425,
  Savana360: 360,
  Sidereal365_2564: 365.25636,
};

export interface DashaOptions {
  yearLength?: DashaYearLength;
  /** Deepest level to generate. Defaults to 2 (Mahadasha and Antardasha). */
  depth?: DashaLevel;
}

export const MS_PER_DAY = 86_400_000;

/** Add a number of system-years to a date. */
export function addYears(date: Date, years: number, yearLength: DashaYearLength): Date {
  return new Date(date.getTime() + years * YEAR_DAYS[yearLength] * MS_PER_DAY);
}

/** Find the period containing `date`, or null if it lies outside the range. */
export function periodAt(periods: DashaPeriod[], date: Date): DashaPeriod | null {
  const t = date.getTime();
  for (const p of periods) {
    if (t >= p.start.getTime() && t < p.end.getTime()) return p;
  }
  return null;
}
