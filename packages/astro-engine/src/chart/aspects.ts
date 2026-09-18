/**
 * Drishti (aspect).
 *
 * Jyotish aspects are counted in whole signs, not by degree orbs as in Western
 * astrology, and they are one-directional: Saturn aspects the 3rd and 10th from
 * itself, but nothing aspects Saturn merely by being there.
 *
 * Two independent systems are implemented, because rules cite both:
 *  - Parashari graha drishti, where a graha aspects houses from where it sits;
 *  - Jaimini rashi drishti, where signs aspect signs by movability.
 */
import { GRAHAS, SPECIAL_ASPECTS, RASHI_QUALITIES } from '../core/constants.js';
import type { Graha, RashiIndex, BhavaNumber, Kundali, Quality } from '../core/types.js';

export interface AspectOptions {
  /**
   * Whether Rahu and Ketu cast the 5th, 7th and 9th aspects.
   *
   * This is a widely used later convention, not a Parashari one, and it changes
   * real outcomes — notably which charts register Kaal Sarp and how many yogas
   * fire. Off by default so results stay classical; rules that depend on it say
   * so in their citation.
   */
  nodesAspect?: boolean;
}

/** House offsets a graha aspects, counted inclusively (7 = the opposite sign). */
export function aspectOffsets(graha: Graha, options: AspectOptions = {}): number[] {
  if ((graha === 'Rahu' || graha === 'Ketu')) {
    return options.nodesAspect ? [5, 7, 9] : [7];
  }
  return [7, ...(SPECIAL_ASPECTS[graha] ?? [])].sort((a, b) => a - b);
}

/** The signs a graha aspects, given the sign it occupies. */
export function aspectedRashis(
  graha: Graha, fromRashi: RashiIndex, options: AspectOptions = {},
): RashiIndex[] {
  return aspectOffsets(graha, options)
    .map((offset) => ((fromRashi + offset - 1) % 12) as RashiIndex);
}

/** Does `graha` aspect the given sign? */
export function aspectsRashi(
  graha: Graha, fromRashi: RashiIndex, targetRashi: RashiIndex, options: AspectOptions = {},
): boolean {
  return aspectedRashis(graha, fromRashi, options).includes(targetRashi);
}

/** Every graha aspecting a given house of the chart. */
export function grahasAspectingHouse(
  chart: Kundali, house: BhavaNumber, options: AspectOptions = {},
): Graha[] {
  const targetRashi = ((chart.lagnaRashi + house - 1) % 12) as RashiIndex;
  return GRAHAS.filter((graha) =>
    aspectsRashi(graha, chart.positions[graha].rashi, targetRashi, options));
}

/** Every graha aspecting the sign a given graha occupies. */
export function grahasAspecting(
  chart: Kundali, target: Graha, options: AspectOptions = {},
): Graha[] {
  const targetRashi = chart.positions[target].rashi;
  return GRAHAS.filter((graha) =>
    graha !== target && aspectsRashi(graha, chart.positions[graha].rashi, targetRashi, options));
}

/** Grahas sharing a sign with the given graha (yuti / conjunction). */
export function conjunctGrahas(chart: Kundali, target: Graha): Graha[] {
  const rashi = chart.positions[target].rashi;
  return GRAHAS.filter((g) => g !== target && chart.positions[g].rashi === rashi);
}

/** Grahas occupying a given house. */
export function grahasInHouse(chart: Kundali, house: BhavaNumber): Graha[] {
  return GRAHAS.filter((g) => chart.grahaBhava[g] === house);
}

/**
 * Jaimini rashi drishti — signs aspecting signs, independent of occupancy.
 *
 * Movable signs aspect the fixed signs other than the one immediately after
 * them; fixed signs aspect the movable signs other than the one immediately
 * before them; dual signs aspect the other dual signs.
 */
export function rashiDrishti(from: RashiIndex): RashiIndex[] {
  const quality: Quality = RASHI_QUALITIES[from]!;
  const withQuality = (q: Quality) =>
    ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as RashiIndex[]).filter((i) => RASHI_QUALITIES[i] === q);

  if (quality === 'Chara') {
    const adjacent = ((from + 1) % 12) as RashiIndex;
    return withQuality('Sthira').filter((i) => i !== adjacent);
  }
  if (quality === 'Sthira') {
    const adjacent = ((from + 11) % 12) as RashiIndex;
    return withQuality('Chara').filter((i) => i !== adjacent);
  }
  return withQuality('Dvisvabhava').filter((i) => i !== from);
}

/** Does sign `from` aspect sign `to` under Jaimini rashi drishti? */
export function rashiAspects(from: RashiIndex, to: RashiIndex): boolean {
  return rashiDrishti(from).includes(to);
}

/**
 * Argala — intervention. Grahas in the 2nd, 4th and 11th from a point create
 * argala on it; grahas in the 12th, 10th and 3rd obstruct that argala.
 */
export interface Argala {
  /** Signs that place argala on the reference sign. */
  causing: { offset: number; grahas: Graha[] }[];
  /** Signs that obstruct it (virodha argala). */
  obstructing: { offset: number; grahas: Graha[] }[];
  /** Net argala after obstruction is taken into account. */
  net: number;
}

const ARGALA_OFFSETS = [2, 4, 11];
const VIRODHA_OFFSETS = [12, 10, 3];

export function argalaOn(chart: Kundali, referenceRashi: RashiIndex): Argala {
  const at = (offset: number) => {
    const rashi = ((referenceRashi + offset - 1) % 12) as RashiIndex;
    return { offset, grahas: GRAHAS.filter((g) => chart.positions[g].rashi === rashi) };
  };

  const causing = ARGALA_OFFSETS.map(at).filter((x) => x.grahas.length > 0);
  const obstructing = VIRODHA_OFFSETS.map(at).filter((x) => x.grahas.length > 0);

  // Each argala is cancelled by its own obstructing house when that house holds
  // at least as many grahas: 2nd by 12th, 4th by 10th, 11th by 3rd.
  const pairs: [number, number][] = [[2, 12], [4, 10], [11, 3]];
  let net = 0;
  for (const [argala, virodha] of pairs) {
    const a = causing.find((c) => c.offset === argala)?.grahas.length ?? 0;
    const v = obstructing.find((o) => o.offset === virodha)?.grahas.length ?? 0;
    if (a > v) net += 1;
  }

  return { causing, obstructing, net };
}
