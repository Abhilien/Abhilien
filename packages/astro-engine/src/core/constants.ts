/**
 * Classical reference tables.
 *
 * Every table here is a fixed datum of the tradition, not a tuning parameter.
 * Where traditions genuinely disagree the divergence is handled in the rule
 * engine with an explicit citation, never by silently picking one here.
 */
import type {
  Graha, RashiIndex, NakshatraIndex, Element, Quality, Gender,
  Gana, Nadi, Varna, Benefic,
} from './types.js';

export const GRAHAS: readonly Graha[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu',
] as const;

/** The seven physical grahas, in the classical weekday/hora order's source set.
 *  Rahu and Ketu are shadow points: they have no Shadbala, cast no rulership in
 *  the classical scheme, and are excluded wherever a rule says "planet". */
export const TRUE_GRAHAS: readonly Graha[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
] as const;

export const SHADOW_GRAHAS: readonly Graha[] = ['Rahu', 'Ketu'] as const;

// ---------------------------------------------------------------------------
// Rashis
// ---------------------------------------------------------------------------

export const RASHI_NAMES_SA: readonly string[] = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const;

export const RASHI_NAMES_EN: readonly string[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const RASHI_NAMES_HI: readonly string[] = [
  'मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या',
  'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन',
] as const;

/** Sign lords, Mesha..Meena. */
export const RASHI_LORDS: readonly Graha[] = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
] as const;

export const RASHI_ELEMENTS: readonly Element[] = [
  'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth',
  'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water',
] as const;

export const RASHI_QUALITIES: readonly Quality[] = [
  'Chara', 'Sthira', 'Dvisvabhava', 'Chara', 'Sthira', 'Dvisvabhava',
  'Chara', 'Sthira', 'Dvisvabhava', 'Chara', 'Sthira', 'Dvisvabhava',
] as const;

/** Odd signs are male/cruel, even are female/mild. */
export const RASHI_GENDERS: readonly Gender[] = [
  'Male', 'Female', 'Male', 'Female', 'Male', 'Female',
  'Male', 'Female', 'Male', 'Female', 'Male', 'Female',
] as const;

/** Varna of the sign, used by the Varna koota in matchmaking. */
export const RASHI_VARNA: readonly Varna[] = [
  'Kshatriya', 'Vaishya', 'Shudra', 'Brahmin', 'Kshatriya', 'Vaishya',
  'Shudra', 'Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Brahmin',
] as const;

/** Signs whose rising is measured head-first, back-first or both. Used for
 *  Prashna and some Muhurta rules. */
export const RASHI_RISING: readonly ('Sirshodaya' | 'Prishtodaya' | 'Ubhayodaya')[] = [
  'Prishtodaya', 'Prishtodaya', 'Sirshodaya', 'Prishtodaya', 'Sirshodaya', 'Sirshodaya',
  'Sirshodaya', 'Sirshodaya', 'Prishtodaya', 'Prishtodaya', 'Sirshodaya', 'Ubhayodaya',
] as const;

// ---------------------------------------------------------------------------
// Nakshatras
// ---------------------------------------------------------------------------

/** Exact span of one nakshatra: 360/27. */
export const NAKSHATRA_SPAN = 360 / 27;          // 13.333... degrees
/** Exact span of one pada: 360/108. */
export const PADA_SPAN = 360 / 108;              // 3.333... degrees

export const NAKSHATRA_NAMES_SA: readonly string[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

export const NAKSHATRA_NAMES_HI: readonly string[] = [
  'अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा',
  'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी',
  'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा',
  'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा',
  'शतभिषा', 'पूर्व भाद्रपद', 'उत्तर भाद्रपद', 'रेवती',
] as const;

/** Vimshottari dasha lord of each nakshatra. The nine lords repeat three times. */
export const NAKSHATRA_LORDS: readonly Graha[] = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
] as const;

export const NAKSHATRA_GANA: readonly Gana[] = [
  'Deva', 'Manushya', 'Rakshasa', 'Manushya', 'Deva', 'Manushya',
  'Deva', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya',
  'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa',
  'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa',
  'Rakshasa', 'Manushya', 'Manushya', 'Deva',
] as const;

/** Nadi follows the 1-2-3 / 3-2-1 / 1-2-3 serpentine over each group of nine. */
export const NAKSHATRA_NADI: readonly Nadi[] = [
  'Adi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi', 'Adi', 'Madhya', 'Antya',
  'Antya', 'Madhya', 'Adi', 'Adi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi',
  'Adi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi', 'Adi', 'Madhya', 'Antya',
] as const;

/** Yoni animal of each nakshatra, with its gender, for the Yoni koota. */
export const NAKSHATRA_YONI: readonly { animal: string; gender: 'Male' | 'Female' }[] = [
  { animal: 'Horse',    gender: 'Male'   }, // Ashwini
  { animal: 'Elephant', gender: 'Male'   }, // Bharani
  { animal: 'Sheep',    gender: 'Female' }, // Krittika
  { animal: 'Serpent',  gender: 'Male'   }, // Rohini
  { animal: 'Serpent',  gender: 'Female' }, // Mrigashira
  { animal: 'Dog',      gender: 'Female' }, // Ardra
  { animal: 'Cat',      gender: 'Female' }, // Punarvasu
  { animal: 'Sheep',    gender: 'Male'   }, // Pushya
  { animal: 'Cat',      gender: 'Male'   }, // Ashlesha
  { animal: 'Rat',      gender: 'Male'   }, // Magha
  { animal: 'Rat',      gender: 'Female' }, // Purva Phalguni
  { animal: 'Cow',      gender: 'Male'   }, // Uttara Phalguni
  { animal: 'Buffalo',  gender: 'Female' }, // Hasta
  { animal: 'Tiger',    gender: 'Female' }, // Chitra
  { animal: 'Buffalo',  gender: 'Male'   }, // Swati
  { animal: 'Tiger',    gender: 'Male'   }, // Vishakha
  { animal: 'Deer',     gender: 'Female' }, // Anuradha
  { animal: 'Deer',     gender: 'Male'   }, // Jyeshtha
  { animal: 'Dog',      gender: 'Male'   }, // Mula
  { animal: 'Monkey',   gender: 'Male'   }, // Purva Ashadha
  { animal: 'Mongoose', gender: 'Male'   }, // Uttara Ashadha
  { animal: 'Monkey',   gender: 'Female' }, // Shravana
  { animal: 'Lion',     gender: 'Female' }, // Dhanishta
  { animal: 'Horse',    gender: 'Female' }, // Shatabhisha
  { animal: 'Lion',     gender: 'Male'   }, // Purva Bhadrapada
  { animal: 'Cow',      gender: 'Female' }, // Uttara Bhadrapada
  { animal: 'Elephant', gender: 'Female' }, // Revati
] as const;

export const NAKSHATRA_DEITIES: readonly string[] = [
  'Ashwini Kumaras', 'Yama', 'Agni', 'Brahma', 'Soma', 'Rudra',
  'Aditi', 'Brihaspati', 'Sarpas', 'Pitris', 'Bhaga', 'Aryaman',
  'Savitr', 'Tvashtr', 'Vayu', 'Indra-Agni', 'Mitra', 'Indra',
  'Nirriti', 'Apas', 'Vishvedevas', 'Vishnu', 'Vasus',
  'Varuna', 'Aja Ekapada', 'Ahir Budhnya', 'Pushan',
] as const;

// ---------------------------------------------------------------------------
// Graha attributes
// ---------------------------------------------------------------------------

export const GRAHA_NAMES_SA: Record<Graha, string> = {
  Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangala', Mercury: 'Budha',
  Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu',
};

export const GRAHA_NAMES_HI: Record<Graha, string> = {
  Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध',
  Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
};

/** Two-letter abbreviations used inside chart diagrams. */
export const GRAHA_ABBR: Record<Graha, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

/** Natural benefic / malefic status. The Moon and Mercury are conditional — a
 *  waning Moon and a Mercury joined to a malefic turn malefic — so those are
 *  resolved per-chart in `dignity.ts`, not read from here. */
export const NATURAL_BENEFICS: Record<Graha, Benefic> = {
  Sun: 'Malefic',
  Moon: 'Benefic',      // conditional on paksha; see dignity.ts
  Mars: 'Malefic',
  Mercury: 'Neutral',   // conditional on association; see dignity.ts
  Jupiter: 'Benefic',
  Venus: 'Benefic',
  Saturn: 'Malefic',
  Rahu: 'Malefic',
  Ketu: 'Malefic',
};

/** Signs owned by each graha. Rahu and Ketu own none in the classical scheme. */
export const GRAHA_OWNED_RASHIS: Record<Graha, RashiIndex[]> = {
  Sun: [4],
  Moon: [3],
  Mars: [0, 7],
  Mercury: [2, 5],
  Jupiter: [8, 11],
  Venus: [1, 6],
  Saturn: [9, 10],
  Rahu: [],
  Ketu: [],
};

/** Exaltation (uccha) sign and the exact degree of deepest exaltation.
 *  Debilitation (neecha) is the opposite sign at the same degree. */
export const EXALTATION: Record<Graha, { rashi: RashiIndex; degree: number } | null> = {
  Sun:     { rashi: 0,  degree: 10 },  // Mesha 10°
  Moon:    { rashi: 1,  degree: 3  },  // Vrishabha 3°
  Mars:    { rashi: 9,  degree: 28 },  // Makara 28°
  Mercury: { rashi: 5,  degree: 15 },  // Kanya 15°
  Jupiter: { rashi: 3,  degree: 5  },  // Karka 5°
  Venus:   { rashi: 11, degree: 27 },  // Meena 27°
  Saturn:  { rashi: 6,  degree: 20 },  // Tula 20°
  // The nodes have no universally agreed exaltation. Brihat Parashara Hora
  // Shastra is silent; later works differ (Vrishabha/Vrischika vs Mithuna/Dhanu).
  // We therefore assign none rather than encode a disputed value.
  Rahu: null,
  Ketu: null,
};

/** Moolatrikona sign and the degree range within it. */
export const MOOLATRIKONA: Record<Graha, { rashi: RashiIndex; from: number; to: number } | null> = {
  Sun:     { rashi: 4,  from: 0,  to: 20 },  // Simha 0-20°
  Moon:    { rashi: 1,  from: 4,  to: 30 },  // Vrishabha 4-30°
  Mars:    { rashi: 0,  from: 0,  to: 12 },  // Mesha 0-12°
  Mercury: { rashi: 5,  from: 16, to: 20 },  // Kanya 16-20°
  Jupiter: { rashi: 8,  from: 0,  to: 10 },  // Dhanu 0-10°
  Venus:   { rashi: 6,  from: 0,  to: 15 },  // Tula 0-15°
  Saturn:  { rashi: 10, from: 0,  to: 20 },  // Kumbha 0-20°
  Rahu: null,
  Ketu: null,
};

/** Naisargika (permanent) friendship, from Brihat Parashara Hora Shastra.
 *  `F` friend, `N` neutral, `E` enemy. Nodes follow the commonly used
 *  post-Parashara convention and are flagged as such in `dignity.ts`. */
export const NATURAL_RELATIONS: Record<Graha, Partial<Record<Graha, 'F' | 'N' | 'E'>>> = {
  Sun:     { Moon:'F', Mars:'F', Mercury:'N', Jupiter:'F', Venus:'E', Saturn:'E', Rahu:'E', Ketu:'E' },
  Moon:    { Sun:'F', Mars:'N', Mercury:'F', Jupiter:'N', Venus:'N', Saturn:'N', Rahu:'E', Ketu:'E' },
  Mars:    { Sun:'F', Moon:'F', Mercury:'E', Jupiter:'F', Venus:'N', Saturn:'N', Rahu:'E', Ketu:'F' },
  Mercury: { Sun:'F', Moon:'E', Mars:'N', Jupiter:'N', Venus:'F', Saturn:'N', Rahu:'F', Ketu:'N' },
  Jupiter: { Sun:'F', Moon:'F', Mars:'F', Mercury:'E', Venus:'E', Saturn:'N', Rahu:'E', Ketu:'F' },
  Venus:   { Sun:'E', Moon:'E', Mars:'N', Mercury:'F', Jupiter:'N', Saturn:'F', Rahu:'F', Ketu:'N' },
  Saturn:  { Sun:'E', Moon:'E', Mars:'E', Mercury:'F', Jupiter:'N', Venus:'F', Rahu:'F', Ketu:'N' },
  Rahu:    { Sun:'E', Moon:'E', Mars:'E', Mercury:'F', Jupiter:'N', Venus:'F', Saturn:'F', Ketu:'N' },
  Ketu:    { Sun:'E', Moon:'E', Mars:'F', Mercury:'N', Jupiter:'F', Venus:'N', Saturn:'N', Rahu:'N' },
};

/** Naisargika bala order (Shadbala): brightest to dimmest, in Virupas. */
export const NAISARGIKA_BALA: Record<Graha, number> = {
  Sun: 60.0, Moon: 51.43, Venus: 42.85, Jupiter: 34.28,
  Mercury: 25.70, Mars: 17.14, Saturn: 8.57, Rahu: 0, Ketu: 0,
};

/** Special (non-reciprocal) aspects in whole-sign house counts, beyond the
 *  7th house aspect that every graha casts. */
export const SPECIAL_ASPECTS: Partial<Record<Graha, number[]>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
  // Rahu and Ketu casting 5/7/9 is a widely used later convention, not Parashari.
  // It is applied only when explicitly enabled; see `aspects.ts`.
};

/** Combustion (astangata) orbs in degrees of elongation from the Sun.
 *  Values from Brihat Parashara Hora Shastra; retrograde orbs differ. */
export const COMBUSTION_ORB: Record<Graha, { direct: number; retrograde: number } | null> = {
  Moon:    { direct: 12, retrograde: 12 },
  Mars:    { direct: 17, retrograde: 17 },
  Mercury: { direct: 14, retrograde: 12 },
  Jupiter: { direct: 11, retrograde: 11 },
  Venus:   { direct: 10, retrograde: 8  },
  Saturn:  { direct: 15, retrograde: 15 },
  Sun: null, Rahu: null, Ketu: null,
};

/** Weekday lords, index 0 = Sunday. Drives Vara, Hora and Rahu Kaal. */
export const WEEKDAY_LORDS: readonly Graha[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
] as const;

export const WEEKDAY_NAMES_SA: readonly string[] = [
  'Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara',
] as const;

export const WEEKDAY_NAMES_HI: readonly string[] = [
  'रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार',
] as const;

/** Chaldean order, used for the Hora (planetary hour) sequence. */
export const HORA_ORDER: readonly Graha[] = [
  'Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon',
] as const;

// ---------------------------------------------------------------------------
// House semantics
// ---------------------------------------------------------------------------

export const KENDRA_HOUSES = [1, 4, 7, 10] as const;
export const TRIKONA_HOUSES = [1, 5, 9] as const;
export const DUSTHANA_HOUSES = [6, 8, 12] as const;
export const UPACHAYA_HOUSES = [3, 6, 10, 11] as const;
export const MARAKA_HOUSES = [2, 7] as const;
/** Trishadaya — houses whose lords tend to give difficulty. */
export const TRISHADAYA_HOUSES = [3, 6, 11] as const;

export const BHAVA_SIGNIFICATIONS: Record<number, string[]> = {
  1:  ['self', 'body', 'vitality', 'temperament', 'longevity'],
  2:  ['wealth', 'speech', 'family', 'accumulated resources', 'food'],
  3:  ['courage', 'siblings', 'effort', 'short travel', 'communication'],
  4:  ['mother', 'home', 'land', 'vehicles', 'inner contentment', 'schooling'],
  5:  ['children', 'intellect', 'purva punya', 'creativity', 'speculation'],
  6:  ['disease', 'debt', 'enemies', 'service', 'daily work', 'litigation'],
  7:  ['marriage', 'spouse', 'partnership', 'trade', 'public dealings'],
  8:  ['longevity', 'upheaval', 'inheritance', 'the occult', 'chronic matters'],
  9:  ['fortune', 'father', 'dharma', 'guru', 'higher learning', 'long travel'],
  10: ['career', 'status', 'authority', 'public action', 'karma'],
  11: ['gains', 'income', 'elder siblings', 'networks', 'fulfilment of desire'],
  12: ['loss', 'expenditure', 'foreign lands', 'seclusion', 'liberation', 'sleep'],
};
