/**
 * Bhava (house) division.
 *
 * Whole-sign is the default because it is what Brihat Parashara Hora Shastra
 * describes and what North and South Indian practice actually use: the sign
 * holding the lagna *is* the first house, so a graha's house is decided by its
 * sign alone. Cusp-based systems are offered because Sripati practice in North
 * India and KP both need them.
 */
import { norm360 } from '../core/angle.js';
import { RASHI_LORDS } from '../core/constants.js';
import type { Bhava, BhavaNumber, HouseSystem, RashiIndex } from '../core/types.js';

/** House cusps as sidereal longitudes, index 0 = first house. */
function wholeSignCusps(lagna: number): number[] {
  const startSign = Math.floor(norm360(lagna) / 30);
  return Array.from({ length: 12 }, (_, i) => norm360((startSign + i) * 30));
}

function equalCusps(lagna: number): number[] {
  return Array.from({ length: 12 }, (_, i) => norm360(lagna + i * 30));
}

/**
 * Porphyry: each of the two quadrants between the angles is trisected.
 * Sripati uses the same divisions but treats them as bhava-madhya (house
 * centres) rather than boundaries, so its boundaries are the midpoints between
 * consecutive centres.
 */
function porphyryCusps(lagna: number, mc: number): number[] {
  const cusps = new Array<number>(12);
  const ic = norm360(mc + 180);

  const mcToAsc = norm360(lagna - mc);
  const ascToIc = norm360(ic - lagna);

  cusps[0] = norm360(lagna);
  cusps[1] = norm360(lagna + ascToIc / 3);
  cusps[2] = norm360(lagna + (2 * ascToIc) / 3);
  cusps[3] = ic;
  cusps[9] = norm360(mc);
  cusps[10] = norm360(mc + mcToAsc / 3);
  cusps[11] = norm360(mc + (2 * mcToAsc) / 3);

  for (const i of [0, 1, 2, 3, 9, 10, 11]) {
    cusps[(i + 6) % 12] = norm360(cusps[i]! + 180);
  }
  return cusps;
}

function sripatiCusps(lagna: number, mc: number): number[] {
  const madhya = porphyryCusps(lagna, mc);
  return madhya.map((centre, i) => {
    const prev = madhya[(i + 11) % 12]!;
    const halfArc = norm360(centre - prev) / 2;
    return norm360(centre - halfArc);
  });
}

export function buildBhavas(
  lagna: number,
  mc: number,
  system: HouseSystem,
): Bhava[] {
  let cusps: number[];
  switch (system) {
    case 'WholeSign': cusps = wholeSignCusps(lagna); break;
    case 'Equal':     cusps = equalCusps(lagna); break;
    case 'Porphyry':  cusps = porphyryCusps(lagna, mc); break;
    case 'Sripati':   cusps = sripatiCusps(lagna, mc); break;
    default: {
      const never: never = system;
      throw new Error(`Unsupported house system: ${String(never)}`);
    }
  }

  return cusps.map((cusp, i) => {
    const end = cusps[(i + 1) % 12]!;
    // For cusp-based systems the sign of a house is the sign its cusp falls in.
    const rashi = Math.floor(norm360(cusp) / 30) as RashiIndex;
    return {
      number: (i + 1) as BhavaNumber,
      cusp,
      end,
      rashi,
      lord: RASHI_LORDS[rashi]!,
    };
  });
}

/**
 * Which house a longitude falls in.
 *
 * Whole-sign is a pure sign lookup. Cusp systems need an arc containment test,
 * written so that a house wrapping past 0° Mesha is handled correctly.
 */
export function houseOf(
  longitude: number,
  bhavas: Bhava[],
  system: HouseSystem,
): BhavaNumber {
  const lon = norm360(longitude);

  if (system === 'WholeSign') {
    const lagnaRashi = bhavas[0]!.rashi;
    const rashi = Math.floor(lon / 30);
    return (((rashi - lagnaRashi + 12) % 12) + 1) as BhavaNumber;
  }

  for (const bhava of bhavas) {
    const span = norm360(bhava.end - bhava.cusp);
    const offset = norm360(lon - bhava.cusp);
    // A zero-width span would mean degenerate cusps; guard so we never loop out.
    if (span === 0 ? offset === 0 : offset < span) return bhava.number;
  }
  // Unreachable for well-formed cusps, but a chart must never fail to render.
  return 1;
}
