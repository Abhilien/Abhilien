/**
 * Core domain types.
 *
 * Internal identifiers are stable ASCII English keys so that code, JSON fixtures
 * and test goldens never depend on transliteration choices. Human-facing Sanskrit /
 * Hindi / regional names live in the i18n name tables in `constants.ts`.
 */

/** The nine grahas of Jyotish. Outer planets are deliberately absent: classical
 *  Vedic astrology does not use them, and adding them would change rule outcomes. */
export type Graha =
  | 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

/** Rashi (zodiac sign) index, 0 = Mesha/Aries .. 11 = Meena/Pisces. */
export type RashiIndex = 0|1|2|3|4|5|6|7|8|9|10|11;

/** Nakshatra index, 0 = Ashwini .. 26 = Revati. */
export type NakshatraIndex =
  0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26;

/** Pada (quarter) within a nakshatra, 1..4. */
export type Pada = 1 | 2 | 3 | 4;

/** Bhava (house) number, 1..12. */
export type BhavaNumber = 1|2|3|4|5|6|7|8|9|10|11|12;

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';
export type Quality = 'Chara' | 'Sthira' | 'Dvisvabhava';
export type Gender = 'Male' | 'Female' | 'Neuter';
export type Gana = 'Deva' | 'Manushya' | 'Rakshasa';
export type Nadi = 'Adi' | 'Madhya' | 'Antya';
export type Varna = 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
export type Benefic = 'Benefic' | 'Malefic' | 'Neutral';

/** Which sidereal zero-point definition to use. Lahiri (Chitrapaksha) is the
 *  Government of India standard used by the Rashtriya Panchang and by most
 *  Indian software; the others are offered because real practitioners differ. */
export type AyanamsaSystem = 'Lahiri' | 'Raman' | 'KP' | 'TrueChitra' | 'Yukteshwar';

/** House-division scheme. Whole-sign is the classical Parashari default across
 *  North and South India and is what the rule engine assumes unless told
 *  otherwise. `Porphyry` and `Sripati` are the cusp-based systems actually used
 *  in North Indian practice. Placidus is deliberately absent until the KP
 *  module lands, where it can be validated against KP reference tables rather
 *  than shipped unverified. */
export type HouseSystem = 'WholeSign' | 'Equal' | 'Porphyry' | 'Sripati';

/** Lunar node model: the mean node is traditional and is what almost all Indian
 *  panchangs and software use; the true (osculating) node is offered as an option. */
export type NodeModel = 'Mean' | 'True';

/** Chart rendering convention — affects presentation only, never computation. */
export type ChartStyle = 'NorthIndian' | 'SouthIndian' | 'EastIndian';

/** A geographic place of birth. */
export interface GeoLocation {
  /** Degrees, positive north. */
  latitude: number;
  /** Degrees, positive east. */
  longitude: number;
  /** Metres above sea level. Affects sunrise/sunset and the ascendant marginally. */
  altitude?: number;
  /** IANA zone id, e.g. `Asia/Kolkata`. Required: fixed UTC offsets silently
   *  corrupt pre-1955 Indian births (Calcutta +5:53:20, Bombay +4:51, WWII +6:30). */
  timezone: string;
  /** Free-text label for display, e.g. `Varanasi, Uttar Pradesh, India`. */
  label?: string;
}

/** Birth details as a user supplies them: wall-clock local time plus a place. */
export interface BirthData {
  /** Local civil year (astronomical numbering: 1 BCE = 0, 2 BCE = -1). */
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
  /** 0..23 local wall-clock */
  hour: number;
  /** 0..59 */
  minute: number;
  /** 0..59.999 */
  second?: number;
  location: GeoLocation;
  /** How confident the birth time is. Drives whether we show varga charts and
   *  how strongly we qualify time-sensitive predictions. */
  timeAccuracy?: TimeAccuracy;
}

/** Honest handling of the single biggest real-world data problem in Jyotish:
 *  hardly anyone knows their birth time to the minute. */
export type TimeAccuracy =
  | 'Exact'        // from a birth certificate / hospital record
  | 'ToMinute'     // remembered precisely
  | 'ToFiveMin'
  | 'ToFifteenMin'
  | 'ToHour'
  | 'ToPartOfDay'  // "morning", "after sunset"
  | 'Unknown';     // chart still computable; lagna-dependent output suppressed

/** A computed position of one graha. */
export interface GrahaPosition {
  graha: Graha;
  /** Sidereal ecliptic longitude, [0,360). */
  longitude: number;
  /** Ecliptic latitude in degrees. */
  latitude: number;
  /** Apparent geocentric distance in AU (undefined for the computed nodes). */
  distanceAu?: number;
  /** Apparent daily motion in longitude, deg/day. Negative when retrograde. */
  speed: number;
  /** True when apparent motion in longitude is negative. Rahu/Ketu are
   *  perpetually retrograde by convention. */
  retrograde: boolean;
  rashi: RashiIndex;
  /** Degrees travelled within the current rashi, [0,30). */
  degreeInRashi: number;
  nakshatra: NakshatraIndex;
  /** Degrees travelled within the current nakshatra, [0, 13.3333). */
  degreeInNakshatra: number;
  pada: Pada;
  /** Vimshottari lord of the occupied nakshatra. */
  nakshatraLord: Graha;
}

/** House cusps and the sign occupying each house. */
export interface Bhava {
  number: BhavaNumber;
  /** Sidereal longitude of the cusp. For whole-sign this is the 0° point of the
   *  sign; the ascendant's exact degree is carried separately on the chart. */
  cusp: number;
  /** Sidereal longitude where this house ends (= next cusp). */
  end: number;
  rashi: RashiIndex;
  lord: Graha;
}

/** Everything deterministic about a moment and place. Every downstream layer —
 *  dashas, yogas, strengths, readings — is a pure function of this object. */
export interface Kundali {
  birth: BirthData;
  /** Julian Day in Universal Time for the birth moment. */
  julianDayUT: number;
  /** Julian Day in Terrestrial Time (UT + ΔT). */
  julianDayTT: number;
  /** ISO-8601 instant of birth in UTC. */
  utcISO: string;
  settings: ChartSettings;
  /** Ayanamsa actually applied, in degrees. */
  ayanamsa: number;
  /** Sidereal longitude of the ascendant. */
  lagna: number;
  lagnaRashi: RashiIndex;
  lagnaNakshatra: NakshatraIndex;
  lagnaPada: Pada;
  /** Sidereal longitude of the Midheaven (10th cusp in cusp-based systems). */
  madhyaLagna: number;
  bhavas: Bhava[];
  positions: Record<Graha, GrahaPosition>;
  /** Which house each graha occupies, under the chosen house system. */
  grahaBhava: Record<Graha, BhavaNumber>;
}

export interface ChartSettings {
  ayanamsa: AyanamsaSystem;
  houseSystem: HouseSystem;
  nodeModel: NodeModel;
  chartStyle: ChartStyle;
}

export const DEFAULT_SETTINGS: ChartSettings = {
  ayanamsa: 'Lahiri',
  houseSystem: 'WholeSign',
  nodeModel: 'Mean',
  chartStyle: 'NorthIndian',
};
