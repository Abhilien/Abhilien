/**
 * Yoga rules.
 *
 * Each rule is a small pure predicate plus a citation. The set below is a
 * correct, well-attested core rather than an exhaustive catalogue: a hundred
 * rules that fire correctly are worth more than three hundred that fire
 * approximately, and adding a rule here is a dozen lines. Where a yoga is
 * defined differently by different authorities, the citation says so instead of
 * the code quietly picking a side.
 */
import type { Rule } from './types.js';
import type { ChartContext } from './context.js';
import type { Graha, BhavaNumber } from '../core/types.js';
import { RASHI_NAMES_SA, GRAHA_NAMES_EN } from '../core/constants.js';
import { ordinal, listSentence, agrees } from '../core/format.js';

const BPHS = (locus: string) => ({
  work: 'Brihat Parashara Hora Shastra', locus, tradition: 'Parashari' as const,
});

const houses = (...h: number[]) => h as BhavaNumber[];

// ---------------------------------------------------------------------------
// Panch Mahapurusha yogas
// ---------------------------------------------------------------------------

/**
 * The five "great person" yogas. Each needs its graha both dignified (own sign
 * or exalted) and in a kendra from the lagna. Both halves are required: a
 * dignified graha in the 6th forms no mahapurusha yoga.
 */
function mahapurusha(
  id: string, name: string, nameHi: string, graha: Graha, effect: string,
): Rule {
  return {
    id, name, nameHi,
    category: 'MahapurushaYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 75, Panch Mahapurusha Yoga'),
    classicalEffect: effect,
    evaluate(c) {
      if (!c.inKendra(graha)) return null;
      const exalted = c.isExalted(graha);
      const own = c.isOwnSign(graha) || c.isMoolatrikona(graha);
      if (!exalted && !own) return null;
      return {
        grahas: [graha],
        houses: houses(c.house(graha)),
        strength: exalted ? 1 : 0.85,
        detail: `${GRAHA_NAMES_EN[graha]} is ${exalted ? 'exalted' : 'in its own sign'} `
          + `in ${RASHI_NAMES_SA[c.rashi(graha)]}, occupying the ${ordinal(c.house(graha))} house, a kendra.`,
      };
    },
  };
}

export const MAHAPURUSHA_YOGAS: Rule[] = [
  mahapurusha('ruchaka', 'Ruchaka Yoga', 'रुचक योग', 'Mars',
    'Classically associated with physical courage, command and a martial disposition.'),
  mahapurusha('bhadra', 'Bhadra Yoga', 'भद्र योग', 'Mercury',
    'Classically associated with intelligence, learning and skill in speech and trade.'),
  mahapurusha('hamsa', 'Hamsa Yoga', 'हंस योग', 'Jupiter',
    'Classically associated with wisdom, moral standing and respect from others.'),
  mahapurusha('malavya', 'Malavya Yoga', 'मालव्य योग', 'Venus',
    'Classically associated with refinement, comfort, artistic sense and attractiveness.'),
  mahapurusha('sasa', 'Sasa Yoga', 'शश योग', 'Saturn',
    'Classically associated with authority over others, endurance and leadership won by effort.'),
];

// ---------------------------------------------------------------------------
// Lunar yogas
// ---------------------------------------------------------------------------

/** Grahas other than the Sun and the nodes, which these rules exclude. */
function lunarCompanions(c: ChartContext, offsetFromMoon: number): Graha[] {
  return c.trueGrahas.filter(
    (g) => g !== 'Moon' && g !== 'Sun' && c.houseFrom('Moon', g) === offsetFromMoon,
  );
}

export const LUNAR_YOGAS: Rule[] = [
  {
    id: 'gaja-kesari',
    name: 'Gaja Kesari Yoga',
    nameHi: 'गजकेसरी योग',
    category: 'ChandraYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 36'),
    classicalEffect:
      'Said to give lasting reputation, discernment and support from people of standing.',
    evaluate(c) {
      if (!c.inKendraFrom('Jupiter', 'Moon')) return null;
      // Classical commentaries qualify the yoga heavily when Jupiter is weak.
      const weak = c.isDebilitated('Jupiter') || c.isCombust('Jupiter');
      return {
        grahas: ['Jupiter', 'Moon'],
        houses: houses(c.house('Jupiter'), c.house('Moon')),
        strength: weak ? 0.4 : c.isDignified('Jupiter') ? 1 : 0.8,
        detail: `Jupiter is in the ${ordinal(c.houseFrom('Moon', 'Jupiter'))} house from the Moon, a kendra.`,
        cancellations: [{
          description: 'Jupiter is debilitated or combust, which commentaries hold to weaken the yoga severely.',
          present: weak,
        }],
      };
    },
  },
  {
    id: 'sunapha',
    name: 'Sunapha Yoga',
    nameHi: 'सुनफा योग',
    category: 'ChandraYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 36, Chandra Yogas'),
    classicalEffect: 'Associated with self-earned wealth and standing built by one\'s own effort.',
    evaluate(c) {
      const companions = lunarCompanions(c, 2);
      if (companions.length === 0) return null;
      return {
        grahas: ['Moon', ...companions],
        strength: 1,
        detail: `${listSentence(companions.map((g) => GRAHA_NAMES_EN[g]))} `
          + `${agrees(companions.length, 'occupies', 'occupy')} the 2nd from the Moon.`,
      };
    },
  },
  {
    id: 'anapha',
    name: 'Anapha Yoga',
    nameHi: 'अनफा योग',
    category: 'ChandraYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 36, Chandra Yogas'),
    classicalEffect: 'Associated with good health, a pleasant nature and freedom from want.',
    evaluate(c) {
      const companions = lunarCompanions(c, 12);
      if (companions.length === 0) return null;
      return {
        grahas: ['Moon', ...companions],
        strength: 1,
        detail: `${listSentence(companions.map((g) => GRAHA_NAMES_EN[g]))} `
          + `${agrees(companions.length, 'occupies', 'occupy')} the 12th from the Moon.`,
      };
    },
  },
  {
    id: 'durudhara',
    name: 'Durudhara Yoga',
    nameHi: 'दुरुधरा योग',
    category: 'ChandraYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 36, Chandra Yogas'),
    classicalEffect: 'Associated with resources on both sides of life and generous circumstances.',
    evaluate(c) {
      const before = lunarCompanions(c, 12);
      const after = lunarCompanions(c, 2);
      if (before.length === 0 || after.length === 0) return null;
      return {
        grahas: ['Moon', ...before, ...after],
        strength: 1,
        detail: 'The Moon is flanked by grahas in both the 2nd and the 12th from it.',
      };
    },
  },
  {
    id: 'kemadruma',
    name: 'Kemadruma Yoga',
    nameHi: 'केमद्रुम योग',
    category: 'AristaYoga',
    polarity: 'Difficult',
    citation: BPHS('Ch. 36, Chandra Yogas'),
    classicalEffect:
      'Described as isolation of the mind and effort unsupported by circumstance. Classical '
      + 'texts treat it as readily cancelled, and the cancellations are checked below.',
    evaluate(c) {
      const isolated = lunarCompanions(c, 2).length === 0
        && lunarCompanions(c, 12).length === 0
        && c.companions('Moon').filter((g) => g !== 'Sun' && g !== 'Rahu' && g !== 'Ketu').length === 0;
      if (!isolated) return null;

      // The standard cancellations (kemadruma bhanga).
      const kendraFromMoon = c.trueGrahas.some(
        (g) => g !== 'Moon' && c.isKendra(c.houseFrom('Moon', g)),
      );
      const kendraFromLagna = c.trueGrahas.some((g) => g !== 'Moon' && c.inKendra(g));
      const moonStrong = c.isDignified('Moon') || c.inKendra('Moon');

      const cancellations = [
        { description: 'A graha occupies a kendra from the Moon.', present: kendraFromMoon },
        { description: 'A graha occupies a kendra from the lagna.', present: kendraFromLagna },
        { description: 'The Moon is itself dignified or in a kendra.', present: moonStrong },
      ];

      return {
        grahas: ['Moon'],
        houses: houses(c.house('Moon')),
        strength: 1,
        detail: 'No graha other than the Sun and the nodes stands with, before or after the Moon.',
        cancellations,
      };
    },
  },
  {
    id: 'adhi-yoga',
    name: 'Adhi Yoga',
    nameHi: 'अधि योग',
    category: 'ChandraYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 36'),
    classicalEffect: 'Associated with authority, dependable allies and material security.',
    evaluate(c) {
      const found = c.benefics().filter((g) => [6, 7, 8].includes(c.houseFrom('Moon', g)));
      if (found.length === 0) return null;
      return {
        grahas: ['Moon', ...found],
        strength: found.length >= 3 ? 1 : found.length === 2 ? 0.75 : 0.5,
        detail: `${listSentence(found.map((g) => GRAHA_NAMES_EN[g]))} `
          + `${agrees(found.length, 'occupies', 'occupy')} the 6th, 7th or 8th from the Moon.`,
      };
    },
  },
  {
    id: 'chandra-mangala',
    name: 'Chandra-Mangala Yoga',
    nameHi: 'चन्द्र-मंगल योग',
    category: 'DhanaYoga',
    polarity: 'Mixed',
    citation: BPHS('Ch. 36'),
    classicalEffect:
      'Associated with earning capacity and enterprise, and with a blunt manner that classical '
      + 'texts note alongside the gain.',
    evaluate(c) {
      if (!c.associated('Moon', 'Mars')) return null;
      return {
        grahas: ['Moon', 'Mars'],
        strength: c.conjunct('Moon', 'Mars') ? 1 : 0.7,
        detail: c.conjunct('Moon', 'Mars')
          ? `The Moon and Mars are together in ${RASHI_NAMES_SA[c.rashi('Moon')]}.`
          : 'The Moon and Mars aspect each other.',
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Raja and Dhana yogas
// ---------------------------------------------------------------------------

export const RAJA_DHANA_YOGAS: Rule[] = [
  {
    id: 'raja-yoga-kendra-trikona',
    name: 'Raja Yoga (kendra-trikona association)',
    nameHi: 'राज योग',
    category: 'RajaYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 39, Raja Yoga Adhyaya'),
    classicalEffect:
      'The central yoga of rulership: authority, position and the means to act on it.',
    evaluate(c) {
      const kendraLords = new Set([1, 4, 7, 10].map((h) => c.lordOf(h as BhavaNumber)));
      const trikonaLords = new Set([1, 5, 9].map((h) => c.lordOf(h as BhavaNumber)));

      const pairs: { a: Graha; b: Graha; how: string }[] = [];
      for (const a of kendraLords) {
        for (const b of trikonaLords) {
          if (a === b) continue;
          if (c.conjunct(a, b)) pairs.push({ a, b, how: 'conjunction' });
          else if (c.mutualAspect(a, b)) pairs.push({ a, b, how: 'mutual aspect' });
          else if (c.exchange(a, b)) pairs.push({ a, b, how: 'exchange of signs' });
        }
      }
      if (pairs.length === 0) return null;

      const best = pairs[0]!;
      return {
        grahas: [...new Set(pairs.flatMap((p) => [p.a, p.b]))],
        strength: Math.min(1, 0.6 + 0.2 * pairs.length),
        detail: `${GRAHA_NAMES_EN[best.a]} and ${GRAHA_NAMES_EN[best.b]}, lords of a kendra and a `
          + `trikona, are linked by ${best.how}`
          + (pairs.length > 1 ? `, among ${pairs.length} such links.` : '.'),
      };
    },
  },
  {
    id: 'yogakaraka-strong',
    name: 'Yogakaraka in strength',
    category: 'RajaYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 34'),
    classicalEffect:
      'A single graha owning both a kendra and a trikona carries the Raja Yoga by itself.',
    evaluate(c) {
      const yogakaraka = c.trueGrahas.find((g) => c.isYogakaraka(g));
      if (!yogakaraka) return null;
      const strong = c.isDignified(yogakaraka) || c.inKendra(yogakaraka) || c.inTrikona(yogakaraka);
      if (!strong) return null;
      return {
        grahas: [yogakaraka],
        houses: houses(c.house(yogakaraka)),
        strength: c.isDignified(yogakaraka) ? 1 : 0.75,
        detail: `${GRAHA_NAMES_EN[yogakaraka]} is the yogakaraka for this lagna and occupies the `
          + `${c.house(yogakaraka)} house.`,
      };
    },
  },
  {
    id: 'dhana-yoga',
    name: 'Dhana Yoga',
    nameHi: 'धन योग',
    category: 'DhanaYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 40, Dhana Yoga Adhyaya'),
    classicalEffect: 'Association of the wealth-giving lords, indicating accumulation of resources.',
    evaluate(c) {
      const wealthHouses: BhavaNumber[] = houses(2, 5, 9, 11);
      const lords = wealthHouses.map((h) => ({ house: h, lord: c.lordOf(h) }));
      const links: string[] = [];
      const involved = new Set<Graha>();

      for (let i = 0; i < lords.length; i++) {
        for (let j = i + 1; j < lords.length; j++) {
          const a = lords[i]!, b = lords[j]!;
          if (a.lord === b.lord) continue;
          if (c.conjunct(a.lord, b.lord) || c.mutualAspect(a.lord, b.lord) || c.exchange(a.lord, b.lord)) {
            links.push(`the ${ordinal(a.house)} and the ${ordinal(b.house)}`);
            involved.add(a.lord); involved.add(b.lord);
          }
        }
      }
      if (links.length === 0) return null;
      return {
        grahas: [...involved],
        houses: wealthHouses,
        strength: Math.min(1, 0.5 + 0.25 * links.length),
        detail: `The lords of ${links.join('; and of ')}, are associated.`,
      };
    },
  },
  {
    id: 'vipreet-raja-yoga',
    name: 'Vipreet Raja Yoga',
    nameHi: 'विपरीत राज योग',
    category: 'RajaYoga',
    polarity: 'Mixed',
    citation: BPHS('Ch. 39'),
    classicalEffect:
      'Rise through adversity: the lords of the difficult houses confined among themselves, so '
      + 'that their harm turns on itself. Classically it delivers after struggle, not instead of it.',
    evaluate(c) {
      const named: Record<number, string> = { 6: 'Harsha', 8: 'Sarala', 12: 'Vimala' };
      const found: { name: string; lord: Graha; house: BhavaNumber }[] = [];
      for (const h of [6, 8, 12] as BhavaNumber[]) {
        const lord = c.lordOf(h);
        const placed = c.house(lord);
        if ([6, 8, 12].includes(placed)) {
          found.push({ name: named[h]!, lord, house: placed });
        }
      }
      if (found.length === 0) return null;
      return {
        grahas: found.map((f) => f.lord),
        houses: found.map((f) => f.house),
        strength: Math.min(1, 0.5 + 0.25 * found.length),
        detail: found.map((f) =>
          `${f.name} Yoga: the lord of the ${ordinal(f.name === 'Harsha' ? 6 : f.name === 'Sarala' ? 8 : 12)} `
          + `(${GRAHA_NAMES_EN[f.lord]}) is in the ${ordinal(f.house)}`).join('; ') + '.',
      };
    },
  },
  {
    id: 'neecha-bhanga',
    name: 'Neecha Bhanga Raja Yoga',
    nameHi: 'नीचभंग राज योग',
    category: 'RajaYoga',
    polarity: 'Favourable',
    citation: {
      work: 'Brihat Parashara Hora Shastra',
      locus: 'Ch. 34',
      tradition: 'Parashari',
      contested:
        'Authorities differ on which cancellations suffice. Phaladeepika requires the cancelling '
        + 'graha in a kendra from the lagna; others accept a kendra from the Moon. All four '
        + 'commonly cited conditions are reported separately so the reader can see which applies.',
    },
    classicalEffect:
      'A debilitated graha whose debilitation is cancelled is said to give results exceeding '
      + 'what its placement alone would suggest, typically after an early period of difficulty.',
    evaluate(c) {
      const debilitated = c.trueGrahas.filter((g) => c.isDebilitated(g));
      if (debilitated.length === 0) return null;

      const results: string[] = [];
      const involved: Graha[] = [];

      for (const graha of debilitated) {
        const dispositor = c.conditions[graha].dispositor;
        const conditions = [
          { text: `its dispositor ${GRAHA_NAMES_EN[dispositor]} is in a kendra from the lagna`,
            met: c.inKendra(dispositor) },
          { text: `its dispositor ${GRAHA_NAMES_EN[dispositor]} is in a kendra from the Moon`,
            met: c.isKendra(c.houseFrom('Moon', dispositor)) },
          { text: 'it is aspected by its own dispositor', met: c.aspects(dispositor, graha) },
          { text: 'it is exalted in navamsa', met: c.exaltedInNavamsa(graha) },
        ].filter((x) => x.met);

        if (conditions.length > 0) {
          involved.push(graha);
          results.push(`${GRAHA_NAMES_EN[graha]} is debilitated in `
            + `${RASHI_NAMES_SA[c.rashi(graha)]}, but ${conditions.map((x) => x.text).join(', and ')}.`);
        }
      }

      if (involved.length === 0) return null;
      return {
        grahas: involved,
        strength: 0.8,
        detail: results.join(' '),
      };
    },
  },
  {
    id: 'parivartana-maha',
    name: 'Maha Parivartana Yoga',
    nameHi: 'महा परिवर्तन योग',
    category: 'ParivartanaYoga',
    polarity: 'Favourable',
    citation: { work: 'Phaladeepika', locus: 'Ch. 6', tradition: 'Parashari' },
    classicalEffect:
      'An exchange between the lords of favourable houses, binding those areas of life together '
      + 'so that each supports the other.',
    evaluate(c) {
      const good: BhavaNumber[] = houses(1, 2, 4, 5, 7, 9, 10, 11);
      const found: string[] = [];
      const involved = new Set<Graha>();

      for (let i = 0; i < good.length; i++) {
        for (let j = i + 1; j < good.length; j++) {
          const a = c.lordOf(good[i]!), b = c.lordOf(good[j]!);
          if (a !== b && c.exchange(a, b)) {
            found.push(`${ordinal(good[i]!)} and ${ordinal(good[j]!)}`);
            involved.add(a); involved.add(b);
          }
        }
      }
      if (found.length === 0) return null;
      return {
        grahas: [...involved],
        strength: 1,
        detail: `The lords of the ${listSentence(found)} houses occupy each other's signs.`,
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Solar, spiritual and other yogas
// ---------------------------------------------------------------------------

export const OTHER_YOGAS: Rule[] = [
  {
    id: 'budhaditya',
    name: 'Budhaditya Yoga',
    nameHi: 'बुधादित्य योग',
    category: 'SolarYoga',
    polarity: 'Favourable',
    citation: {
      work: 'Brihat Parashara Hora Shastra',
      locus: 'Ch. 36',
      tradition: 'Parashari',
      contested:
        'Many practitioners hold the yoga void when Mercury is combust, which it often is when '
        + 'conjunct the Sun. Combustion is reported separately so it is not silently ignored.',
    },
    classicalEffect: 'Associated with intelligence, articulacy and administrative capability.',
    evaluate(c) {
      if (!c.conjunct('Sun', 'Mercury')) return null;
      const combust = c.isCombust('Mercury');
      return {
        grahas: ['Sun', 'Mercury'],
        houses: houses(c.house('Sun')),
        strength: combust ? 0.45 : 1,
        detail: `The Sun and Mercury are together in ${RASHI_NAMES_SA[c.rashi('Sun')]}, `
          + `in the ${ordinal(c.house('Sun'))} house.`,
        cancellations: [{
          description: `Mercury is combust (${c.conditions.Mercury.elongation.toFixed(1)}° from the Sun), `
            + 'which many authorities hold to void this yoga.',
          present: combust,
        }],
      };
    },
  },
  {
    id: 'amala',
    name: 'Amala Yoga',
    nameHi: 'अमल योग',
    category: 'RajaYoga',
    polarity: 'Favourable',
    citation: BPHS('Ch. 36'),
    classicalEffect: 'Associated with a spotless reputation and work that is remembered well.',
    evaluate(c) {
      const tenthFromLagna = c.in(10 as BhavaNumber).filter((g) => c.isBenefic(g));
      const tenthFromMoon = c.trueGrahas.filter(
        (g) => c.isBenefic(g) && c.houseFrom('Moon', g) === 10,
      );
      const found = [...new Set([...tenthFromLagna, ...tenthFromMoon])];
      if (found.length === 0) return null;
      return {
        grahas: found,
        houses: houses(10),
        strength: 1,
        detail: `${listSentence(found.map((g) => GRAHA_NAMES_EN[g]))} `
          + `${agrees(found.length, 'occupies', 'occupy')} the 10th `
          + `${tenthFromLagna.length ? 'from the lagna' : 'from the Moon'}.`,
      };
    },
  },
  {
    id: 'saraswati',
    name: 'Saraswati Yoga',
    nameHi: 'सरस्वती योग',
    category: 'SpiritualYoga',
    polarity: 'Favourable',
    citation: { work: 'Phaladeepika', locus: 'Ch. 6', tradition: 'Parashari' },
    classicalEffect: 'Associated with learning, eloquence and skill in the arts and letters.',
    evaluate(c) {
      const placed = (['Jupiter', 'Venus', 'Mercury'] as Graha[]).every((g) => {
        const h = c.house(g);
        return c.isKendra(h) || c.isTrikona(h) || h === 2;
      });
      if (!placed) return null;
      const jupiterStrong = c.isDignified('Jupiter') || !c.isDebilitated('Jupiter');
      if (!jupiterStrong) return null;
      return {
        grahas: ['Jupiter', 'Venus', 'Mercury'],
        strength: c.isDignified('Jupiter') ? 1 : 0.8,
        detail: 'Jupiter, Venus and Mercury all occupy kendras, trikonas or the 2nd house.',
      };
    },
  },
  {
    id: 'lakshmi',
    name: 'Lakshmi Yoga',
    nameHi: 'लक्ष्मी योग',
    category: 'DhanaYoga',
    polarity: 'Favourable',
    citation: { work: 'Phaladeepika', locus: 'Ch. 6', tradition: 'Parashari' },
    classicalEffect: 'Associated with prosperity, good fortune and a comfortable standing.',
    evaluate(c) {
      const ninthLord = c.lordOf(9 as BhavaNumber);
      const lagnaLord = c.lagnaLord;
      const ninthStrong = c.isDignified(ninthLord)
        && (c.inKendra(ninthLord) || c.inTrikona(ninthLord));
      const lagnaStrong = c.isDignified(lagnaLord) || c.inKendra(lagnaLord) || c.inTrikona(lagnaLord);
      if (!ninthStrong || !lagnaStrong) return null;
      return {
        grahas: [ninthLord, lagnaLord],
        houses: houses(c.house(ninthLord), c.house(lagnaLord)),
        strength: 1,
        detail: `${GRAHA_NAMES_EN[ninthLord]}, lord of the 9th, is dignified in the `
          + `${ordinal(c.house(ninthLord))} house, and the lagna lord is strong.`,
      };
    },
  },
  {
    id: 'kendra-trikona-lord-exchange-dainya',
    name: 'Dainya Parivartana Yoga',
    category: 'ParivartanaYoga',
    polarity: 'Difficult',
    citation: { work: 'Phaladeepika', locus: 'Ch. 6', tradition: 'Parashari' },
    classicalEffect:
      'An exchange involving a dusthana lord, tying an area of life to difficulty. Classical '
      + 'texts read it as obstruction rather than ruin.',
    evaluate(c) {
      const found: string[] = [];
      const involved = new Set<Graha>();
      for (const bad of [6, 8, 12] as BhavaNumber[]) {
        for (const other of houses(1, 2, 3, 4, 5, 7, 9, 10, 11)) {
          const a = c.lordOf(bad), b = c.lordOf(other);
          if (a !== b && c.exchange(a, b)) {
            found.push(`${ordinal(bad)} and ${ordinal(other)}`);
            involved.add(a); involved.add(b);
          }
        }
      }
      if (found.length === 0) return null;
      return {
        grahas: [...involved],
        strength: 0.7,
        detail: `The lords of the ${listSentence(found)} houses occupy each other's signs.`,
      };
    },
  },
];

export const ALL_YOGA_RULES: Rule[] = [
  ...MAHAPURUSHA_YOGAS,
  ...LUNAR_YOGAS,
  ...RAJA_DHANA_YOGAS,
  ...OTHER_YOGAS,
];
