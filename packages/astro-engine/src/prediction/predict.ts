/**
 * Predictions for a day, a month or a year.
 *
 * This is the part of an astrology app that most invites invention, so it is
 * built the way the rest of the engine is: a prediction is a set of *factors*,
 * each one a named classical condition that either holds or does not, with the
 * computation that produced it attached. Nothing here generates a sentence that
 * is not entailed by a factor, and nothing weights a factor by feel — the
 * weights are declared constants, visible and arguable.
 *
 * What changes with the span is which factors can speak. A dasha runs for years
 * and says nothing about Tuesday; the Moon's tara changes daily and says nothing
 * about the decade. Letting a slow factor dominate a daily reading is how these
 * apps end up telling someone the same thing every day for eighteen months.
 */
import type { Kundali, Graha, RashiIndex, GeoLocation } from '../core/types.js';
import { GRAHA_NAMES_SA, RASHI_NAMES_SA, NAKSHATRA_NAMES_SA } from '../core/constants.js';
import { ordinal } from '../core/format.js';
import { dashaChainAt } from '../dasha/vimshottari.js';
import { allConditions } from '../chart/dignity.js';
import { transitReport } from '../transit/gochar.js';
import { sadeSatiStatus } from '../transit/sadesati.js';
import { computePanchang } from '../panchang/panchang.js';
import { taraBala, chandraBala } from './bala.js';
import {
  TITHI_NAMES_HI, YOGA_NAMES_HI, KARANA_NAMES_HI, TARA_NAMES_HI, PAKSHA_HI, FULL_NEW_HI,
} from './devanagari.js';
import { NAKSHATRA_NAMES_HI } from '../core/constants.js';
import { TITHI_NAMES, YOGA_NAMES } from '../panchang/panchang.js';

export type PredictionSpan = 'Day' | 'Month' | 'Year';

export type Polarity = 'Supportive' | 'Testing' | 'Mixed';

export interface PredictionFactor {
  /** Which computation produced this, so a reader can go and check it. */
  source: 'Dasha' | 'Antardasha' | 'Gochar' | 'SadeSati' | 'Panchang' | 'TaraBala' | 'ChandraBala';
  /** The condition in its own vocabulary, e.g. "Shani in the 12th from the Moon". */
  subject: string;
  polarity: Polarity;
  /** Declared, not tuned: how much this moves the reading, 0..1. */
  weight: number;
  /** What it means, in a sentence. */
  text: string;
  /** Houses this factor speaks about, when it speaks about any. */
  houses: number[];
}

export interface LifeArea {
  house: number;
  /** Net emphasis this period puts on the house; sign matters, size is relative. */
  emphasis: number;
}

export interface Prediction {
  span: PredictionSpan;
  from: Date;
  to: Date;
  /**
   * Weighted balance of the factors, -1..1. Deliberately not shown as a score:
   * a number out of ten invites precision the inputs do not have. The app reads
   * it as a word.
   */
  tenor: number;
  factors: PredictionFactor[];
  /** Houses the period emphasises, strongest first. */
  areas: LifeArea[];
  /** Set when nothing of substance applies, rather than inventing something. */
  quiet: boolean;
}

/**
 * Weights, in one place so they can be argued with.
 *
 * The ordering is the classical one: the dasha is the frame, gochar moves inside
 * it, and the daily measures are the finest grain. Each span zeroes what cannot
 * honestly speak at that resolution.
 */
const WEIGHTS: Record<PredictionSpan, Record<PredictionFactor['source'], number>> = {
  Year:  { Dasha: 1.0, Antardasha: 0.8, Gochar: 0.5, SadeSati: 0.9, Panchang: 0, TaraBala: 0, ChandraBala: 0 },
  Month: { Dasha: 0.6, Antardasha: 1.0, Gochar: 0.8, SadeSati: 0.7, Panchang: 0, TaraBala: 0, ChandraBala: 0 },
  Day:   { Dasha: 0.3, Antardasha: 0.5, Gochar: 0.6, SadeSati: 0.4, Panchang: 0.7, TaraBala: 1.0, ChandraBala: 0.9 },
};

/** Benefic and malefic by nature, before any chart-specific judgement. */
const NATURAL_BENEFICS: Graha[] = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

/** What each house stands for, for naming the areas a period emphasises. */
export const HOUSE_SIGNIFICATIONS: Record<number, string> = {
  1: 'the body, vitality, and how you come across',
  2: 'savings, family, and speech',
  3: 'effort, courage, siblings, and short journeys',
  4: 'home, mother, land, and peace of mind',
  5: 'children, learning, and what you create',
  6: 'work, debts, illness, and competitors',
  7: 'marriage, partnership, and dealings with others',
  8: 'upheaval, inheritance, and what stays hidden',
  9: 'fortune, father, teachers, and belief',
  10: 'career, standing, and public life',
  11: 'gains, income, and elder siblings',
  12: 'expense, foreign travel, retreat, and loss',
};

export const HOUSE_SIGNIFICATIONS_HI: Record<number, string> = {
  1: 'शरीर, ओज और आपकी छवि',
  2: 'संचित धन, कुटुम्ब और वाणी',
  3: 'पराक्रम, साहस, भाई-बहन और छोटी यात्राएँ',
  4: 'गृह, माता, भूमि और मन की शान्ति',
  5: 'सन्तान, विद्या और आपका सृजन',
  6: 'कार्य, ऋण, रोग और प्रतिस्पर्धी',
  7: 'विवाह, साझेदारी और दूसरों से व्यवहार',
  8: 'उथल-पुथल, उत्तराधिकार और जो गुप्त है',
  9: 'भाग्य, पिता, गुरु और श्रद्धा',
  10: 'कर्म, प्रतिष्ठा और सार्वजनिक जीवन',
  11: 'लाभ, आय और बड़े भाई-बहन',
  12: 'व्यय, विदेश यात्रा, एकान्त और हानि',
};

export function houseMeaning(house: number, lang: PredictionLang): string {
  return (lang === 'hi' ? HOUSE_SIGNIFICATIONS_HI : HOUSE_SIGNIFICATIONS)[house] ?? '';
}

/** Graha names in Devanagari, for the Hindi reading. */
const GRAHA_HI: Record<Graha, string> = {
  Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु',
  Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
};

const RASHI_HI = [
  'मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या',
  'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन',
];

const graha = (g: Graha, lang: PredictionLang) => (lang === 'hi' ? GRAHA_HI[g] : GRAHA_NAMES_SA[g]);
const rashi = (r: RashiIndex, lang: PredictionLang) => (lang === 'hi' ? RASHI_HI[r]! : RASHI_NAMES_SA[r]!);

/** "5th" / "पाँचवें" — ordinals read differently enough to be worth a table. */
const ORDINAL_HI = [
  '', 'पहले', 'दूसरे', 'तीसरे', 'चौथे', 'पाँचवें', 'छठे',
  'सातवें', 'आठवें', 'नवें', 'दसवें', 'ग्यारहवें', 'बारहवें',
];
const nth = (n: number, lang: PredictionLang) => (lang === 'hi' ? ORDINAL_HI[n] ?? `${n}` : ordinal(n));

const star = (i: number, lang: PredictionLang) =>
  (lang === 'hi' ? NAKSHATRA_NAMES_HI[i]! : NAKSHATRA_NAMES_SA[i]!);

/** Panchang terms carry their Latin name on the object, so these map by name. */
const localise = (latin: string, lang: PredictionLang, table: readonly string[], source: readonly string[]) => {
  if (lang !== 'hi') return latin;
  const at = source.indexOf(latin);
  return at >= 0 ? table[at]! : latin;
};
const tithiName = (n: string, lang: PredictionLang) =>
  (lang === 'hi' ? FULL_NEW_HI[n] ?? localise(n, lang, TITHI_NAMES_HI, TITHI_NAMES) : n);
const yogaName = (n: string, lang: PredictionLang) => localise(n, lang, YOGA_NAMES_HI, YOGA_NAMES);
const karanaName = (n: string, lang: PredictionLang) => (lang === 'hi' ? KARANA_NAMES_HI[n] ?? n : n);
const pakshaName = (n: string, lang: PredictionLang) => (lang === 'hi' ? PAKSHA_HI[n] ?? n : n);
const taraName = (t: { number: number; name: string }, lang: PredictionLang) =>
  (lang === 'hi' ? TARA_NAMES_HI[t.number - 1]! : t.name);

function span(from: Date, kind: PredictionSpan): { from: Date; to: Date } {
  const start = new Date(from);
  if (kind === 'Day') {
    start.setHours(0, 0, 0, 0);
    return { from: start, to: new Date(start.getTime() + 86400000) };
  }
  if (kind === 'Month') {
    const s = new Date(start.getFullYear(), start.getMonth(), 1);
    return { from: s, to: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
  }
  const s = new Date(start.getFullYear(), 0, 1);
  return { from: s, to: new Date(start.getFullYear() + 1, 0, 1) };
}

/** Houses a graha owns and sits in, which is what it actually speaks about. */
function housesOf(chart: Kundali, graha: Graha): number[] {
  const houses = new Set<number>();
  const seat = chart.grahaBhava[graha];
  if (seat) houses.add(seat);
  for (let h = 1; h <= 12; h += 1) {
    const bhava = chart.bhavas[h - 1];
    if (bhava && bhava.lord === graha) houses.add(h);
  }
  return [...houses].sort((a, b) => a - b);
}

export type PredictionLang = 'en' | 'hi';

export interface PredictionOptions {
  /** Needed for the daily panchang; the birth place is the sensible default. */
  location?: GeoLocation;
  /**
   * Which language to compose the reading in.
   *
   * The sentences are built here rather than in the app because they are
   * assembled from the computed facts — the house a lord carries, the tara
   * number, the obstructing graha — and splitting that across a layer boundary
   * means composing the same sentence twice and watching the two drift.
   */
  lang?: PredictionLang;
}

export function predict(
  chart: Kundali,
  date: Date,
  kind: PredictionSpan,
  options: PredictionOptions = {},
): Prediction {
  const window = span(date, kind);
  const lang = options.lang ?? 'en';
  const hi = lang === 'hi';
  const w = WEIGHTS[kind];
  const factors: PredictionFactor[] = [];
  const conditions = allConditions(chart);
  const usableHouses = chart.birth.timeAccuracy !== 'Unknown';

  const add = (f: PredictionFactor) => { if (f.weight > 0) factors.push(f); };

  // --- the dasha, which is the frame everything else moves inside -----------
  const chain = dashaChainAt(chart, window.from, { depth: 2 });
  chain.forEach((period, level) => {
    const source = level === 0 ? 'Dasha' : 'Antardasha';
    const lord = period.lord;
    const condition = conditions[lord];
    const houses = usableHouses ? housesOf(chart, lord) : [];
    const strong = condition.exalted || condition.ownSign;
    const weak = condition.debilitated || condition.combust;
    const polarity: Polarity = strong ? 'Supportive' : weak ? 'Testing' : 'Mixed';
    const name = graha(lord, lang);
    const until = period.end.toISOString().slice(0, 10);

    const state = condition.exalted
      ? (hi ? 'यह उच्च का है, इसलिए अपना फल खुले हाथ देता है'
            : 'it is exalted here, so it gives what it has to give openly')
      : condition.ownSign
      ? (hi ? 'यह अपनी ही राशि में है, इसलिए फल स्थिर रहता है'
            : 'it sits in its own sign, so its results come steadily rather than in bursts')
      : condition.debilitated
      ? (hi ? 'यह नीच का है, इसलिए फल देर से और परिश्रम माँगकर आता है'
            : 'it is debilitated, so what it gives arrives late and asks for effort first')
      : condition.combust
      ? (hi ? 'यह अस्त है, इसलिए फल है तो सही, पर ढका हुआ'
            : 'it is combust, so the results are there but obscured, and often unrecognised')
      : (hi ? 'राशि इसे न बल देती है न घटाती, इसलिए शेष कुण्डली निर्णय करती है'
            : 'its sign neither strengthens nor weakens it, so the rest of the chart decides');

    const place = houses.length
      ? (hi
        ? ` यह ${houses.map((h) => nth(h, lang)).join(' और ')} भाव का स्वामी या उसमें स्थित है, `
          + `अतः इस काल का कार्यक्षेत्र वही है — ${houses.map((h) => houseMeaning(h, lang)).join('; ')}।`
        : ` It carries the ${houses.map((h) => nth(h, lang)).join(' and ')} house`
          + `${houses.length > 1 ? 's' : ''}, and that is where this period does its work: `
          + `${houses.map((h) => houseMeaning(h, lang)).join('; ')}.`)
      : '';

    add({
      source,
      subject: hi
        ? `${name} ${level === 0 ? 'महादशा' : 'अन्तर्दशा'}`
        : `${name} ${level === 0 ? 'mahadasha' : 'antardasha'}`,
      polarity,
      weight: w[source],
      houses,
      text: hi
        ? `इस समय ${name} की ${level === 0 ? 'महादशा' : 'अन्तर्दशा'} चल रही है, ${until} तक। `
          + `आपकी कुण्डली में ${state}।${place}`
        : `${name} is running as the ${level === 0 ? 'major period' : 'sub-period'}, until ${until}. `
          + `In your chart ${state}.${place}`,
    });
  });

  // --- gochar: where the slow grahas stand from the natal Moon --------------
  if (w.Gochar > 0) {
    const transits = transitReport(chart, window.from, chart.settings.ayanamsa);
    const slow: Graha[] = kind === 'Day'
      ? ['Moon', 'Sun', 'Mars', 'Mercury', 'Venus', 'Jupiter', 'Saturn']
      : ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];

    for (const t of transits.filter((x) => slow.includes(x.graha))) {
      const blocked = Boolean(t.obstructedBy);
      const polarity: Polarity = t.favourable && !blocked ? 'Supportive'
        : t.favourable && blocked ? 'Mixed'
        : NATURAL_BENEFICS.includes(t.graha) ? 'Mixed' : 'Testing';
      const name = graha(t.graha, lang);
      const sign = rashi(t.rashi, lang);

      const verdict = t.favourable && !blocked
        ? (hi ? 'यह गोचर शुभ माना गया है।' : 'The tradition counts this transit as favourable.')
        : t.favourable && blocked
        ? (hi ? `शुभ तो है, पर ${graha(t.obstructedBy!, lang)} का वेध इसे रोक रहा है — फल आता है, पूरा नहीं।`
              : `It is a favourable placement, but ${graha(t.obstructedBy!, lang)} obstructs it by vedha, `
                + 'so the result comes through partly rather than wholly.')
        : (hi ? 'यह स्थान इस ग्रह के लिए अनुकूल नहीं गिना जाता; धैर्य से काम लें।'
              : 'This is not among the houses the tradition favours for it, so expect friction rather than ease.');

      const bindu = t.bindus !== null
        ? (hi ? ` उस राशि में आपके ${t.bindus} बिन्दु हैं${t.bindus >= 4 ? ', जो सहारा देते हैं' : ', जो कम हैं'}।`
              : ` You hold ${t.bindus} bindus there`
                + `${t.bindus >= 4 ? ', which supports it' : ', which is on the low side'}.`)
        : '';

      add({
        source: 'Gochar',
        subject: hi ? `${name} ${sign} में` : `${name} in ${sign}`,
        polarity,
        weight: w.Gochar * (t.graha === 'Saturn' || t.graha === 'Jupiter' ? 1 : 0.6),
        houses: usableHouses ? [t.houseFromLagna] : [],
        text: hi
          ? `${name} ${sign} में चल रहा है, जो आपके चन्द्र से ${nth(t.houseFromMoon, lang)} स्थान है।`
            + `${bindu} ${verdict}`
          : `${name} is transiting ${sign}, the ${nth(t.houseFromMoon, lang)} from your Moon.`
            + `${bindu} ${verdict}`,
      });
    }
  }

  // --- Sade Sati, which people ask about by name ---------------------------
  if (w.SadeSati > 0) {
    const status = sadeSatiStatus(chart, window.from);
    if (status.active && status.phase) {
      const phaseHi: Record<string, string> = {
        Rising: 'आरम्भ', Peak: 'मध्य', Setting: 'उतार',
      };
      add({
        source: 'SadeSati',
        subject: hi ? `साढ़े साती, ${phaseHi[status.phase]} चरण` : `Sade Sati, ${status.phase.toLowerCase()} phase`,
        polarity: 'Testing',
        weight: w.SadeSati,
        houses: [],
        text: hi
          ? `शनि की साढ़े सात वर्ष की यात्रा आपके चन्द्र पर चल रही है, ${phaseHi[status.phase]} चरण में। `
            + 'यह धैर्य और सीधे परिश्रम की माँग करती है। यह सबके जीवन में बारी-बारी आती है — '
            + 'यह जीवन की एक अवस्था है, आप पर कोई निर्णय नहीं।'
          : `Saturn's seven-and-a-half year passage over your Moon is running, in its `
            + `${status.phase.toLowerCase()} phase. It asks for patience and plain work. `
            + 'It comes to everyone in turn — it is a stage of life, not a verdict on you.',
      });
    }
  }

  // --- the day itself ------------------------------------------------------
  if (kind === 'Day') {
    const location = options.location ?? chart.birth.location;
    const panchang = computePanchang(window.from, location, { ayanamsa: chart.settings.ayanamsa });
    const tara = taraBala(chart, panchang.nakshatra.index);
    // The nakshatra limb is the Moon's longitude in another unit: index plus the
    // fraction elapsed, times the 13 degrees 20 minutes each one spans.
    const moonLongitude = (panchang.nakshatra.index + panchang.nakshatra.elapsed) * (360 / 27);
    const chandra = chandraBala(chart, Math.floor(moonLongitude / 30) as RashiIndex);
    const starName = star(panchang.nakshatra.index, lang);
    const taraLabel = taraName(tara, lang);

    add({
      source: 'TaraBala',
      subject: hi ? `${taraLabel} तारा` : `${tara.name} tara`,
      polarity: tara.favourable ? 'Supportive' : 'Testing',
      weight: w.TaraBala,
      houses: [],
      text: hi
        ? `आज चन्द्रमा ${starName} नक्षत्र में है, जो आपके जन्म नक्षत्र से ${taraLabel} तारा बनता है — `
          + (tara.favourable
            ? 'यह अनुकूल ताराओं में है। जो करना है आज कीजिए, टालिए मत।'
            : 'परम्परा इसे बाधक मानती है। आज जो चल रहा है उसी को आगे बढ़ाइए; नया महत्वपूर्ण काम कल के लिए रखिए।')
        : `The Moon runs ${starName} today, which makes ${tara.name} tara counted from your birth star — `
          + (tara.favourable
            ? 'one of the supportive ones. Begin what you have been putting off rather than waiting further.'
            : 'one the tradition treats as obstructive. Carry on with what is already running, '
              + 'and leave anything that matters for another day.'),
    });

    add({
      source: 'ChandraBala',
      subject: hi ? `चन्द्र आपके चन्द्र से ${nth(chandra.houseFromMoon, lang)} स्थान में`
        : `Moon in the ${nth(chandra.houseFromMoon, lang)} from your Moon`,
      polarity: chandra.favourable ? 'Supportive' : 'Testing',
      weight: w.ChandraBala,
      houses: [],
      text: hi
        ? `चन्द्रमा आपके जन्म-चन्द्र से ${nth(chandra.houseFromMoon, lang)} स्थान में है, `
          + (chandra.favourable
            ? 'जिसे परम्परा हर आरम्भ के लिए सहायक मानती है।'
            : 'जो आरम्भ के लिए शुभ गिने जाने वाले स्थानों में नहीं है।')
        : `The Moon stands in the ${nth(chandra.houseFromMoon, lang)} from your natal Moon, `
          + (chandra.favourable
            ? 'which the tradition counts as supporting whatever you take up.'
            : 'which is not among the houses it favours for starting something new.'),
    });

    const rahu = panchang.rahuKaal
      ? (hi
        ? `राहु काल ${fmtTime(panchang.rahuKaal.start, location.timezone)} से `
          + `${fmtTime(panchang.rahuKaal.end, location.timezone)} तक — नए काम के लिए यही एक समय है `
          + 'जिससे बचने पर सब सहमत हैं।'
        : `Rahu Kaal runs ${fmtTime(panchang.rahuKaal.start, location.timezone)} to `
          + `${fmtTime(panchang.rahuKaal.end, location.timezone)} — the one window the tradition `
          + 'is unanimous about leaving alone for anything new.')
      : (hi ? 'इस अक्षांश पर इस तिथि को सूर्य उदय-अस्त नहीं होता, अतः राहु काल नहीं निकाला जा सकता।'
            : 'Rahu Kaal cannot be placed here: the Sun does not rise and set on this date at this latitude.');

    add({
      source: 'Panchang',
      subject: hi
        ? `${tithiName(panchang.tithi.name, lang)} तिथि, ${yogaName(panchang.yoga.name, lang)} योग`
        : `${panchang.tithi.name}, ${panchang.yoga.name} yoga`,
      polarity: 'Mixed',
      weight: w.Panchang,
      houses: [],
      text: hi
        ? `${pakshaName(panchang.tithi.paksha, lang)} पक्ष की ${tithiName(panchang.tithi.name, lang)} तिथि, `
          + `${yogaName(panchang.yoga.name, lang)} योग, ${karanaName(panchang.karana.name, lang)} करण। ${rahu}`
        : `${panchang.tithi.name} tithi of the ${panchang.tithi.paksha} paksha, `
          + `${panchang.yoga.name} yoga, ${panchang.karana.name} karana. ${rahu}`,
    });
  }

  // --- the balance ---------------------------------------------------------
  const signed = factors.map((f) => (f.polarity === 'Supportive' ? 1 : f.polarity === 'Testing' ? -1 : 0) * f.weight);
  const total = factors.reduce((sum, f) => sum + f.weight, 0);
  const tenor = total > 0 ? signed.reduce((a, b) => a + b, 0) / total : 0;

  // --- which houses this period actually touches ---------------------------
  const emphasis = new Map<number, number>();
  for (const f of factors) {
    const sign = f.polarity === 'Supportive' ? 1 : f.polarity === 'Testing' ? -1 : 0;
    for (const house of f.houses) {
      emphasis.set(house, (emphasis.get(house) ?? 0) + sign * f.weight);
    }
  }
  const areas = [...emphasis.entries()]
    .map(([house, value]) => ({ house, emphasis: value }))
    .filter((a) => a.emphasis !== 0)
    .sort((a, b) => Math.abs(b.emphasis) - Math.abs(a.emphasis))
    .slice(0, 4);

  return {
    span: kind,
    from: window.from,
    to: window.to,
    tenor,
    factors: factors.sort((a, b) => b.weight - a.weight),
    areas,
    quiet: factors.length === 0,
  };
}

function fmtTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
}
