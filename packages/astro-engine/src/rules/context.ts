/**
 * The query surface that rules are written against.
 *
 * Classical rules are stated as conditions over a chart — "if the lord of the
 * 9th is in a kendra", "if Jupiter aspects the Moon". A rule file should read
 * almost like the text it came from, so all the awkward index arithmetic lives
 * here and nowhere else. Every helper is memoised per chart, because the rule
 * set asks the same questions hundreds of times.
 */
import {
  RASHI_LORDS, GRAHAS, TRUE_GRAHAS, KENDRA_HOUSES, TRIKONA_HOUSES,
  DUSTHANA_HOUSES, UPACHAYA_HOUSES, GRAHA_OWNED_RASHIS,
} from '../core/constants.js';
import { allConditions, type GrahaCondition } from '../chart/dignity.js';
import {
  aspectsRashi, conjunctGrahas, grahasInHouse, grahasAspectingHouse, type AspectOptions,
} from '../chart/aspects.js';
import { buildAllVargas, type VargaChart, type VargaCode } from '../chart/varga.js';
import type { Graha, Kundali, BhavaNumber, RashiIndex } from '../core/types.js';

export class ChartContext {
  readonly chart: Kundali;
  readonly conditions: Record<Graha, GrahaCondition>;
  readonly vargas: Record<VargaCode, VargaChart>;
  readonly aspectOptions: AspectOptions;

  constructor(chart: Kundali, aspectOptions: AspectOptions = {}) {
    this.chart = chart;
    this.conditions = allConditions(chart);
    this.vargas = buildAllVargas(chart);
    this.aspectOptions = aspectOptions;
  }

  // -- placement -----------------------------------------------------------

  /** House a graha occupies, counted from the lagna. */
  house(graha: Graha): BhavaNumber {
    return this.chart.grahaBhava[graha];
  }

  /** Sign a graha occupies. */
  rashi(graha: Graha): RashiIndex {
    return this.chart.positions[graha].rashi;
  }

  /** Grahas occupying a house. */
  in(house: BhavaNumber): Graha[] {
    return grahasInHouse(this.chart, house);
  }

  /** Whether a house is empty of grahas. */
  isEmpty(house: BhavaNumber): boolean {
    return this.in(house).length === 0;
  }

  /** The graha owning a house, counted from the lagna. */
  lordOf(house: BhavaNumber): Graha {
    const sign = ((this.chart.lagnaRashi + house - 1) % 12) as RashiIndex;
    return RASHI_LORDS[sign]!;
  }

  /** Houses a graha owns from the lagna. Empty for the nodes. */
  owns(graha: Graha): BhavaNumber[] {
    return GRAHA_OWNED_RASHIS[graha]
      .map((sign) => ((((sign - this.chart.lagnaRashi + 12) % 12) + 1) as BhavaNumber));
  }

  /** Which house the lord of `house` itself occupies. */
  lordPlacedIn(house: BhavaNumber): BhavaNumber {
    return this.house(this.lordOf(house));
  }

  /** Inclusive count from one house to another, 1..12. */
  countFrom(from: BhavaNumber, to: BhavaNumber): number {
    return ((to - from + 12) % 12) + 1;
  }

  /** Inclusive count from one graha to another, as houses. */
  countFromGraha(from: Graha, to: Graha): number {
    return ((this.rashi(to) - this.rashi(from) + 12) % 12) + 1;
  }

  /** House a graha occupies counted from another graha rather than the lagna. */
  houseFrom(reference: Graha, graha: Graha): number {
    return this.countFromGraha(reference, graha);
  }

  // -- house classes -------------------------------------------------------

  isKendra(house: number): boolean { return (KENDRA_HOUSES as readonly number[]).includes(house); }
  isTrikona(house: number): boolean { return (TRIKONA_HOUSES as readonly number[]).includes(house); }
  isDusthana(house: number): boolean { return (DUSTHANA_HOUSES as readonly number[]).includes(house); }
  isUpachaya(house: number): boolean { return (UPACHAYA_HOUSES as readonly number[]).includes(house); }

  /** Is `graha` in a kendra counted from `reference`? */
  inKendraFrom(graha: Graha, reference: Graha): boolean {
    return this.isKendra(this.countFromGraha(reference, graha));
  }

  /** Is `graha` in a kendra from the lagna? */
  inKendra(graha: Graha): boolean { return this.isKendra(this.house(graha)); }
  inTrikona(graha: Graha): boolean { return this.isTrikona(this.house(graha)); }
  inDusthana(graha: Graha): boolean { return this.isDusthana(this.house(graha)); }

  // -- relationships -------------------------------------------------------

  /** Do two grahas share a sign? */
  conjunct(a: Graha, b: Graha): boolean {
    return a !== b && this.rashi(a) === this.rashi(b);
  }

  /** Every graha sharing a sign with this one. */
  companions(graha: Graha): Graha[] {
    return conjunctGrahas(this.chart, graha);
  }

  /** Does `from` cast a Parashari aspect on the sign `to` occupies? */
  aspects(from: Graha, to: Graha): boolean {
    return from !== to
      && aspectsRashi(from, this.rashi(from), this.rashi(to), this.aspectOptions);
  }

  /** Do two grahas aspect each other? */
  mutualAspect(a: Graha, b: Graha): boolean {
    return this.aspects(a, b) && this.aspects(b, a);
  }

  /** Conjunction or mutual aspect — the usual sense of "associated". */
  associated(a: Graha, b: Graha): boolean {
    return this.conjunct(a, b) || this.mutualAspect(a, b);
  }

  /** Do two grahas occupy each other's signs (parivartana / exchange)? */
  exchange(a: Graha, b: Graha): boolean {
    if (a === b) return false;
    return GRAHA_OWNED_RASHIS[b].includes(this.rashi(a))
      && GRAHA_OWNED_RASHIS[a].includes(this.rashi(b));
  }

  /** Grahas aspecting a house. */
  aspecting(house: BhavaNumber): Graha[] {
    return grahasAspectingHouse(this.chart, house, this.aspectOptions);
  }

  /** Does any natural benefic aspect this house? */
  beneficAspectOn(house: BhavaNumber): boolean {
    return this.aspecting(house).some((g) => this.isBenefic(g));
  }

  // -- condition -----------------------------------------------------------

  isExalted(graha: Graha): boolean { return this.conditions[graha].exalted; }
  isDebilitated(graha: Graha): boolean { return this.conditions[graha].debilitated; }
  isOwnSign(graha: Graha): boolean { return this.conditions[graha].ownSign; }
  isMoolatrikona(graha: Graha): boolean { return this.conditions[graha].moolatrikona; }
  isCombust(graha: Graha): boolean { return this.conditions[graha].combust; }
  isRetrograde(graha: Graha): boolean { return this.conditions[graha].retrograde; }
  isVargottama(graha: Graha): boolean { return this.conditions[graha].vargottama; }
  isYogakaraka(graha: Graha): boolean { return this.conditions[graha].yogakaraka; }

  /** Own sign, moolatrikona or exalted — the usual sense of "strongly placed". */
  isDignified(graha: Graha): boolean {
    const c = this.conditions[graha];
    return c.exalted || c.moolatrikona || c.ownSign;
  }

  isBenefic(graha: Graha): boolean {
    return this.conditions[graha].naturalNature === 'Benefic';
  }

  isMalefic(graha: Graha): boolean {
    return this.conditions[graha].naturalNature === 'Malefic';
  }

  isFunctionalBenefic(graha: Graha): boolean {
    return this.conditions[graha].functionalNature === 'Benefic';
  }

  /** Natural benefics in this chart, with the conditional cases resolved. */
  benefics(): Graha[] { return GRAHAS.filter((g) => this.isBenefic(g)); }
  malefics(): Graha[] { return GRAHAS.filter((g) => this.isMalefic(g)); }

  /** The sign a graha occupies in a divisional chart. */
  vargaRashi(graha: Graha, code: VargaCode): RashiIndex {
    return this.vargas[code].grahaRashi[graha];
  }

  /** Is the graha exalted in navamsa? Used by several cancellation rules. */
  exaltedInNavamsa(graha: Graha): boolean {
    const navamsaSign = this.vargaRashi(graha, 'D9');
    const exaltation = EXALTATION_SIGN[graha];
    return exaltation !== null && exaltation === navamsaSign;
  }

  /** The seven physical grahas, excluding the shadow points. */
  get trueGrahas(): readonly Graha[] { return TRUE_GRAHAS; }
  get allGrahas(): readonly Graha[] { return GRAHAS; }
  get lagnaRashi(): RashiIndex { return this.chart.lagnaRashi; }
  get lagnaLord(): Graha { return this.lordOf(1); }
}

import { EXALTATION } from '../core/constants.js';
const EXALTATION_SIGN: Record<Graha, RashiIndex | null> = Object.fromEntries(
  GRAHAS.map((g) => [g, EXALTATION[g]?.rashi ?? null]),
) as Record<Graha, RashiIndex | null>;
