/**
 * Ashtakoot Guna Milan — the eight-fold compatibility score out of 36.
 *
 * This is the most commercially important calculation in Indian astrology and
 * the one most often reduced to a single number on a marketing page. Three
 * choices here push against that:
 *
 *  - Every koota returns its reasoning, not just its points, so a couple can see
 *    *why* they scored what they scored.
 *  - Nadi and Bhakoot, the two that most often sink a match, carry their
 *    classical exemptions. A Nadi dosha cancelled by the texts is reported as
 *    cancelled.
 *  - The verdict is phrased as what the tradition says, and states plainly that
 *    the score is one input among many. An app that tells two people not to
 *    marry on the strength of 36 points is not doing astrology, it is doing harm.
 */
import {
  RASHI_VARNA, RASHI_LORDS, NAKSHATRA_GANA, NAKSHATRA_NADI, NAKSHATRA_YONI,
  NATURAL_RELATIONS, NAKSHATRA_NAMES_SA, RASHI_NAMES_SA,
} from '../core/constants.js';
import { ordinal } from '../core/format.js';
import type {
  Kundali, RashiIndex, NakshatraIndex, Varna, Gana, Nadi, Graha,
} from '../core/types.js';

export interface KootaScore {
  name: string;
  nameHi: string;
  /** Points awarded. */
  points: number;
  /** Maximum points this koota can award. */
  maximum: number;
  /** Why this score, in a sentence a couple can read. */
  reason: string;
  /** Classical exemptions that apply, where the koota has any. */
  exemptions?: { description: string; present: boolean }[];
  /** True when the koota scored zero but a classical exemption cancels the fault. */
  faultCancelled?: boolean;
}

export interface MatchProfile {
  nakshatra: NakshatraIndex;
  pada: 1 | 2 | 3 | 4;
  moonRashi: RashiIndex;
}

export function profileOf(chart: Kundali): MatchProfile {
  const moon = chart.positions.Moon;
  return { nakshatra: moon.nakshatra, pada: moon.pada, moonRashi: moon.rashi };
}

// ---------------------------------------------------------------------------
// 1. Varna (1 point)
// ---------------------------------------------------------------------------

const VARNA_RANK: Record<Varna, number> = { Shudra: 1, Vaishya: 2, Kshatriya: 3, Brahmin: 4 };

function varnaKoota(groom: MatchProfile, bride: MatchProfile): KootaScore {
  const g = RASHI_VARNA[groom.moonRashi]!;
  const b = RASHI_VARNA[bride.moonRashi]!;
  const points = VARNA_RANK[g] >= VARNA_RANK[b] ? 1 : 0;
  return {
    name: 'Varna', nameHi: 'वर्ण', points, maximum: 1,
    reason: points
      ? `The groom's varna (${g}) is not below the bride's (${b}).`
      : `The bride's varna (${b}) ranks above the groom's (${g}), which this koota counts against.`,
  };
}

// ---------------------------------------------------------------------------
// 2. Vashya (2 points)
// ---------------------------------------------------------------------------

type VashyaGroup = 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';

/** Vashya group of a Moon sign. Dhanu and Makara split at the halfway point. */
function vashyaGroup(rashi: RashiIndex, degreeInRashi: number): VashyaGroup {
  switch (rashi) {
    case 0: case 1: return 'Chatushpada';                       // Mesha, Vrishabha
    case 2: case 5: case 6: case 10: return 'Manava';            // Mithuna, Kanya, Tula, Kumbha
    case 3: case 11: return 'Jalachara';                         // Karka, Meena
    case 4: return 'Vanachara';                                  // Simha
    case 7: return 'Keeta';                                      // Vrischika
    case 8: return degreeInRashi < 15 ? 'Manava' : 'Chatushpada';// Dhanu
    case 9: return degreeInRashi < 15 ? 'Chatushpada' : 'Jalachara'; // Makara
    default: return 'Manava';
  }
}

const VASHYA_MATRIX: Record<VashyaGroup, Record<VashyaGroup, number>> = {
  Chatushpada: { Chatushpada: 2, Manava: 1, Jalachara: 1, Vanachara: 0, Keeta: 1 },
  Manava:      { Chatushpada: 1, Manava: 2, Jalachara: 0.5, Vanachara: 0, Keeta: 1 },
  Jalachara:   { Chatushpada: 1, Manava: 0.5, Jalachara: 2, Vanachara: 0, Keeta: 1 },
  Vanachara:   { Chatushpada: 0, Manava: 0, Jalachara: 0, Vanachara: 2, Keeta: 1 },
  Keeta:       { Chatushpada: 1, Manava: 1, Jalachara: 1, Vanachara: 1, Keeta: 2 },
};

function vashyaKoota(
  groom: MatchProfile, bride: MatchProfile,
  groomDegree: number, brideDegree: number,
): KootaScore {
  const g = vashyaGroup(groom.moonRashi, groomDegree);
  const b = vashyaGroup(bride.moonRashi, brideDegree);
  return {
    name: 'Vashya', nameHi: 'वश्य',
    points: VASHYA_MATRIX[g][b],
    maximum: 2,
    reason: `The groom's sign is ${g} and the bride's is ${b}. `
      + `Note that published Vashya tables differ between authorities; this uses the `
      + `five-group classification with Dhanu and Makara split at the halfway point.`,
  };
}

// ---------------------------------------------------------------------------
// 3. Tara (3 points)
// ---------------------------------------------------------------------------

/** Remainders 3, 5 and 7 are the inauspicious taras. */
const INAUSPICIOUS_TARA = new Set([3, 5, 7]);

function taraKoota(groom: MatchProfile, bride: MatchProfile): KootaScore {
  const count = (from: NakshatraIndex, to: NakshatraIndex) =>
    (((to - from + 27) % 27) + 1);

  const forward = count(bride.nakshatra, groom.nakshatra) % 9;
  const backward = count(groom.nakshatra, bride.nakshatra) % 9;

  const forwardGood = !INAUSPICIOUS_TARA.has(forward);
  const backwardGood = !INAUSPICIOUS_TARA.has(backward);
  const points = (forwardGood ? 1.5 : 0) + (backwardGood ? 1.5 : 0);

  return {
    name: 'Tara', nameHi: 'तारा', points, maximum: 3,
    reason: `Counting from the bride's ${NAKSHATRA_NAMES_SA[bride.nakshatra]} to the groom's `
      + `${NAKSHATRA_NAMES_SA[groom.nakshatra]} gives tara ${forward || 9} `
      + `(${forwardGood ? 'auspicious' : 'inauspicious'}), and the reverse gives `
      + `${backward || 9} (${backwardGood ? 'auspicious' : 'inauspicious'}).`,
  };
}

// ---------------------------------------------------------------------------
// 4. Yoni (4 points)
// ---------------------------------------------------------------------------

/** The seven classical pairs of natural enemies among the yoni animals. */
const BITTER_ENEMIES: [string, string][] = [
  ['Horse', 'Buffalo'], ['Elephant', 'Lion'], ['Sheep', 'Monkey'],
  ['Serpent', 'Mongoose'], ['Dog', 'Deer'], ['Cat', 'Rat'], ['Cow', 'Tiger'],
];

/** Pairs the texts treat as friendly rather than merely neutral. */
const FRIENDLY_YONIS: [string, string][] = [
  ['Horse', 'Elephant'], ['Cow', 'Buffalo'], ['Sheep', 'Cow'],
  ['Deer', 'Sheep'], ['Monkey', 'Lion'], ['Cat', 'Serpent'],
];

function pairIn(pairs: [string, string][], a: string, b: string): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function yoniKoota(groom: MatchProfile, bride: MatchProfile): KootaScore {
  const g = NAKSHATRA_YONI[groom.nakshatra]!;
  const b = NAKSHATRA_YONI[bride.nakshatra]!;

  let points: number;
  let verdict: string;
  if (g.animal === b.animal) {
    // Same animal of opposite gender is the ideal; the same gender is slightly less so.
    points = g.gender === b.gender ? 3 : 4;
    verdict = g.gender === b.gender ? 'the same yoni and the same gender' : 'the same yoni';
  } else if (pairIn(BITTER_ENEMIES, g.animal, b.animal)) {
    points = 0;
    verdict = 'natural enemies';
  } else if (pairIn(FRIENDLY_YONIS, g.animal, b.animal)) {
    points = 3;
    verdict = 'friendly';
  } else {
    points = 2;
    verdict = 'neutral toward each other';
  }

  return {
    name: 'Yoni', nameHi: 'योनि', points, maximum: 4,
    reason: `The groom's yoni is ${g.animal} (${g.gender.toLowerCase()}) and the bride's is `
      + `${b.animal} (${b.gender.toLowerCase()}); the texts treat these as ${verdict}.`,
  };
}

// ---------------------------------------------------------------------------
// 5. Graha Maitri (5 points)
// ---------------------------------------------------------------------------

function grahaMaitriKoota(groom: MatchProfile, bride: MatchProfile): KootaScore {
  const g: Graha = RASHI_LORDS[groom.moonRashi]!;
  const b: Graha = RASHI_LORDS[bride.moonRashi]!;

  if (g === b) {
    return {
      name: 'Graha Maitri', nameHi: 'ग्रह मैत्री', points: 5, maximum: 5,
      reason: `Both Moon signs are ruled by the same graha, ${g}.`,
    };
  }

  const gToB = NATURAL_RELATIONS[g][b] ?? 'N';
  const bToG = NATURAL_RELATIONS[b][g] ?? 'N';
  const key = [gToB, bToG].sort().join('');

  // Friend/Friend 5, Friend/Neutral 4, Neutral/Neutral 3, Neutral/Enemy 1,
  // Friend/Enemy 0.5, Enemy/Enemy 0.
  const table: Record<string, number> = {
    FF: 5, FN: 4, NN: 3, EN: 1, EF: 0.5, EE: 0,
  };
  const points = table[key] ?? 3;

  const describe = (r: string) => (r === 'F' ? 'friendly' : r === 'E' ? 'inimical' : 'neutral');
  return {
    name: 'Graha Maitri', nameHi: 'ग्रह मैत्री', points, maximum: 5,
    reason: `The lords are ${g} and ${b}: ${g} is ${describe(gToB)} to ${b}, and ${b} is `
      + `${describe(bToG)} to ${g}.`,
  };
}

// ---------------------------------------------------------------------------
// 6. Gana (6 points)
// ---------------------------------------------------------------------------

/** Rows are the groom's gana, columns the bride's. The table is asymmetric. */
const GANA_MATRIX: Record<Gana, Record<Gana, number>> = {
  Deva:     { Deva: 6, Manushya: 6, Rakshasa: 0 },
  Manushya: { Deva: 5, Manushya: 6, Rakshasa: 0 },
  Rakshasa: { Deva: 1, Manushya: 0, Rakshasa: 6 },
};

function ganaKoota(groom: MatchProfile, bride: MatchProfile): KootaScore {
  const g = NAKSHATRA_GANA[groom.nakshatra]!;
  const b = NAKSHATRA_GANA[bride.nakshatra]!;
  return {
    name: 'Gana', nameHi: 'गण', points: GANA_MATRIX[g][b], maximum: 6,
    reason: `The groom's gana is ${g} and the bride's is ${b}.`,
  };
}

// ---------------------------------------------------------------------------
// 7. Bhakoot (7 points)
// ---------------------------------------------------------------------------

function bhakootKoota(groom: MatchProfile, bride: MatchProfile): KootaScore {
  const forward = ((groom.moonRashi - bride.moonRashi + 12) % 12) + 1;
  const backward = ((bride.moonRashi - groom.moonRashi + 12) % 12) + 1;
  const pair = [forward, backward].sort((a, b) => a - b).join('/');

  const faulty = ['2/12', '5/9', '6/8'].includes(pair);
  // Classical exemptions: the fault is held void when the Moon-sign lords are the
  // same graha, or are mutual friends.
  const groomLord = RASHI_LORDS[groom.moonRashi]!;
  const brideLord = RASHI_LORDS[bride.moonRashi]!;
  const sameLord = groomLord === brideLord;
  const mutualFriends = NATURAL_RELATIONS[groomLord][brideLord] === 'F'
    && NATURAL_RELATIONS[brideLord][groomLord] === 'F';

  const exemptions = [
    { description: 'Both Moon signs share the same lord.', present: sameLord },
    { description: 'The lords of the two Moon signs are mutual friends.', present: mutualFriends },
  ];
  const cancelled = faulty && exemptions.some((e) => e.present);

  return {
    name: 'Bhakoot', nameHi: 'भकूट',
    points: faulty ? 0 : 7,
    maximum: 7,
    reason: faulty
      ? `The Moon signs stand in a ${pair} relationship, which this koota counts as a fault.`
      : `The Moon signs stand in a ${pair} relationship, which carries no fault.`,
    exemptions,
    faultCancelled: cancelled,
  };
}

// ---------------------------------------------------------------------------
// 8. Nadi (8 points)
// ---------------------------------------------------------------------------

function nadiKoota(groom: MatchProfile, bride: MatchProfile): KootaScore {
  const g: Nadi = NAKSHATRA_NADI[groom.nakshatra]!;
  const b: Nadi = NAKSHATRA_NADI[bride.nakshatra]!;
  const same = g === b;

  // The classical exemptions to Nadi dosha. These matter: Nadi is worth eight of
  // the thirty-six points, so an uncancelled fault alone can sink a match.
  const sameNakshatraDifferentPada = groom.nakshatra === bride.nakshatra
    && groom.pada !== bride.pada;
  const sameSignDifferentNakshatra = groom.moonRashi === bride.moonRashi
    && groom.nakshatra !== bride.nakshatra;
  const sameNakshatraDifferentSign = groom.nakshatra === bride.nakshatra
    && groom.moonRashi !== bride.moonRashi;

  const exemptions = [
    { description: 'Both share a nakshatra but occupy different padas.', present: sameNakshatraDifferentPada },
    { description: 'Both share a Moon sign but occupy different nakshatras.', present: sameSignDifferentNakshatra },
    { description: 'Both share a nakshatra but occupy different Moon signs.', present: sameNakshatraDifferentSign },
  ];
  const cancelled = same && exemptions.some((e) => e.present);

  return {
    name: 'Nadi', nameHi: 'नाड़ी',
    points: same ? 0 : 8,
    maximum: 8,
    reason: same
      ? `Both have ${g} nadi, which the texts count as a fault.`
      : `The groom's nadi is ${g} and the bride's is ${b}, which carries no fault.`,
    exemptions,
    faultCancelled: cancelled,
  };
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export interface GunaMilanResult {
  kootas: KootaScore[];
  total: number;
  maximum: 36;
  /** Faults that scored zero but whose classical exemption applies. */
  cancelledFaults: string[];
  /** Traditional reading of the band the score falls in. */
  band: 'NotRecommended' | 'Acceptable' | 'Good' | 'Excellent';
  verdict: string;
  groom: MatchProfile;
  bride: MatchProfile;
}

export function gunaMilan(groomChart: Kundali, brideChart: Kundali): GunaMilanResult {
  const groom = profileOf(groomChart);
  const bride = profileOf(brideChart);
  const groomDegree = groomChart.positions.Moon.degreeInRashi;
  const brideDegree = brideChart.positions.Moon.degreeInRashi;

  const kootas = [
    varnaKoota(groom, bride),
    vashyaKoota(groom, bride, groomDegree, brideDegree),
    taraKoota(groom, bride),
    yoniKoota(groom, bride),
    grahaMaitriKoota(groom, bride),
    ganaKoota(groom, bride),
    bhakootKoota(groom, bride),
    nadiKoota(groom, bride),
  ];

  const total = kootas.reduce((s, k) => s + k.points, 0);
  const cancelledFaults = kootas.filter((k) => k.faultCancelled).map((k) => k.name);

  const band: GunaMilanResult['band'] =
    total >= 32 ? 'Excellent' : total >= 24 ? 'Good' : total >= 18 ? 'Acceptable' : 'NotRecommended';

  const bandText: Record<GunaMilanResult['band'], string> = {
    Excellent: 'The tradition regards this as a very strong match on the Ashtakoot count.',
    Good: 'The tradition regards this as a good match on the Ashtakoot count.',
    Acceptable: 'The tradition regards eighteen or more as acceptable, and this clears that.',
    NotRecommended: 'This falls below the eighteen points the tradition treats as the usual threshold.',
  };

  const cancellationNote = cancelledFaults.length
    ? ` Note that the ${cancelledFaults.join(' and ')} fault${cancelledFaults.length > 1 ? 's are' : ' is'} `
      + `cancelled by a classical exemption, which practitioners weigh heavily.`
    : '';

  return {
    kootas,
    total,
    maximum: 36,
    cancelledFaults,
    band,
    verdict: `${total} of 36 points. ${bandText[band]}${cancellationNote} `
      + `Ashtakoot examines the Moon's nakshatra alone; it says nothing about the longevity, `
      + `temperament or wealth indications that a full comparison of the two charts would cover, `
      + `and the tradition itself treats it as one input among several rather than a decision.`,
    groom,
    bride,
  };
}

/** Descriptive summary of one person's matching profile. */
export function describeProfile(profile: MatchProfile): string {
  return `${NAKSHATRA_NAMES_SA[profile.nakshatra]} pada ${profile.pada}, `
    + `Moon in ${RASHI_NAMES_SA[profile.moonRashi]} `
    + `(${NAKSHATRA_GANA[profile.nakshatra]} gana, ${NAKSHATRA_NADI[profile.nakshatra]} nadi, `
    + `${NAKSHATRA_YONI[profile.nakshatra]!.animal} yoni, ${RASHI_VARNA[profile.moonRashi]} varna)`;
}

export { ordinal as _ordinal };
