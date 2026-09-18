/**
 * Gochar — transits read against the natal chart.
 *
 * Classical transit judgement counts from the natal Moon, not from the
 * ascendant, and asks only which house a graha is passing through. A house is
 * either favourable for that graha or it is not; the refinement is vedha, where
 * another graha standing in a specific opposing house blocks the good result.
 *
 * The Ashtakavarga overlay is what makes this useful rather than generic:
 * Saturn crossing a sign where it holds five bindus in the person's own chart
 * is read very differently from one where it holds one, and that difference is
 * specific to the individual in a way the house alone is not.
 */
import * as Astro from 'astronomy-engine';
import { grahaPosition } from '../core/ephemeris.js';
import { ayanamsa } from '../core/ayanamsa.js';
import { bhinnashtakavarga } from '../strength/ashtakavarga.js';
import { GRAHAS, GRAHA_NAMES_EN, RASHI_NAMES_SA } from '../core/constants.js';
import { ordinal } from '../core/format.js';
import type { Graha, Kundali, RashiIndex, AyanamsaSystem } from '../core/types.js';

/**
 * Houses from the natal Moon in which each graha's transit is read as
 * favourable. Brihat Parashara Hora Shastra, Gochara Adhyaya.
 */
export const FAVOURABLE_TRANSIT_HOUSES: Record<Graha, number[]> = {
  Sun:     [3, 6, 10, 11],
  Moon:    [1, 3, 6, 7, 10, 11],
  Mars:    [3, 6, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus:   [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn:  [3, 6, 11],
  Rahu:    [3, 6, 11],
  Ketu:    [3, 6, 11],
};

/**
 * Vedha — obstruction. A favourable transit is blocked when another graha
 * occupies the paired house, counted from the same natal Moon.
 *
 * Venus is deliberately absent: its vedha pairs differ materially between
 * sources and there is no way to check a choice here, so its transits are
 * reported without obstruction rather than with a guessed table. The nodes have
 * no vedha in the classical scheme.
 */
export const VEDHA_PAIRS: Partial<Record<Graha, Record<number, number>>> = {
  Sun:     { 3: 9, 6: 12, 10: 4, 11: 5 },
  Moon:    { 1: 5, 3: 9, 6: 12, 7: 2, 10: 4, 11: 8 },
  Mars:    { 3: 12, 6: 9, 11: 5 },
  Mercury: { 2: 5, 4: 3, 6: 9, 8: 1, 10: 7, 11: 12 },
  Jupiter: { 2: 12, 5: 4, 7: 3, 9: 10, 11: 8 },
  Saturn:  { 3: 12, 6: 9, 11: 5 },
};

/** The Sun and Saturn do not obstruct each other, nor do the Moon and Mercury. */
function canObstruct(transiting: Graha, blocker: Graha): boolean {
  if (transiting === blocker) return false;
  const exempt = [['Sun', 'Saturn'], ['Moon', 'Mercury']];
  return !exempt.some(([a, b]) =>
    (transiting === a && blocker === b) || (transiting === b && blocker === a));
}

export interface TransitPosition {
  graha: Graha;
  rashi: RashiIndex;
  rashiName: string;
  longitude: number;
  retrograde: boolean;
  /** House counted from the natal Moon — the classical reference for gochar. */
  houseFromMoon: number;
  /** House counted from the natal ascendant. */
  houseFromLagna: number;
  favourable: boolean;
  /** Set when a favourable transit is blocked, naming the obstructing graha. */
  obstructedBy?: Graha;
  /** Bindus this graha holds in the transited sign, in the person's own chart. */
  bindus: number | null;
  reading: string;
}

/** All nine grahas' transit positions at a moment, read against a natal chart. */
export function transitReport(
  natal: Kundali,
  date: Date,
  system: AyanamsaSystem = 'Lahiri',
): TransitPosition[] {
  const time = Astro.MakeTime(date);
  const ayan = ayanamsa(time, system);

  const positions = GRAHAS.map((graha) => ({
    graha,
    position: grahaPosition(graha, time, ayan, natal.settings.nodeModel),
  }));

  const moonSign = natal.positions.Moon.rashi;
  const houseFrom = (from: RashiIndex, to: RashiIndex) => (((to - from + 12) % 12) + 1);

  // Which houses from the Moon are currently occupied, for the vedha test.
  const occupiedFromMoon = new Map<number, Graha[]>();
  for (const { graha, position } of positions) {
    const house = houseFrom(moonSign, position.rashi);
    occupiedFromMoon.set(house, [...(occupiedFromMoon.get(house) ?? []), graha]);
  }

  return positions.map(({ graha, position }) => {
    const houseFromMoon = houseFrom(moonSign, position.rashi);
    const houseFromLagna = houseFrom(natal.lagnaRashi, position.rashi);
    const favourableHouses = FAVOURABLE_TRANSIT_HOUSES[graha];
    const favourable = favourableHouses.includes(houseFromMoon);

    let obstructedBy: Graha | undefined;
    if (favourable) {
      const vedhaHouse = VEDHA_PAIRS[graha]?.[houseFromMoon];
      if (vedhaHouse !== undefined) {
        const blocker = (occupiedFromMoon.get(vedhaHouse) ?? [])
          .find((g) => canObstruct(graha, g));
        if (blocker) obstructedBy = blocker;
      }
    }

    // Shadow grahas have no Bhinnashtakavarga of their own.
    const bindus = (graha === 'Rahu' || graha === 'Ketu')
      ? null
      : bhinnashtakavarga(natal, graha).bySign[position.rashi]!;

    return {
      graha,
      rashi: position.rashi,
      rashiName: RASHI_NAMES_SA[position.rashi]!,
      longitude: position.longitude,
      retrograde: position.retrograde,
      houseFromMoon,
      houseFromLagna,
      favourable,
      ...(obstructedBy ? { obstructedBy } : {}),
      bindus,
      reading: describeTransit(graha, houseFromMoon, favourable, obstructedBy, bindus),
    };
  });
}

function describeTransit(
  graha: Graha, houseFromMoon: number, favourable: boolean,
  obstructedBy: Graha | undefined, bindus: number | null,
): string {
  const name = GRAHA_NAMES_EN[graha];
  const where = `the ${ordinal(houseFromMoon)} from the natal Moon`;

  const base = favourable
    ? obstructedBy
      ? `${name} is passing through ${where}, which the tradition reads as favourable, but `
        + `${GRAHA_NAMES_EN[obstructedBy]} stands in the obstructing house, which classical texts `
        + `hold to block the result.`
      : `${name} is passing through ${where}, which the tradition reads as favourable.`
    : `${name} is passing through ${where}, which is not among the houses the tradition reads as `
      + `favourable for it.`;

  if (bindus === null) return base;

  const strength = bindus >= 5
    ? `This sign holds ${bindus} of 8 bindus for ${name} in this chart, which is strong support.`
    : bindus <= 2
      ? `This sign holds only ${bindus} of 8 bindus for ${name} in this chart, so the transit has `
        + `little support here.`
      : `This sign holds ${bindus} of 8 bindus for ${name} in this chart, which is middling.`;

  return `${base} ${strength}`;
}

/** Sidereal sign of one graha at a moment. */
export function transitSign(
  graha: Graha, date: Date, system: AyanamsaSystem = 'Lahiri',
): RashiIndex {
  const time = Astro.MakeTime(date);
  return grahaPosition(graha, time, ayanamsa(time, system), 'Mean').rashi;
}
