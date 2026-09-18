/**
 * Ashtottari dasha — a 108-year cycle of eight lords.
 *
 * Unlike Vimshottari, Ashtottari is conditional: classical texts apply it only
 * when Rahu occupies a kendra or trikona from the lord of the lagna. We compute
 * the periods whenever asked but also report whether that condition holds, so a
 * reading can say honestly whether this system is even applicable rather than
 * presenting it as an alternative of equal standing.
 */
import { NAKSHATRA_SPAN, RASHI_LORDS, KENDRA_HOUSES, TRIKONA_HOUSES } from '../core/constants.js';
import type { Graha, Kundali, NakshatraIndex } from '../core/types.js';
import { type DashaPeriod, type DashaOptions, addYears, MS_PER_DAY, YEAR_DAYS } from './types.js';

/** Dasha years for each lord. These sum to exactly 108. */
export const ASHTOTTARI_YEARS: Record<string, number> = {
  Sun: 6, Moon: 15, Mars: 8, Mercury: 17,
  Saturn: 10, Jupiter: 19, Rahu: 12, Venus: 21,
};

export const ASHTOTTARI_ORDER: readonly Graha[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Saturn', 'Jupiter', 'Rahu', 'Venus',
] as const;

export const ASHTOTTARI_TOTAL_YEARS = 108;

/**
 * Nakshatras belonging to each lord, counted from Ardra.
 *
 * The groups are uneven (3, 4, 3, 4, 3, 4, 3, 3), which is why the balance at
 * birth has to be computed against the span of the whole group rather than
 * against a single nakshatra as in Vimshottari.
 */
const GROUPS: { lord: Graha; nakshatras: NakshatraIndex[] }[] = [
  { lord: 'Sun',     nakshatras: [5, 6, 7] },                 // Ardra, Punarvasu, Pushya
  { lord: 'Moon',    nakshatras: [8, 9, 10, 11] },            // Ashlesha .. U. Phalguni
  { lord: 'Mars',    nakshatras: [12, 13, 14] },              // Hasta, Chitra, Swati
  { lord: 'Mercury', nakshatras: [15, 16, 17, 18] },          // Vishakha .. Mula
  { lord: 'Saturn',  nakshatras: [19, 20, 21] },              // P. Ashadha .. Shravana
  { lord: 'Jupiter', nakshatras: [22, 23, 24, 25] },          // Dhanishta .. U. Bhadrapada
  { lord: 'Rahu',    nakshatras: [26, 0, 1] },                // Revati, Ashwini, Bharani
  { lord: 'Venus',   nakshatras: [2, 3, 4] },                 // Krittika, Rohini, Mrigashira
];

/** Which group a nakshatra belongs to, and where within it. */
function groupOf(nakshatra: NakshatraIndex): { index: number; positionInGroup: number; size: number } {
  for (let i = 0; i < GROUPS.length; i++) {
    const position = GROUPS[i]!.nakshatras.indexOf(nakshatra);
    if (position >= 0) {
      return { index: i, positionInGroup: position, size: GROUPS[i]!.nakshatras.length };
    }
  }
  throw new Error(`nakshatra ${nakshatra} is not in any Ashtottari group`);
}

/**
 * Whether Ashtottari applies to this chart at all: classically, when Rahu is in
 * a kendra or trikona from the lord of the lagna.
 */
export function isApplicable(chart: Kundali): { applicable: boolean; reason: string } {
  const lagnaLord = RASHI_LORDS[chart.lagnaRashi]!;
  const lagnaLordHouse = chart.grahaBhava[lagnaLord];
  const rahuHouse = chart.grahaBhava.Rahu;

  const offset = ((rahuHouse - lagnaLordHouse + 12) % 12) + 1;
  const inKendra = (KENDRA_HOUSES as readonly number[]).includes(offset);
  const inTrikona = (TRIKONA_HOUSES as readonly number[]).includes(offset);
  const applicable = inKendra || inTrikona;

  return {
    applicable,
    reason: applicable
      ? `Rahu is in the ${ordinal(offset)} from ${lagnaLord}, the lagna lord, so Ashtottari applies.`
      : `Rahu is in the ${ordinal(offset)} from ${lagnaLord}, the lagna lord — neither a kendra ` +
        `nor a trikona — so classical authorities do not apply Ashtottari to this chart.`,
  };
}

/** Ashtottari mahadashas from birth. */
export function ashtottariDashas(
  chart: Kundali,
  options: DashaOptions & { spanYears?: number } = {},
): DashaPeriod[] {
  const yearLength = options.yearLength ?? 'Julian365_25';
  const span = options.spanYears ?? ASHTOTTARI_TOTAL_YEARS;

  const moon = chart.positions.Moon;
  const { index, positionInGroup, size } = groupOf(moon.nakshatra);

  // Fraction of the whole group already traversed, not just of one nakshatra.
  const withinNakshatra = moon.degreeInNakshatra / NAKSHATRA_SPAN;
  const fraction = (positionInGroup + withinNakshatra) / size;

  const periods: DashaPeriod[] = [];
  let cursor = new Date(chart.utcISO);
  let i = index;
  let years = ASHTOTTARI_YEARS[ASHTOTTARI_ORDER[index]!]! * (1 - fraction);
  let covered = 0;

  while (covered < span) {
    const lord = ASHTOTTARI_ORDER[i % 8]!;
    const end = addYears(cursor, years, yearLength);
    periods.push({ lord, level: 1, start: cursor, end, years, ancestry: [] });
    covered += years;
    cursor = end;
    i += 1;
    years = ASHTOTTARI_YEARS[ASHTOTTARI_ORDER[i % 8]!]!;
  }

  return periods;
}

/** Sub-periods, proportioned by Ashtottari years out of 108. */
export function ashtottariSubPeriods(
  parent: DashaPeriod,
  yearLength: NonNullable<DashaOptions['yearLength']> = 'Julian365_25',
): DashaPeriod[] {
  const parentDays = (parent.end.getTime() - parent.start.getTime()) / MS_PER_DAY;
  const startIndex = ASHTOTTARI_ORDER.indexOf(parent.lord);
  if (startIndex < 0) throw new Error(`${parent.lord} is not an Ashtottari lord`);

  const out: DashaPeriod[] = [];
  let cursor = parent.start;

  for (let i = 0; i < 8; i++) {
    const lord = ASHTOTTARI_ORDER[(startIndex + i) % 8]!;
    const days = parentDays * (ASHTOTTARI_YEARS[lord]! / ASHTOTTARI_TOTAL_YEARS);
    const end = i === 7 ? parent.end : new Date(cursor.getTime() + days * MS_PER_DAY);
    out.push({
      lord,
      level: (parent.level + 1) as DashaPeriod['level'],
      start: cursor,
      end,
      years: days / YEAR_DAYS[yearLength],
      ancestry: [...parent.ancestry, parent.lord],
    });
    cursor = end;
  }
  return out;
}

/** House offsets only ever run 1..12, so this stays deliberately simple. */
function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}
