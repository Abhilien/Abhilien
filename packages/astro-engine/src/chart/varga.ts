/**
 * Divisional charts (vargas).
 *
 * Every varga is pure arithmetic on a sidereal longitude — no new astronomy is
 * involved. Almost all of them share one shape: a sign is cut into N equal
 * parts, and part k maps to the sign `start + k·step`, where `start` and `step`
 * depend on the parent sign's movability, gender or element. Encoding that
 * shape once, instead of writing sixteen lookup tables, makes the whole family
 * verifiable: the tests assert structural invariants that must hold for any
 * correct varga.
 *
 * Hora (D2) and Trimsamsa (D30) genuinely do not fit the pattern — Hora has only
 * two possible results and Trimsamsa uses unequal spans — so they are written
 * out explicitly.
 */
import { norm360 } from '../core/angle.js';
import { RASHI_QUALITIES, RASHI_ELEMENTS, RASHI_LORDS } from '../core/constants.js';
import type { Graha, RashiIndex, Kundali } from '../core/types.js';

export type VargaCode =
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D7' | 'D9' | 'D10' | 'D12'
  | 'D16' | 'D20' | 'D24' | 'D27' | 'D30' | 'D40' | 'D45' | 'D60';

export interface VargaDefinition {
  code: VargaCode;
  /** Number of divisions per sign. */
  divisions: number;
  sanskrit: string;
  /** What the chart is traditionally read for. */
  signifies: string;
}

export const VARGAS: Record<VargaCode, VargaDefinition> = {
  D1:  { code: 'D1',  divisions: 1,  sanskrit: 'Rashi',            signifies: 'the physical body and life as a whole' },
  D2:  { code: 'D2',  divisions: 2,  sanskrit: 'Hora',             signifies: 'wealth and resources' },
  D3:  { code: 'D3',  divisions: 3,  sanskrit: 'Drekkana',         signifies: 'siblings, courage and initiative' },
  D4:  { code: 'D4',  divisions: 4,  sanskrit: 'Chaturthamsa',     signifies: 'home, land and fixed assets' },
  D7:  { code: 'D7',  divisions: 7,  sanskrit: 'Saptamsa',         signifies: 'children and progeny' },
  D9:  { code: 'D9',  divisions: 9,  sanskrit: 'Navamsa',          signifies: 'marriage, dharma and inner strength' },
  D10: { code: 'D10', divisions: 10, sanskrit: 'Dasamsa',          signifies: 'career, status and action in the world' },
  D12: { code: 'D12', divisions: 12, sanskrit: 'Dwadasamsa',       signifies: 'parents and ancestry' },
  D16: { code: 'D16', divisions: 16, sanskrit: 'Shodasamsa',       signifies: 'vehicles, comforts and pleasures' },
  D20: { code: 'D20', divisions: 20, sanskrit: 'Vimsamsa',         signifies: 'spiritual practice and devotion' },
  D24: { code: 'D24', divisions: 24, sanskrit: 'Chaturvimsamsa',   signifies: 'learning and education' },
  D27: { code: 'D27', divisions: 27, sanskrit: 'Bhamsa',           signifies: 'strengths and weaknesses of constitution' },
  D30: { code: 'D30', divisions: 30, sanskrit: 'Trimsamsa',        signifies: 'misfortune and moral character' },
  D40: { code: 'D40', divisions: 40, sanskrit: 'Khavedamsa',       signifies: 'auspicious and inauspicious effects, maternal line' },
  D45: { code: 'D45', divisions: 45, sanskrit: 'Akshavedamsa',     signifies: 'general conduct, paternal line' },
  D60: { code: 'D60', divisions: 60, sanskrit: 'Shashtiamsa',      signifies: 'accumulated karma; the finest division Parashara gives' },
};

/** Where the first division of `rashi` maps to, and how consecutive parts step. */
function mapping(code: VargaCode, rashi: RashiIndex): { start: number; step: number } {
  const odd = rashi % 2 === 0;                 // Mesha is the 1st sign, hence odd
  const quality = RASHI_QUALITIES[rashi]!;
  const element = RASHI_ELEMENTS[rashi]!;

  switch (code) {
    case 'D1':  return { start: rashi, step: 1 };
    // 1st third stays, 2nd goes to the 5th, 3rd to the 9th.
    case 'D3':  return { start: rashi, step: 4 };
    // Quarters fall on the four kendras from the sign.
    case 'D4':  return { start: rashi, step: 3 };
    case 'D7':  return { start: odd ? rashi : rashi + 6, step: 1 };
    case 'D9':  return {
      start: quality === 'Chara' ? rashi : quality === 'Sthira' ? rashi + 8 : rashi + 4,
      step: 1,
    };
    case 'D10': return { start: odd ? rashi : rashi + 8, step: 1 };
    case 'D12': return { start: rashi, step: 1 };
    case 'D16': return { start: quality === 'Chara' ? 0 : quality === 'Sthira' ? 4 : 8, step: 1 };
    case 'D20': return { start: quality === 'Chara' ? 0 : quality === 'Sthira' ? 8 : 4, step: 1 };
    case 'D24': return { start: odd ? 4 : 3, step: 1 };
    case 'D27': return {
      start: element === 'Fire' ? 0 : element === 'Earth' ? 3 : element === 'Air' ? 6 : 9,
      step: 1,
    };
    case 'D40': return { start: odd ? 0 : 6, step: 1 };
    case 'D45': return { start: quality === 'Chara' ? 0 : quality === 'Sthira' ? 4 : 8, step: 1 };
    case 'D60': return { start: rashi, step: 1 };
    default:
      throw new Error(`${code} does not use the regular varga mapping`);
  }
}

/**
 * Hora (D2). Half-signs alternate between the Sun's hora (Simha) and the Moon's
 * (Karka): odd signs give Simha then Karka, even signs the reverse.
 */
function horaSign(rashi: RashiIndex, degreeInRashi: number): RashiIndex {
  const firstHalf = degreeInRashi < 15;
  const odd = rashi % 2 === 0;
  const sun = 4 as RashiIndex;    // Simha
  const moon = 3 as RashiIndex;   // Karka
  return odd ? (firstHalf ? sun : moon) : (firstHalf ? moon : sun);
}

/**
 * Trimsamsa (D30). The only varga with unequal parts: the five spans belong to
 * Mars, Saturn, Jupiter, Mercury and Venus, and reverse in even signs. The
 * luminaries own no trimsamsa.
 */
const TRIMSAMSA_ODD: { upTo: number; sign: RashiIndex }[] = [
  { upTo: 5,  sign: 0 },   // Mars    - Mesha
  { upTo: 10, sign: 10 },  // Saturn  - Kumbha
  { upTo: 18, sign: 8 },   // Jupiter - Dhanu
  { upTo: 25, sign: 2 },   // Mercury - Mithuna
  { upTo: 30, sign: 6 },   // Venus   - Tula
];

const TRIMSAMSA_EVEN: { upTo: number; sign: RashiIndex }[] = [
  { upTo: 5,  sign: 1 },   // Venus   - Vrishabha
  { upTo: 12, sign: 5 },   // Mercury - Kanya
  { upTo: 20, sign: 11 },  // Jupiter - Meena
  { upTo: 25, sign: 9 },   // Saturn  - Makara
  { upTo: 30, sign: 7 },   // Mars    - Vrischika
];

function trimsamsaSign(rashi: RashiIndex, degreeInRashi: number): RashiIndex {
  const table = rashi % 2 === 0 ? TRIMSAMSA_ODD : TRIMSAMSA_EVEN;
  for (const band of table) {
    if (degreeInRashi < band.upTo) return band.sign;
  }
  return table[table.length - 1]!.sign;
}

/** The sign a sidereal longitude occupies in the given divisional chart. */
export function vargaSign(siderealLongitude: number, code: VargaCode): RashiIndex {
  const lon = norm360(siderealLongitude);
  const rashi = Math.floor(lon / 30) as RashiIndex;
  const degreeInRashi = lon - rashi * 30;

  if (code === 'D2') return horaSign(rashi, degreeInRashi);
  if (code === 'D30') return trimsamsaSign(rashi, degreeInRashi);

  const { divisions } = VARGAS[code];
  const { start, step } = mapping(code, rashi);
  const part = Math.min(divisions - 1, Math.floor((degreeInRashi * divisions) / 30));
  return (((start + part * step) % 12) + 12) % 12 as RashiIndex;
}

export interface VargaChart {
  code: VargaCode;
  definition: VargaDefinition;
  /** Sign of the divisional ascendant. */
  lagnaRashi: RashiIndex;
  /** Sign each graha occupies in this varga. */
  grahaRashi: Record<Graha, RashiIndex>;
  /** House each graha occupies, counted from the divisional lagna. */
  grahaBhava: Record<Graha, number>;
}

/** Build one divisional chart from a rashi chart. */
export function buildVarga(chart: Kundali, code: VargaCode): VargaChart {
  const lagnaRashi = vargaSign(chart.lagna, code);
  const grahaRashi = {} as Record<Graha, RashiIndex>;
  const grahaBhava = {} as Record<Graha, number>;

  for (const [graha, position] of Object.entries(chart.positions) as [Graha, typeof chart.positions[Graha]][]) {
    const sign = vargaSign(position.longitude, code);
    grahaRashi[graha] = sign;
    grahaBhava[graha] = ((sign - lagnaRashi + 12) % 12) + 1;
  }

  return { code, definition: VARGAS[code], lagnaRashi, grahaRashi, grahaBhava };
}

/** All sixteen divisional charts. */
export function buildAllVargas(chart: Kundali): Record<VargaCode, VargaChart> {
  const out = {} as Record<VargaCode, VargaChart>;
  for (const code of Object.keys(VARGAS) as VargaCode[]) {
    out[code] = buildVarga(chart, code);
  }
  return out;
}

/**
 * Vargottama: a graha occupying the same sign in the rashi chart and in navamsa.
 * Classically this makes a graha behave as though exalted regardless of its
 * other dignities, so it is worth flagging on its own.
 */
export function isVargottama(siderealLongitude: number): boolean {
  const lon = norm360(siderealLongitude);
  return Math.floor(lon / 30) === vargaSign(lon, 'D9');
}

/**
 * Vimshopaka bala — a graha's consolidated strength across the sixteen vargas,
 * scored out of 20. A graha scoring well here is holding up under every level of
 * magnification, not merely well placed in the rashi chart.
 *
 * Weights are the Shodashavarga set from Brihat Parashara Hora Shastra.
 */
const VIMSHOPAKA_WEIGHTS: Record<VargaCode, number> = {
  D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5,
  D16: 2, D20: 0.5, D24: 0.5, D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4,
};

/** Fraction of each varga's weight earned, by the dignity held in that varga. */
function vargaDignityFactor(graha: Graha, sign: RashiIndex): number {
  const lord = RASHI_LORDS[sign]!;
  if (lord === graha) return 1;                 // own sign
  const relation = FRIENDLY_FOR_VIMSHOPAKA[graha]?.[lord];
  if (relation === 'F') return 0.75;
  if (relation === 'N') return 0.5;
  return 0.25;
}

// Kept local and simple: Vimshopaka grades on natural relationship only, unlike
// Shadbala which uses the compound (panchadha) relationship.
import { NATURAL_RELATIONS } from '../core/constants.js';
const FRIENDLY_FOR_VIMSHOPAKA = NATURAL_RELATIONS;

export function vimshopakaBala(
  chart: Kundali,
  vargas: Record<VargaCode, VargaChart>,
  graha: Graha,
): number {
  let total = 0;
  for (const [code, weight] of Object.entries(VIMSHOPAKA_WEIGHTS) as [VargaCode, number][]) {
    total += weight * vargaDignityFactor(graha, vargas[code].grahaRashi[graha]);
  }
  return total;
}
