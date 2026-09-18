/**
 * Localisation.
 *
 * Hindi is a first-class language here, not an afterthought: a large part of
 * this audience is more comfortable reading Devanagari than Latin script, and
 * the English-only apps in this market leave them out. Strings are kept flat and
 * explicit rather than generated, so a translator can work through the file
 * without reading code.
 */
export type Lang = 'en' | 'hi';

type Dict = Record<string, string>;

const en: Dict = {
  appName: 'Kundali',
  tagline: 'Vedic chart, computed exactly',

  tabChart: 'Chart',
  tabDasha: 'Dasha',
  tabYogas: 'Yogas',
  tabPanchang: 'Panchang',
  tabMatch: 'Matching',

  birthDetails: 'Birth details',
  name: 'Name',
  namePlaceholder: 'Optional',
  dateOfBirth: 'Date of birth',
  timeOfBirth: 'Time of birth',
  placeOfBirth: 'Place of birth',
  searchPlace: 'Search for a city or town',
  manualCoords: 'Enter coordinates manually',
  latitude: 'Latitude',
  longitude: 'Longitude',
  timezone: 'Time zone',
  timeAccuracy: 'How sure are you of the time?',
  accuracyExact: 'Exact, from a record',
  accuracyToMinute: 'To the minute',
  accuracyToFiveMin: 'Within five minutes',
  accuracyToFifteenMin: 'Within fifteen minutes',
  accuracyToHour: 'Within an hour',
  accuracyToPartOfDay: 'Only the part of the day',
  accuracyUnknown: 'Not known at all',
  calculate: 'Show chart',
  savedProfiles: 'Saved',
  saveProfile: 'Save',
  newChart: 'New chart',

  lagna: 'Ascendant',
  moonSign: 'Moon sign',
  sunSign: 'Sun sign',
  nakshatra: 'Nakshatra',
  pada: 'Pada',
  ayanamsa: 'Ayanamsa',
  graha: 'Graha',
  position: 'Position',
  rashi: 'Sign',
  house: 'House',
  retrograde: 'Retrograde',
  dignity: 'Dignity',
  chartStyle: 'Chart style',
  north: 'North Indian',
  south: 'South Indian',
  divisional: 'Divisional chart',

  mahadasha: 'Mahadasha',
  running: 'Running now',
  from: 'From',
  to: 'To',
  balanceAtBirth: 'Balance at birth',

  findings: 'Findings',
  noFindings: 'No yogas or doshas from the current rule set fired for this chart.',
  active: 'In effect',
  cancelledLabel: 'Cancelled by a classical exemption',
  source: 'Source',
  contested: 'Authorities differ',
  whatTextsSay: 'What the texts say',

  today: 'Today',
  tithi: 'Tithi',
  vara: 'Weekday',
  yoga: 'Yoga',
  karana: 'Karana',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  rahuKaal: 'Rahu Kaal',
  gulika: 'Gulika Kaal',
  yamaganda: 'Yamaganda',
  abhijit: 'Abhijit Muhurta',
  choghadiya: 'Choghadiya',
  endsAt: 'ends',

  groom: 'First person',
  bride: 'Second person',
  compare: 'Compare',
  koota: 'Koota',
  points: 'Points',
  totalScore: 'Total',
  needTwoCharts: 'Save at least two charts to compare them.',

  disclaimerTitle: 'About these results',
  disclaimer:
    'Positions and periods here are astronomy and are computed exactly. The interpretations are '
    + 'what classical Jyotish texts say, cited to their source. They are offered for reflection, '
    + 'not as advice about health, money, or any decision you should not make for yourself.',
  warningsTitle: 'Worth knowing about this chart',
};

const hi: Dict = {
  appName: 'कुण्डली',
  tagline: 'वैदिक कुण्डली, सटीक गणना',

  tabChart: 'कुण्डली',
  tabDasha: 'दशा',
  tabYogas: 'योग',
  tabPanchang: 'पंचांग',
  tabMatch: 'मिलान',

  birthDetails: 'जन्म विवरण',
  name: 'नाम',
  namePlaceholder: 'वैकल्पिक',
  dateOfBirth: 'जन्म तिथि',
  timeOfBirth: 'जन्म समय',
  placeOfBirth: 'जन्म स्थान',
  searchPlace: 'शहर या कस्बा खोजें',
  manualCoords: 'अक्षांश-देशांतर स्वयं भरें',
  latitude: 'अक्षांश',
  longitude: 'देशांतर',
  timezone: 'समय क्षेत्र',
  timeAccuracy: 'समय कितना सही है?',
  accuracyExact: 'बिल्कुल सही, अभिलेख से',
  accuracyToMinute: 'मिनट तक',
  accuracyToFiveMin: 'पाँच मिनट के भीतर',
  accuracyToFifteenMin: 'पंद्रह मिनट के भीतर',
  accuracyToHour: 'एक घंटे के भीतर',
  accuracyToPartOfDay: 'केवल दिन का भाग',
  accuracyUnknown: 'बिल्कुल ज्ञात नहीं',
  calculate: 'कुण्डली देखें',
  savedProfiles: 'सहेजे गए',
  saveProfile: 'सहेजें',
  newChart: 'नई कुण्डली',

  lagna: 'लग्न',
  moonSign: 'चन्द्र राशि',
  sunSign: 'सूर्य राशि',
  nakshatra: 'नक्षत्र',
  pada: 'पाद',
  ayanamsa: 'अयनांश',
  graha: 'ग्रह',
  position: 'स्थिति',
  rashi: 'राशि',
  house: 'भाव',
  retrograde: 'वक्री',
  dignity: 'बल',
  chartStyle: 'कुण्डली शैली',
  north: 'उत्तर भारतीय',
  south: 'दक्षिण भारतीय',
  divisional: 'वर्ग कुण्डली',

  mahadasha: 'महादशा',
  running: 'वर्तमान',
  from: 'से',
  to: 'तक',
  balanceAtBirth: 'जन्म के समय शेष',

  findings: 'निष्कर्ष',
  noFindings: 'इस कुण्डली में वर्तमान नियमों से कोई योग या दोष नहीं बना।',
  active: 'प्रभावी',
  cancelledLabel: 'शास्त्रीय अपवाद से भंग',
  source: 'स्रोत',
  contested: 'आचार्यों में मतभेद',
  whatTextsSay: 'शास्त्र क्या कहते हैं',

  today: 'आज',
  tithi: 'तिथि',
  vara: 'वार',
  yoga: 'योग',
  karana: 'करण',
  sunrise: 'सूर्योदय',
  sunset: 'सूर्यास्त',
  rahuKaal: 'राहु काल',
  gulika: 'गुलिक काल',
  yamaganda: 'यमगण्ड',
  abhijit: 'अभिजित मुहूर्त',
  choghadiya: 'चौघड़िया',
  endsAt: 'समाप्ति',

  groom: 'पहला व्यक्ति',
  bride: 'दूसरा व्यक्ति',
  compare: 'मिलान करें',
  koota: 'कूट',
  points: 'अंक',
  totalScore: 'कुल',
  needTwoCharts: 'मिलान के लिए कम से कम दो कुण्डलियाँ सहेजें।',

  disclaimerTitle: 'इन परिणामों के बारे में',
  disclaimer:
    'यहाँ ग्रहों की स्थिति और दशाएँ खगोलीय गणना हैं और पूर्णतः सटीक हैं। फलादेश शास्त्रों के अनुसार है '
    + 'और स्रोत सहित दिया गया है। यह चिंतन हेतु है — स्वास्थ्य, धन या किसी भी निर्णय के लिए सलाह नहीं।',
  warningsTitle: 'इस कुण्डली के बारे में ध्यान देने योग्य',
};

const DICTS: Record<Lang, Dict> = { en, hi };

let current: Lang = (localStorage.getItem('lang') as Lang) || detect();

function detect(): Lang {
  return navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en';
}

export function lang(): Lang { return current; }

export function setLang(next: Lang): void {
  current = next;
  try { localStorage.setItem('lang', next); } catch { /* private mode */ }
  document.documentElement.lang = next;
}

/** Translate a key, falling back to English and then to the key itself. */
export function t(key: string): string {
  return DICTS[current][key] ?? en[key] ?? key;
}
