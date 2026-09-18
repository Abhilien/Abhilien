/**
 * Ashtakavarga — the bindu (benefic point) system.
 *
 * Each of the seven physical grahas has a Bhinnashtakavarga: a count, for each
 * of the twelve signs, of how many of eight contributors (the seven grahas plus
 * the lagna) regard that sign favourably. Summing all seven gives the
 * Sarvashtakavarga, the single most used strength map in practical Jyotish.
 *
 * The tables below are fixed classical data. They are also self-checking: the
 * seven Bhinnashtakavarga totals must come to 48, 49, 39, 54, 56, 52 and 39,
 * and the Sarvashtakavarga must total exactly 337. The tests assert all of it,
 * so a mistyped digit anywhere cannot survive.
 */
import { GRAHA_ABBR } from '../core/constants.js';
import type { Graha, Kundali, RashiIndex } from '../core/types.js';

/** The eight contributors: the seven grahas, plus the lagna. */
export type Contributor = Exclude<Graha, 'Rahu' | 'Ketu'> | 'Lagna';

export const CONTRIBUTORS: readonly Contributor[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Lagna',
] as const;

/** Grahas that have a Bhinnashtakavarga of their own. */
export const BAV_SUBJECTS: readonly Exclude<Graha, 'Rahu' | 'Ketu'>[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
] as const;

/**
 * Benefic places.
 *
 * `BENEFIC_PLACES[subject][contributor]` lists the house positions, counted
 * from the contributor, in which the subject receives a bindu.
 */
export const BENEFIC_PLACES: Record<
  Exclude<Graha, 'Rahu' | 'Ketu'>, Record<Contributor, number[]>
> = {
  Sun: {
    Sun:     [1, 2, 4, 7, 8, 9, 10, 11],
    Moon:    [3, 6, 10, 11],
    Mars:    [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus:   [6, 7, 12],
    Saturn:  [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna:   [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun:     [3, 6, 7, 8, 10, 11],
    Moon:    [1, 3, 6, 7, 10, 11],
    Mars:    [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus:   [3, 4, 5, 7, 9, 10, 11],
    Saturn:  [3, 5, 6, 11],
    Lagna:   [3, 6, 10, 11],
  },
  Mars: {
    Sun:     [3, 5, 6, 10, 11],
    Moon:    [3, 6, 11],
    Mars:    [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus:   [6, 8, 11, 12],
    Saturn:  [1, 4, 7, 8, 9, 10, 11],
    Lagna:   [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun:     [5, 6, 9, 11, 12],
    Moon:    [2, 4, 6, 8, 10, 11],
    Mars:    [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus:   [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn:  [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna:   [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun:     [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon:    [2, 5, 7, 9, 11],
    Mars:    [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus:   [2, 5, 6, 9, 10, 11],
    Saturn:  [3, 5, 6, 12],
    Lagna:   [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun:     [8, 11, 12],
    Moon:    [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars:    [3, 4, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus:   [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn:  [3, 4, 5, 8, 9, 10, 11],
    Lagna:   [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun:     [1, 2, 4, 7, 8, 10, 11],
    Moon:    [3, 6, 11],
    Mars:    [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus:   [6, 11, 12],
    Saturn:  [3, 5, 6, 11],
    Lagna:   [1, 3, 4, 6, 10, 11],
  },
};

/** The classical total of each Bhinnashtakavarga, used as a self-check. */
export const BAV_TOTALS: Record<Exclude<Graha, 'Rahu' | 'Ketu'>, number> = {
  Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39,
};

/** The Sarvashtakavarga always totals this across the twelve signs. */
export const SAV_TOTAL = 337;

export interface Bhinnashtakavarga {
  graha: Exclude<Graha, 'Rahu' | 'Ketu'>;
  /** Bindus per sign, indexed by RashiIndex. */
  bySign: number[];
  /** Bindus per house counted from the lagna, index 0 = first house. */
  byHouse: number[];
  total: number;
}

export interface AshtakavargaResult {
  bhinna: Record<Exclude<Graha, 'Rahu' | 'Ketu'>, Bhinnashtakavarga>;
  /** Sarvashtakavarga: the sum of all seven, per sign. */
  sarva: number[];
  sarvaByHouse: number[];
  sarvaTotal: number;
}

/** Sign a contributor occupies; the lagna contributes from its own sign. */
function contributorSign(chart: Kundali, contributor: Contributor): RashiIndex {
  return contributor === 'Lagna' ? chart.lagnaRashi : chart.positions[contributor].rashi;
}

/** Bhinnashtakavarga of one graha. */
export function bhinnashtakavarga(
  chart: Kundali,
  subject: Exclude<Graha, 'Rahu' | 'Ketu'>,
): Bhinnashtakavarga {
  const bySign = new Array<number>(12).fill(0);

  for (const contributor of CONTRIBUTORS) {
    const from = contributorSign(chart, contributor);
    for (const place of BENEFIC_PLACES[subject][contributor]) {
      // `place` is an inclusive house count, so the 1st place is the
      // contributor's own sign.
      bySign[(from + place - 1) % 12]! += 1;
    }
  }

  const byHouse = bySign.map((_, house) => bySign[(chart.lagnaRashi + house) % 12]!);
  return {
    graha: subject,
    bySign,
    byHouse,
    total: bySign.reduce((a, b) => a + b, 0),
  };
}

/** All seven Bhinnashtakavargas plus the Sarvashtakavarga. */
export function ashtakavarga(chart: Kundali): AshtakavargaResult {
  const bhinna = {} as Record<Exclude<Graha, 'Rahu' | 'Ketu'>, Bhinnashtakavarga>;
  const sarva = new Array<number>(12).fill(0);

  for (const graha of BAV_SUBJECTS) {
    const bav = bhinnashtakavarga(chart, graha);
    bhinna[graha] = bav;
    for (let sign = 0; sign < 12; sign++) sarva[sign]! += bav.bySign[sign]!;
  }

  const sarvaByHouse = sarva.map((_, house) => sarva[(chart.lagnaRashi + house) % 12]!);

  return {
    bhinna,
    sarva,
    sarvaByHouse,
    sarvaTotal: sarva.reduce((a, b) => a + b, 0),
  };
}

/**
 * How a Sarvashtakavarga score reads.
 *
 * The average sign holds 337/12, a little over 28 bindus. Classical practice
 * treats signs well above that as supporting whatever they signify and signs
 * well below it as needing effort.
 */
export function savStrength(bindus: number): 'Strong' | 'Above average' | 'Average' | 'Below average' | 'Weak' {
  if (bindus >= 34) return 'Strong';
  if (bindus >= 30) return 'Above average';
  if (bindus >= 26) return 'Average';
  if (bindus >= 22) return 'Below average';
  return 'Weak';
}

/**
 * Transit reading: how many bindus the transiting graha has in the sign it is
 * passing through, in its own Bhinnashtakavarga.
 *
 * This is the everyday use of Ashtakavarga — Saturn crossing a sign where it
 * holds five bindus is read very differently from one where it holds one — and
 * it is the piece a transit or Sade Sati report needs.
 */
export function transitBindus(
  natal: Kundali,
  graha: Exclude<Graha, 'Rahu' | 'Ketu'>,
  transitingSign: RashiIndex,
): { bindus: number; of: 8; reading: string } {
  const bav = bhinnashtakavarga(natal, graha);
  const bindus = bav.bySign[transitingSign]!;
  const reading = bindus >= 5
    ? 'a supportive transit by this measure'
    : bindus <= 2
      ? 'a demanding transit by this measure'
      : 'a mixed transit by this measure';
  return { bindus, of: 8, reading };
}

/** Compact text view of a Bhinnashtakavarga, for debugging and exports. */
export function formatBav(bav: Bhinnashtakavarga): string {
  return `${GRAHA_ABBR[bav.graha]}: ${bav.bySign.join(' ')} = ${bav.total}`;
}
