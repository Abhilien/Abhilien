/**
 * Devanagari for the terms the panchang uses.
 *
 * The engine already carries rashis, nakshatras, grahas and weekdays in Hindi,
 * but tithi, yoga, karana and tara had Latin transliterations only — so a Hindi
 * reading came out half-transliterated: "Shukla पक्ष की Panchami तिथि, Shula योग".
 * That is the kind of thing a reader notices immediately and an English-speaking
 * developer never does.
 *
 * Index-aligned with the Latin tables they mirror, so the two cannot drift
 * apart silently — a test asserts the lengths match.
 */

/** 1st to 14th of a paksha; the 15th is Purnima or Amavasya by paksha. */
export const TITHI_NAMES_HI: readonly string[] = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी',
  'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी',
] as const;

export const YOGA_NAMES_HI: readonly string[] = [
  'विष्कम्भ', 'प्रीति', 'आयुष्मान्', 'सौभाग्य', 'शोभन', 'अतिगण्ड', 'सुकर्मा',
  'धृति', 'शूल', 'गण्ड', 'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र',
  'सिद्धि', 'व्यतीपात', 'वरीयान्', 'परिघ', 'शिव', 'सिद्ध', 'साध्य', 'शुभ',
  'शुक्ल', 'ब्रह्म', 'इन्द्र', 'वैधृति',
] as const;

export const KARANA_NAMES_HI: Record<string, string> = {
  Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल',
  Gara: 'गर', Vanija: 'वणिज', Vishti: 'विष्टि',
  Kimstughna: 'किंस्तुघ्न', Shakuni: 'शकुनि', Chatushpada: 'चतुष्पद', Naga: 'नाग',
};

export const TARA_NAMES_HI: readonly string[] = [
  'जन्म', 'सम्पत्', 'विपत्', 'क्षेम', 'प्रत्यरि',
  'साधक', 'वध', 'मित्र', 'अति-मित्र',
] as const;

export const PAKSHA_HI: Record<string, string> = { Shukla: 'शुक्ल', Krishna: 'कृष्ण' };

/** Purnima and Amavasya close their respective pakshas. */
export const FULL_NEW_HI: Record<string, string> = { Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या' };
