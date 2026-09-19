/**
 * Muhurta — what each activity wants from the calendar.
 *
 * Electional astrology asks the opposite question to natal astrology: not "what
 * does this chart say" but "when should this be done". The classical answer is
 * a set of preferences over the five limbs, and each activity has its own.
 *
 * Every rule here is a traditional preference, not a prediction. The module
 * ranks times by how well they satisfy the tradition; it never claims an
 * outcome will follow.
 */
import type { NakshatraIndex } from '../core/types.js';

/**
 * The seven natures of the nakshatras, which is the classification muhurta
 * actually turns on — distinct from gana, which governs matchmaking.
 */
export type NakshatraNature =
  | 'Dhruva'    // fixed: things meant to last
  | 'Chara'     // movable: travel, vehicles, change
  | 'Ugra'      // fierce: forceful undertakings
  | 'Mishra'    // mixed
  | 'Kshipra'   // swift and light: trade, learning, quick work
  | 'Mridu'     // tender: art, friendship, ornament, marriage
  | 'Tikshna';  // sharp: surgery, confrontation, dissolution

export const NAKSHATRA_NATURE: readonly NakshatraNature[] = [
  'Kshipra',  // Ashwini
  'Ugra',     // Bharani
  'Mishra',   // Krittika
  'Dhruva',   // Rohini
  'Mridu',    // Mrigashira
  'Tikshna',  // Ardra
  'Chara',    // Punarvasu
  'Kshipra',  // Pushya
  'Tikshna',  // Ashlesha
  'Ugra',     // Magha
  'Ugra',     // Purva Phalguni
  'Dhruva',   // Uttara Phalguni
  'Kshipra',  // Hasta
  'Mridu',    // Chitra
  'Chara',    // Swati
  'Mishra',   // Vishakha
  'Mridu',    // Anuradha
  'Tikshna',  // Jyeshtha
  'Tikshna',  // Mula
  'Ugra',     // Purva Ashadha
  'Dhruva',   // Uttara Ashadha
  'Chara',    // Shravana
  'Chara',    // Dhanishta
  'Chara',    // Shatabhisha
  'Ugra',     // Purva Bhadrapada
  'Dhruva',   // Uttara Bhadrapada
  'Mridu',    // Revati
] as const;

/**
 * Yogas the tradition treats as inauspicious for beginning anything.
 * Indices into the 27 yogas, in the standard order.
 */
export const INAUSPICIOUS_YOGAS: readonly number[] = [
  0,  // Vishkambha
  5,  // Atiganda
  8,  // Shula
  9,  // Ganda
  12, // Vyaghata
  14, // Vajra
  16, // Vyatipata
  18, // Parigha
  26, // Vaidhriti
] as const;

/** Rikta ("empty") tithis, avoided for auspicious beginnings. */
export const RIKTA_TITHIS: readonly number[] = [4, 9, 14] as const;

export type MuhurtaActivity =
  | 'Marriage'
  | 'GrihaPravesh'
  | 'BusinessStart'
  | 'VehiclePurchase'
  | 'PropertyPurchase'
  | 'Vidyarambha'
  | 'Namakaran'
  | 'Travel'
  | 'Contract'
  | 'MedicalProcedure';

export interface ActivityRule {
  label: string;
  labelHi: string;
  /** Nakshatra natures the tradition favours for this activity. */
  natures: NakshatraNature[];
  /** Weekdays favoured, 0 = Sunday. */
  weekdays: number[];
  /** Tithis avoided beyond the usual rikta and amavasya. */
  extraAvoidTithis?: number[];
  /**
   * A warning the caller must surface. Present only where following a muhurta
   * over practical advice could cause real harm.
   */
  caution?: string;
}

export const ACTIVITY_RULES: Record<MuhurtaActivity, ActivityRule> = {
  Marriage: {
    label: 'Marriage', labelHi: 'विवाह',
    natures: ['Dhruva', 'Mridu', 'Chara'],
    weekdays: [1, 3, 4, 5],            // Mon, Wed, Thu, Fri
  },
  GrihaPravesh: {
    label: 'Entering a new home', labelHi: 'गृह प्रवेश',
    natures: ['Dhruva', 'Mridu'],
    weekdays: [1, 3, 4, 5],
  },
  BusinessStart: {
    label: 'Starting a business', labelHi: 'व्यापार आरंभ',
    natures: ['Kshipra', 'Dhruva', 'Chara'],
    weekdays: [1, 3, 4, 5],
  },
  VehiclePurchase: {
    label: 'Buying a vehicle', labelHi: 'वाहन क्रय',
    natures: ['Chara', 'Kshipra', 'Mridu'],
    weekdays: [1, 3, 4, 5, 6],
  },
  PropertyPurchase: {
    label: 'Buying property or land', labelHi: 'भूमि क्रय',
    natures: ['Dhruva', 'Mridu'],
    weekdays: [1, 3, 4, 5],
  },
  Vidyarambha: {
    label: 'Beginning study', labelHi: 'विद्यारंभ',
    natures: ['Kshipra', 'Dhruva', 'Mridu'],
    weekdays: [1, 3, 4, 5],
  },
  Namakaran: {
    label: 'Naming a child', labelHi: 'नामकरण',
    natures: ['Dhruva', 'Mridu', 'Kshipra'],
    weekdays: [1, 3, 4, 5],
  },
  Travel: {
    label: 'Setting out on a journey', labelHi: 'यात्रा',
    natures: ['Chara', 'Kshipra', 'Mridu'],
    weekdays: [1, 3, 4, 5],
  },
  Contract: {
    label: 'Signing an agreement', labelHi: 'अनुबंध',
    natures: ['Dhruva', 'Kshipra'],
    weekdays: [1, 3, 4, 5],
  },
  MedicalProcedure: {
    label: 'A planned medical procedure', labelHi: 'चिकित्सा प्रक्रिया',
    // Tikshna nakshatras are the classical choice for surgery.
    natures: ['Tikshna', 'Kshipra'],
    weekdays: [2, 6],                  // Tue, Sat
    caution:
      'Timing for a medical procedure must follow your doctor, not this calendar. '
      + 'Never delay urgent or recommended treatment to wait for a muhurta. '
      + 'This is offered only for choosing between dates a clinician has already '
      + 'said are equally safe.',
  },
};

/** Tara bala: the nine taras counted from the natal Moon's nakshatra. */
export const TARA_NAMES: readonly string[] = [
  'Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari',
  'Sadhaka', 'Vadha', 'Mitra', 'Ati-Mitra',
] as const;

/** Taras the tradition treats as obstructive: the 3rd, 5th and 7th. */
export const INAUSPICIOUS_TARAS: readonly number[] = [3, 5, 7] as const;

/** Houses from the natal Moon in which the transiting Moon supports action. */
export const FAVOURABLE_CHANDRA_HOUSES: readonly number[] = [1, 3, 6, 7, 10, 11] as const;
