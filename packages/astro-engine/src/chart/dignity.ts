/**
 * Dignity, relationship and condition of a graha.
 *
 * These are the qualifiers almost every classical rule is phrased in terms of —
 * "if the lord of the 9th is exalted", "if a benefic aspects", "if combust" — so
 * getting them right matters more than any single yoga.
 */
import { norm360, separation } from '../core/angle.js';
import {
  RASHI_LORDS, EXALTATION, MOOLATRIKONA, NATURAL_RELATIONS, COMBUSTION_ORB,
  NATURAL_BENEFICS, GRAHAS, TRUE_GRAHAS, KENDRA_HOUSES, TRIKONA_HOUSES,
  GRAHA_OWNED_RASHIS,
} from '../core/constants.js';
import { isVargottama } from './varga.js';
import type {
  Graha, RashiIndex, Kundali, Benefic, BhavaNumber,
} from '../core/types.js';

/** The five-fold (panchadha) relationship classical strength rules use. */
export type CompoundRelation =
  | 'Adhimitra'   // great friend
  | 'Mitra'       // friend
  | 'Sama'        // neutral
  | 'Shatru'      // enemy
  | 'Adhishatru'; // great enemy

export type Dignity =
  | 'Exalted' | 'Moolatrikona' | 'OwnSign' | 'GreatFriend' | 'Friend'
  | 'Neutral' | 'Enemy' | 'GreatEnemy' | 'Debilitated';

/** Baladi avastha — the "age" of a graha within its sign. */
export type Avastha = 'Bala' | 'Kumara' | 'Yuva' | 'Vriddha' | 'Mrita';

export interface GrahaCondition {
  graha: Graha;
  dignity: Dignity;
  /** True when the graha sits in the sign opposite its exaltation. */
  debilitated: boolean;
  exalted: boolean;
  ownSign: boolean;
  moolatrikona: boolean;
  vargottama: boolean;
  /** How far, in degrees, from the exact degree of deepest exaltation. */
  degreesFromExaltation: number | null;
  combust: boolean;
  /** Elongation from the Sun in degrees. */
  elongation: number;
  retrograde: boolean;
  avastha: Avastha;
  /** Benefic or malefic by nature, after resolving the conditional cases. */
  naturalNature: Benefic;
  /** Benefic or malefic for this particular lagna. */
  functionalNature: Benefic;
  /** True when the graha owns both a kendra and a trikona from the lagna. */
  yogakaraka: boolean;
  /** Houses this graha owns, counted from the lagna. */
  ownedHouses: BhavaNumber[];
  compoundRelationWithDispositor: CompoundRelation;
  /** The lord of the sign this graha occupies. */
  dispositor: Graha;
}

/** Temporal (tatkalika) friendship: grahas in the 2nd, 3rd, 4th, 10th, 11th and
 *  12th signs from a graha are its temporary friends; the rest are enemies. */
const TEMPORAL_FRIEND_OFFSETS = new Set([1, 2, 3, 9, 10, 11]);

export function temporalRelation(fromRashi: RashiIndex, toRashi: RashiIndex): 'F' | 'E' {
  const offset = (toRashi - fromRashi + 12) % 12;
  return TEMPORAL_FRIEND_OFFSETS.has(offset) ? 'F' : 'E';
}

/** Combine natural and temporal relationship into the five-fold relationship. */
export function compoundRelation(natural: 'F' | 'N' | 'E', temporal: 'F' | 'E'): CompoundRelation {
  if (natural === 'F') return temporal === 'F' ? 'Adhimitra' : 'Sama';
  if (natural === 'N') return temporal === 'F' ? 'Mitra' : 'Shatru';
  return temporal === 'F' ? 'Sama' : 'Adhishatru';
}

/** Baladi avastha. Counted forward in odd signs and backward in even ones. */
export function avastha(rashi: RashiIndex, degreeInRashi: number): Avastha {
  const odd = rashi % 2 === 0;
  const effective = odd ? degreeInRashi : 30 - degreeInRashi;
  const stage = Math.min(4, Math.floor(effective / 6));
  return (['Bala', 'Kumara', 'Yuva', 'Vriddha', 'Mrita'] as const)[stage]!;
}

/**
 * Natural benefic or malefic, resolving the two conditional cases classical
 * texts are explicit about:
 *  - the Moon is benefic when waxing and bright, malefic when close to the Sun;
 *  - Mercury takes the nature of whatever it is joined with, and is neutral alone.
 */
export function naturalNature(chart: Kundali, graha: Graha): Benefic {
  if (graha === 'Moon') {
    // Paksha: benefic while the Moon is more than 72 degrees from the Sun
    // (roughly Shukla panchami to Krishna panchami), malefic when nearer.
    const elongation = separation(
      chart.positions.Moon.longitude, chart.positions.Sun.longitude,
    );
    return elongation >= 72 ? 'Benefic' : 'Malefic';
  }

  if (graha === 'Mercury') {
    const mercurySign = chart.positions.Mercury.rashi;
    const companions = GRAHAS.filter(
      (g) => g !== 'Mercury' && chart.positions[g].rashi === mercurySign,
    );
    if (companions.length === 0) return 'Neutral';
    const anyMalefic = companions.some((g) => NATURAL_BENEFICS[g] === 'Malefic');
    const anyBenefic = companions.some((g) => NATURAL_BENEFICS[g] === 'Benefic');
    if (anyMalefic && !anyBenefic) return 'Malefic';
    if (anyBenefic && !anyMalefic) return 'Benefic';
    return 'Neutral';
  }

  return NATURAL_BENEFICS[graha];
}

/**
 * Functional nature, by the Parashari scheme:
 *  - lords of trikonas (1, 5, 9) are benefic;
 *  - lords of 3, 6 and 11 are malefic;
 *  - a natural benefic owning a kendra loses its benefic power
 *    (kendradhipati dosha), while a natural malefic owning one becomes helpful;
 *  - a graha owning both a kendra and a trikona is a yogakaraka.
 */
export function functionalNature(
  lagnaRashi: RashiIndex,
  graha: Graha,
): { nature: Benefic; yogakaraka: boolean; ownedHouses: BhavaNumber[] } {
  const ownedHouses = GRAHA_OWNED_RASHIS[graha]
    .map((sign) => ((((sign - lagnaRashi + 12) % 12) + 1) as BhavaNumber));

  if (ownedHouses.length === 0) {
    // Rahu and Ketu own no sign; classically they act like the lord of the sign
    // they occupy, which callers resolve through the dispositor.
    return { nature: 'Neutral', yogakaraka: false, ownedHouses };
  }

  const ownsKendra = ownedHouses.some((h) => (KENDRA_HOUSES as readonly number[]).includes(h));
  const ownsTrikona = ownedHouses.some((h) => (TRIKONA_HOUSES as readonly number[]).includes(h));

  // A yogakaraka owns a kendra AND a trikona that are genuinely different
  // houses, neither of them the lagna. The lagna is simultaneously a kendra and
  // a trikona, so a naive "owns both" test would wrongly promote every lagna
  // lord — making Mercury a yogakaraka for Mithuna, which no text claims. The
  // strict reading yields exactly the six classical cases: Saturn for Vrishabha
  // and Tula, Mars for Karka and Simha, Venus for Makara and Kumbha.
  const yogakaraka = ownedHouses.some((h) => h === 4 || h === 7 || h === 10)
    && ownedHouses.some((h) => h === 5 || h === 9);

  if (yogakaraka) return { nature: 'Benefic', yogakaraka: true, ownedHouses };
  if (ownedHouses.includes(1)) return { nature: 'Benefic', yogakaraka: false, ownedHouses };
  if (ownsTrikona) return { nature: 'Benefic', yogakaraka: false, ownedHouses };
  if (ownedHouses.some((h) => [3, 6, 11].includes(h))) {
    return { nature: 'Malefic', yogakaraka: false, ownedHouses };
  }
  if (ownedHouses.some((h) => [8, 12].includes(h))) {
    return { nature: 'Malefic', yogakaraka: false, ownedHouses };
  }
  if (ownsKendra) {
    // Kendradhipati dosha inverts the usual expectation.
    const natural = NATURAL_BENEFICS[graha];
    return {
      nature: natural === 'Benefic' ? 'Neutral' : 'Benefic',
      yogakaraka: false,
      ownedHouses,
    };
  }
  return { nature: 'Neutral', yogakaraka: false, ownedHouses };
}

/** Is the graha combust (astangata) — too close to the Sun to act freely? */
export function isCombust(chart: Kundali, graha: Graha): { combust: boolean; elongation: number } {
  const elongation = separation(chart.positions[graha].longitude, chart.positions.Sun.longitude);
  const orb = COMBUSTION_ORB[graha];
  if (!orb) return { combust: false, elongation };
  const limit = chart.positions[graha].retrograde ? orb.retrograde : orb.direct;
  return { combust: elongation < limit, elongation };
}

/** Full condition of one graha. */
export function grahaCondition(chart: Kundali, graha: Graha): GrahaCondition {
  const position = chart.positions[graha];
  const sign = position.rashi;
  const dispositor = RASHI_LORDS[sign]!;

  const exaltationInfo = EXALTATION[graha];
  const exalted = exaltationInfo !== null && exaltationInfo.rashi === sign;
  const debilitated = exaltationInfo !== null && (exaltationInfo.rashi + 6) % 12 === sign;

  const mt = MOOLATRIKONA[graha];
  const inMoolatrikona = mt !== null
    && mt.rashi === sign
    && position.degreeInRashi >= mt.from
    && position.degreeInRashi < mt.to;

  const ownSign = GRAHA_OWNED_RASHIS[graha].includes(sign);

  const natural = graha === dispositor ? 'F' : (NATURAL_RELATIONS[graha][dispositor] ?? 'N');
  const temporal = temporalRelation(chart.positions[dispositor].rashi, sign);
  const compound = compoundRelation(natural, temporal);

  let dignity: Dignity;
  if (exalted) dignity = 'Exalted';
  else if (debilitated) dignity = 'Debilitated';
  else if (inMoolatrikona) dignity = 'Moolatrikona';
  else if (ownSign) dignity = 'OwnSign';
  else if (compound === 'Adhimitra') dignity = 'GreatFriend';
  else if (compound === 'Mitra') dignity = 'Friend';
  else if (compound === 'Sama') dignity = 'Neutral';
  else if (compound === 'Shatru') dignity = 'Enemy';
  else dignity = 'GreatEnemy';

  let degreesFromExaltation: number | null = null;
  if (exaltationInfo) {
    const exactExaltation = exaltationInfo.rashi * 30 + exaltationInfo.degree;
    degreesFromExaltation = separation(position.longitude, exactExaltation);
  }

  const { combust, elongation } = isCombust(chart, graha);
  const functional = functionalNature(chart.lagnaRashi, graha);

  return {
    graha,
    dignity,
    debilitated,
    exalted,
    ownSign,
    moolatrikona: inMoolatrikona,
    vargottama: isVargottama(position.longitude),
    degreesFromExaltation,
    combust,
    elongation,
    retrograde: position.retrograde,
    avastha: avastha(sign, position.degreeInRashi),
    naturalNature: naturalNature(chart, graha),
    functionalNature: functional.nature,
    yogakaraka: functional.yogakaraka,
    ownedHouses: functional.ownedHouses,
    compoundRelationWithDispositor: compound,
    dispositor,
  };
}

/** Condition of every graha in the chart. */
export function allConditions(chart: Kundali): Record<Graha, GrahaCondition> {
  const out = {} as Record<Graha, GrahaCondition>;
  for (const graha of GRAHAS) out[graha] = grahaCondition(chart, graha);
  return out;
}

/** The yogakaraka for a lagna, if that lagna has one. */
export function yogakarakaFor(lagnaRashi: RashiIndex): Graha | null {
  for (const graha of TRUE_GRAHAS) {
    if (functionalNature(lagnaRashi, graha).yogakaraka) return graha;
  }
  return null;
}

/** Exact sidereal longitude of a graha's deepest debilitation, if it has one. */
export function debilitationPoint(graha: Graha): number | null {
  const e = EXALTATION[graha];
  return e === null ? null : norm360((e.rashi + 6) * 30 + e.degree);
}
