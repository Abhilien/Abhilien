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

  tabTransits: 'Transits',
  tabRectify: 'Birth time',

  transitsToday: 'Transits today',
  fromMoon: 'from Moon',
  favourable: 'Favourable',
  blocked: 'Blocked',
  neutralTransit: 'Not favourable',
  bindusLabel: 'bindus',
  outOfEight: 'out of 8 in this chart',
  sadeSati: 'Sade Sati',
  sadeSatiRunning: 'Running now',
  sadeSatiNotRunning: 'Not running',
  phaseRising: 'Rising',
  phasePeak: 'Peak',
  phaseSetting: 'Setting',
  allPeriods: 'All periods in this lifetime',
  dhaiya: 'Dhaiya (small panoti)',
  kantakaShani: 'Kantaka Shani',
  ashtamaShani: 'Ashtama Shani',
  continuesBeyond: 'continues past the range searched',

  rectifyTitle: 'Narrow down your birth time',
  rectifyIntro:
    'If you only know your birth time roughly, dated events from your life can narrow it down. '
    + 'Add at least three, six or more is much better, and date them as precisely as you can.',
  addEvent: 'Add event',
  eventType: 'What happened',
  eventDate: 'When',
  eventPrecision: 'How sure of the date',
  precisionDay: 'Day',
  precisionMonth: 'Month',
  precisionYear: 'Year',
  removeEvent: 'Remove',
  runRectify: 'Find the best fit',
  searchWindow: 'Search within',
  minutesEitherWay: 'minutes either way',
  bestFit: 'Best fit',
  confidence: 'Confidence',
  ascendantConfidence: 'Ascendant',
  stability: 'Stability',
  shortlist: 'Closest candidates',
  needMoreEvents: 'Add at least three dated events to run this.',
  applyTime: 'Use this time',
  tabMuhurta: 'Muhurta',
  muhurtaTitle: 'Find an auspicious time',
  muhurtaIntro:
    'Choose what you are planning and a date range. Times are ranked by how well they satisfy '
    + 'traditional preferences for that activity, using your own chart where it matters.',
  activity: 'What are you planning',
  fromDate: 'From',
  toDate: 'To',
  findTimes: 'Find times',
  noWindows: 'No time in this range met the threshold. Try a wider range.',
  dayScore: 'Day',
  showFactors: 'Why',
  gradeExcellent: 'Excellent',
  gradeGood: 'Good',
  gradeAcceptable: 'Acceptable',
  rangeTooLong: 'Please choose a range of six months or less.',
  notFoundPlace: 'Village not listed? Choose your state',
  chooseState: 'State',
  loadingVillages: 'Loading villages…',
  villagesLoaded: 'villages available',
  shardUnavailable: 'The full village list is not available on this deployment. Use coordinates below.',
  placesAttribution: 'Place data from GeoNames, CC BY 4.0.',
  loadingPlaces: 'Loading places…',
  share: 'Share',
  shareImage: 'Share image',
  copied: 'Copied to clipboard',
  downloaded: 'Image saved',
  shareFailed: 'Could not share on this device',
  deleteChart: 'Delete',
  confirmDelete: 'Delete this saved chart?',
  welcomeTitle: 'Your Vedic birth chart, computed exactly',
  welcomeBody:
    'Enter your birth date, time and place. Everything is calculated on this device — '
    + 'nothing is sent anywhere, and it works without a network. Positions and periods are '
    + 'astronomy and are exact; interpretations are what classical texts say, with the source '
    + 'shown for each one.',
  welcomeNoTime: 'Do not know your birth time? Enter your best guess and set how sure you are — '
    + 'the app will say which parts of the chart it cannot determine.',
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

  tabTransits: 'गोचर',
  tabRectify: 'जन्म समय',

  transitsToday: 'आज का गोचर',
  fromMoon: 'चन्द्र से',
  favourable: 'शुभ',
  blocked: 'वेध',
  neutralTransit: 'अशुभ',
  bindusLabel: 'बिन्दु',
  outOfEight: 'इस कुण्डली में 8 में से',
  sadeSati: 'साढ़े साती',
  sadeSatiRunning: 'अभी चल रही है',
  sadeSatiNotRunning: 'अभी नहीं चल रही',
  phaseRising: 'आरोहिणी',
  phasePeak: 'शिखर',
  phaseSetting: 'अवरोहिणी',
  allPeriods: 'जीवन की सभी अवधियाँ',
  dhaiya: 'ढैया (छोटी पनौती)',
  kantakaShani: 'कंटक शनि',
  ashtamaShani: 'अष्टम शनि',
  continuesBeyond: 'खोज सीमा से आगे जारी',

  rectifyTitle: 'जन्म समय निर्धारण',
  rectifyIntro:
    'यदि जन्म समय केवल लगभग ज्ञात है, तो जीवन की तिथि-सहित घटनाओं से उसे सीमित किया जा सकता है। '
    + 'कम से कम तीन घटनाएँ जोड़ें — छह या अधिक बेहतर — और तिथि यथासंभव सटीक दें।',
  addEvent: 'घटना जोड़ें',
  eventType: 'क्या हुआ',
  eventDate: 'कब',
  eventPrecision: 'तिथि कितनी सही',
  precisionDay: 'दिन',
  precisionMonth: 'माह',
  precisionYear: 'वर्ष',
  removeEvent: 'हटाएँ',
  runRectify: 'सर्वोत्तम समय खोजें',
  searchWindow: 'खोज सीमा',
  minutesEitherWay: 'मिनट आगे-पीछे',
  bestFit: 'सर्वोत्तम',
  confidence: 'विश्वसनीयता',
  ascendantConfidence: 'लग्न',
  stability: 'स्थिरता',
  shortlist: 'निकटतम विकल्प',
  needMoreEvents: 'चलाने के लिए कम से कम तीन तिथि-सहित घटनाएँ जोड़ें।',
  applyTime: 'यह समय लगाएँ',
  tabMuhurta: 'मुहूर्त',
  muhurtaTitle: 'शुभ मुहूर्त खोजें',
  muhurtaIntro:
    'कार्य और तिथि सीमा चुनें। समय शास्त्रीय प्राथमिकताओं के अनुसार क्रमबद्ध हैं, '
    + 'और जहाँ प्रासंगिक हो वहाँ आपकी अपनी कुण्डली का उपयोग किया गया है।',
  activity: 'कार्य',
  fromDate: 'से',
  toDate: 'तक',
  findTimes: 'मुहूर्त खोजें',
  noWindows: 'इस सीमा में कोई उपयुक्त समय नहीं मिला। सीमा बढ़ाकर देखें।',
  dayScore: 'दिन',
  showFactors: 'कारण',
  gradeExcellent: 'उत्तम',
  gradeGood: 'शुभ',
  gradeAcceptable: 'सामान्य',
  rangeTooLong: 'कृपया छह माह या उससे कम की सीमा चुनें।',
  notFoundPlace: 'गाँव नहीं मिला? अपना राज्य चुनें',
  chooseState: 'राज्य',
  loadingVillages: 'गाँव लोड हो रहे हैं…',
  villagesLoaded: 'गाँव उपलब्ध',
  shardUnavailable: 'इस संस्करण में पूरी गाँव सूची उपलब्ध नहीं है। नीचे अक्षांश-देशांतर भरें।',
  placesAttribution: 'स्थान डेटा: GeoNames, CC BY 4.0.',
  loadingPlaces: 'स्थान लोड हो रहे हैं…',
  share: 'साझा करें',
  shareImage: 'चित्र साझा करें',
  copied: 'कॉपी हो गया',
  downloaded: 'चित्र सहेजा गया',
  shareFailed: 'इस डिवाइस पर साझा नहीं हो सका',
  deleteChart: 'हटाएँ',
  confirmDelete: 'यह सहेजी गई कुण्डली हटाएँ?',
  welcomeTitle: 'आपकी वैदिक जन्म कुण्डली, सटीक गणना',
  welcomeBody:
    'जन्म तिथि, समय और स्थान भरें। सारी गणना इसी डिवाइस पर होती है — कुछ भी कहीं नहीं भेजा जाता, '
    + 'और यह बिना नेटवर्क के भी चलता है। ग्रह स्थिति और दशाएँ खगोलीय गणना हैं और पूर्णतः सटीक हैं; '
    + 'फलादेश शास्त्रों के अनुसार है, प्रत्येक के स्रोत सहित।',
  welcomeNoTime: 'जन्म समय ज्ञात नहीं? अनुमान भरें और बताएँ कि कितना निश्चित है — '
    + 'ऐप बता देगा कि कुण्डली के कौन से भाग निर्धारित नहीं हो सकते।',
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
