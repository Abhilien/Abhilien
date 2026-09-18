/**
 * Dosha rules.
 *
 * Doshas are where an astrology product does the most harm if it is careless,
 * because they are what gets sold back to frightened people as expensive
 * remedies. Two deliberate choices follow from that:
 *
 *  1. Every dosha reports its classical cancellations alongside the finding, and
 *     the engine marks a dosha `cancelled` when one applies. Most charts that
 *     "have" Mangal dosha have it cancelled, and a reading that omits this is
 *     not a simplification, it is a falsehood.
 *  2. Effects are stated as what the texts say, in the register of tendency, not
 *     as predictions about a person's marriage or lifespan.
 */
import type { Rule } from './types.js';
import type { Graha, BhavaNumber, RashiIndex } from '../core/types.js';
import { norm360, forwardArc } from '../core/angle.js';
import { RASHI_NAMES_SA, GRAHA_NAMES_EN } from '../core/constants.js';
import { ordinal, listSentence } from '../core/format.js';

const houses = (...h: number[]) => h as BhavaNumber[];

/** Houses from which Mars is held to cause the dosha. */
const MANGAL_HOUSES: BhavaNumber[] = houses(1, 2, 4, 7, 8, 12);

export const MANGAL_DOSHA: Rule = {
  id: 'mangal-dosha',
  name: 'Mangal Dosha (Kuja Dosha)',
  nameHi: 'मंगल दोष',
  category: 'Dosha',
  polarity: 'Difficult',
  citation: {
    work: 'Brihat Parashara Hora Shastra and later commentaries',
    locus: 'Ch. 81, and Jataka Parijata Ch. 7',
    tradition: 'Parashari',
    contested:
      'The house list itself is disputed. Most of North India counts the 1st, 2nd, 4th, 7th, 8th '
      + 'and 12th; much of South India omits the 2nd; some traditions add the 5th. The dosha is '
      + 'also judged from the Moon and from Venus, not only from the lagna. All three reference '
      + 'points are reported below rather than collapsed into a single yes or no.',
  },
  classicalEffect:
    'Classically read as friction and delay in marriage, and as a temperament that needs an '
    + 'equally robust partner. Texts treat it as cancelled in a large fraction of charts, and as '
    + 'irrelevant when both partners carry it.',
  evaluate(c) {
    const fromLagna = c.house('Mars');
    const fromMoon = c.houseFrom('Moon', 'Mars') as BhavaNumber;
    const fromVenus = c.houseFrom('Venus', 'Mars') as BhavaNumber;

    const references = [
      { label: 'the lagna', house: fromLagna },
      { label: 'the Moon', house: fromMoon },
      { label: 'Venus', house: fromVenus },
    ].filter((r) => MANGAL_HOUSES.includes(r.house));

    if (references.length === 0) return null;

    const marsSign = c.rashi('Mars');
    // The classical cancellations (Kuja dosha bhanga).
    const cancellations = [
      {
        description: 'Mars is in its own sign (Mesha or Vrischika) or exalted in Makara.',
        present: c.isOwnSign('Mars') || c.isExalted('Mars'),
      },
      {
        description: 'Jupiter aspects or is conjunct Mars.',
        present: c.associated('Jupiter', 'Mars'),
      },
      {
        description: 'Mars occupies a sign of Mercury (Mithuna or Kanya), whose mildness is held to absorb the dosha.',
        present: marsSign === 2 || marsSign === 5,
      },
      {
        description: 'Mars is in the 2nd house in a sign of Mercury, a specifically named exemption.',
        present: fromLagna === 2 && (marsSign === 2 || marsSign === 5),
      },
      {
        description: 'Mars is in the 4th house in its own sign, a specifically named exemption.',
        present: fromLagna === 4 && (marsSign === 0 || marsSign === 7),
      },
      {
        description: 'Mars is in the 7th house in Makara or Karka, a specifically named exemption.',
        present: fromLagna === 7 && (marsSign === 9 || marsSign === 3),
      },
      {
        description: 'Mars is in the 12th house in Vrishabha or Tula, a specifically named exemption.',
        present: fromLagna === 12 && (marsSign === 1 || marsSign === 6),
      },
      {
        description: 'The Moon occupies a kendra from Mars.',
        present: c.isKendra(c.houseFrom('Mars', 'Moon')),
      },
    ];

    return {
      grahas: ['Mars'],
      houses: references.map((r) => r.house),
      // Judged from all three reference points, so a dosha present from only one
      // is genuinely weaker than one present from all three.
      strength: references.length / 3,
      detail: `Mars occupies `
        + listSentence(references.map((r) => `the ${ordinal(r.house)} from ${r.label}`))
        + `, in ${RASHI_NAMES_SA[marsSign]}.`,
      cancellations,
    };
  },
};

/** The twelve named forms of Kaal Sarp, by the house Rahu occupies. */
const KAAL_SARP_NAMES: Record<number, string> = {
  1: 'Anant', 2: 'Kulik', 3: 'Vasuki', 4: 'Shankhpal', 5: 'Padma', 6: 'Mahapadma',
  7: 'Takshak', 8: 'Karkotak', 9: 'Shankhachood', 10: 'Ghatak', 11: 'Vishdhar', 12: 'Sheshnag',
};

export const KAAL_SARP_DOSHA: Rule = {
  id: 'kaal-sarp',
  name: 'Kaal Sarp Dosha',
  nameHi: 'काल सर्प दोष',
  category: 'Dosha',
  polarity: 'Difficult',
  citation: {
    work: 'Later compilations; not found in Brihat Parashara Hora Shastra',
    tradition: 'FolkPractice',
    contested:
      'This dosha does not appear in the classical Parashari corpus and is a comparatively modern '
      + 'formulation. It is reported because users ask for it and because it is heavily marketed, '
      + 'but its provenance is stated plainly rather than dressed up as ancient authority.',
  },
  classicalEffect:
    'Held to indicate effort meeting repeated obstruction, and results arriving later than '
    + 'expected. Later texts treat a partial formation as considerably milder.',
  evaluate(c) {
    const rahu = c.chart.positions.Rahu.longitude;
    const ketu = c.chart.positions.Ketu.longitude;

    // Every physical graha must lie within the same 180 degree arc, measured
    // forward from Rahu to Ketu.
    const withinRahuToKetu = c.trueGrahas.every(
      (g) => forwardArc(rahu, c.chart.positions[g].longitude) < 180,
    );
    const withinKetuToRahu = c.trueGrahas.every(
      (g) => forwardArc(ketu, c.chart.positions[g].longitude) < 180,
    );
    if (!withinRahuToKetu && !withinKetuToRahu) return null;

    // A graha within a degree of either node is conventionally held to break
    // the formation, since it is effectively on the axis rather than inside it.
    const onAxis = c.trueGrahas.filter((g) => {
      const lon = c.chart.positions[g].longitude;
      return Math.min(
        Math.abs(norm360(lon - rahu)), 360 - Math.abs(norm360(lon - rahu)),
        Math.abs(norm360(lon - ketu)), 360 - Math.abs(norm360(lon - ketu)),
      ) < 1;
    });

    const rahuHouse = c.house('Rahu');
    return {
      grahas: ['Rahu', 'Ketu'],
      houses: houses(rahuHouse, c.house('Ketu')),
      strength: onAxis.length > 0 ? 0.5 : 1,
      detail: `All seven physical grahas lie on one side of the Rahu-Ketu axis. With Rahu in the `
        + `${ordinal(rahuHouse)} house this is the ${KAAL_SARP_NAMES[rahuHouse]} form.`,
      cancellations: [{
        description: onAxis.length > 0
          ? `${onAxis.map((g) => GRAHA_NAMES_EN[g]).join(', ')} sits within a degree of the axis, `
            + 'which is conventionally held to break the formation.'
          : 'No graha sits on the axis to break the formation.',
        present: onAxis.length > 0,
      }],
    };
  },
};

export const OTHER_DOSHAS: Rule[] = [
  {
    id: 'guru-chandal',
    name: 'Guru Chandal Yoga',
    nameHi: 'गुरु चांडाल योग',
    category: 'Dosha',
    polarity: 'Difficult',
    citation: { work: 'Later commentaries on Parashara', tradition: 'Parashari' },
    classicalEffect:
      'Jupiter with a node is read as unconventional judgement: strong conviction that may run '
      + 'ahead of received wisdom. Texts note both misjudgement and originality.',
    evaluate(c) {
      const node: Graha | undefined = c.conjunct('Jupiter', 'Rahu') ? 'Rahu'
        : c.conjunct('Jupiter', 'Ketu') ? 'Ketu' : undefined;
      if (!node) return null;
      return {
        grahas: ['Jupiter', node],
        houses: houses(c.house('Jupiter')),
        strength: 1,
        detail: `Jupiter is conjunct ${GRAHA_NAMES_EN[node]} in ${RASHI_NAMES_SA[c.rashi('Jupiter')]}.`,
        cancellations: [{
          description: 'Jupiter is dignified, which classical commentaries hold to mitigate the combination.',
          present: c.isDignified('Jupiter'),
        }],
      };
    },
  },
  {
    id: 'angarak',
    name: 'Angarak Yoga',
    nameHi: 'अंगारक योग',
    category: 'Dosha',
    polarity: 'Difficult',
    citation: { work: 'Later commentaries', tradition: 'FolkPractice' },
    classicalEffect: 'Mars with a node is read as impulsive force and a short fuse under pressure.',
    evaluate(c) {
      const node: Graha | undefined = c.conjunct('Mars', 'Rahu') ? 'Rahu'
        : c.conjunct('Mars', 'Ketu') ? 'Ketu' : undefined;
      if (!node) return null;
      return {
        grahas: ['Mars', node],
        houses: houses(c.house('Mars')),
        strength: 1,
        detail: `Mars is conjunct ${GRAHA_NAMES_EN[node]} in ${RASHI_NAMES_SA[c.rashi('Mars')]}.`,
      };
    },
  },
  {
    id: 'grahan-dosha',
    name: 'Grahan Dosha',
    nameHi: 'ग्रहण दोष',
    category: 'Dosha',
    polarity: 'Difficult',
    citation: { work: 'Later commentaries', tradition: 'FolkPractice' },
    classicalEffect:
      'A luminary with a node is read as a dimming of its significations — vitality for the Sun, '
      + 'emotional steadiness for the Moon.',
    evaluate(c) {
      const afflicted: { graha: Graha; node: Graha }[] = [];
      for (const luminary of ['Sun', 'Moon'] as Graha[]) {
        for (const node of ['Rahu', 'Ketu'] as Graha[]) {
          if (c.conjunct(luminary, node)) afflicted.push({ graha: luminary, node });
        }
      }
      if (afflicted.length === 0) return null;
      return {
        grahas: afflicted.flatMap((a) => [a.graha, a.node]),
        strength: 1,
        detail: afflicted.map((a) =>
          `${GRAHA_NAMES_EN[a.graha]} is conjunct ${GRAHA_NAMES_EN[a.node]}`).join('; ') + '.',
        cancellations: [{
          description: 'A benefic aspects the combination, which commentaries hold to relieve it.',
          present: afflicted.some((a) => c.benefics().some((b) => c.aspects(b, a.graha))),
        }],
      };
    },
  },
  {
    id: 'shakat',
    name: 'Shakat Yoga',
    nameHi: 'शकट योग',
    category: 'AristaYoga',
    polarity: 'Difficult',
    citation: {
      work: 'Brihat Parashara Hora Shastra', locus: 'Ch. 36', tradition: 'Parashari',
      contested: 'Void when Jupiter or the Moon occupies a kendra from the lagna, per most commentaries.',
    },
    classicalEffect:
      'Read as fortune that rises and falls rather than holding steady — the "cart wheel" image.',
    evaluate(c) {
      const offset = c.houseFrom('Jupiter', 'Moon');
      if (![6, 8, 12].includes(offset)) return null;
      const exempt = c.inKendra('Jupiter') || c.inKendra('Moon');
      return {
        grahas: ['Moon', 'Jupiter'],
        strength: 1,
        detail: `The Moon is in the ${ordinal(offset)} from Jupiter.`,
        cancellations: [{
          description: 'Jupiter or the Moon occupies a kendra from the lagna, which voids the yoga.',
          present: exempt,
        }],
      };
    },
  },
  {
    id: 'daridra',
    name: 'Daridra Yoga',
    nameHi: 'दरिद्र योग',
    category: 'AristaYoga',
    polarity: 'Difficult',
    citation: { work: 'Phaladeepika', locus: 'Ch. 6', tradition: 'Parashari' },
    classicalEffect:
      'The lord of gains falling into a house of loss is read as income that leaks away rather '
      + 'than accumulating.',
    evaluate(c) {
      const eleventhLord = c.lordOf(11 as BhavaNumber);
      const placed = c.house(eleventhLord);
      if (![6, 8, 12].includes(placed)) return null;
      return {
        grahas: [eleventhLord],
        houses: houses(placed),
        strength: 1,
        detail: `${GRAHA_NAMES_EN[eleventhLord]}, lord of the 11th, occupies the ${ordinal(placed)} house.`,
        cancellations: [{
          description: 'The lord is dignified there, which classical texts hold to blunt the result.',
          present: c.isDignified(eleventhLord),
        }],
      };
    },
  },
  {
    id: 'pitra-dosha',
    name: 'Pitra Dosha',
    nameHi: 'पितृ दोष',
    category: 'Dosha',
    polarity: 'Difficult',
    citation: {
      work: 'Later compilations', tradition: 'FolkPractice',
      contested:
        'Widely used in practice but not a Parashari category. Definitions vary considerably; the '
        + 'one applied here is affliction of the 9th house and its lord by the Sun or a node.',
    },
    classicalEffect:
      'Read as unfinished obligation carried from the paternal line, and as a distance from '
      + 'inherited fortune that has to be made up by one\'s own effort.',
    evaluate(c) {
      const ninthLord = c.lordOf(9 as BhavaNumber);
      const afflictors = (['Sun', 'Rahu', 'Ketu', 'Saturn'] as Graha[]).filter(
        (g) => c.house(g) === 9 || c.conjunct(g, ninthLord),
      );
      if (afflictors.length === 0) return null;
      return {
        grahas: afflictors,
        houses: houses(9),
        strength: Math.min(1, afflictors.length / 2),
        detail: `${listSentence(afflictors.map((g) => GRAHA_NAMES_EN[g]))} afflicts the 9th house `
          + `or its lord ${GRAHA_NAMES_EN[ninthLord]}.`,
        cancellations: [{
          description: 'Jupiter aspects the 9th house, which is held to relieve the affliction.',
          present: c.aspecting(9 as BhavaNumber).includes('Jupiter'),
        }],
      };
    },
  },
];

export const ALL_DOSHA_RULES: Rule[] = [MANGAL_DOSHA, KAAL_SARP_DOSHA, ...OTHER_DOSHAS];

/** Sign names re-exported for rule detail strings. */
export { RASHI_NAMES_SA as _RASHI_NAMES_SA };
export type { RashiIndex as _RashiIndex };
