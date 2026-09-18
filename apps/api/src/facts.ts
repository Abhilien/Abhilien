/**
 * The fact bundle: the only thing a language model is ever shown.
 *
 * This module is the trust boundary of the whole product. Everything on the far
 * side of it was computed by the engine and is exactly correct; nothing else is
 * allowed across. A model given this bundle can rephrase it, connect it and
 * translate it, but it has no material with which to invent a planetary
 * position, a dasha date or a yoga — and the guardrails check that it didn't.
 */
import {
  castChart, evaluateRules, dashaChainAt, dashaBalance, mahadashas,
  ashtakavarga, allConditions, computePanchang, formatDMS,
  RASHI_NAMES_SA, NAKSHATRA_NAMES_SA, GRAHA_NAMES_SA, GRAHAS,
  BHAVA_SIGNIFICATIONS, savStrength, ordinal,
} from '@jyotish/engine';
import type { BirthData, Graha, Kundali } from '@jyotish/engine';

export interface FactBundle {
  /** Human-readable chart header. */
  chart: {
    lagna: string;
    lagnaNakshatra: string;
    moon: string;
    sun: string;
    ayanamsa: string;
    birthPlace: string;
    /** Present only when the birth time is reliable enough to use houses. */
    housesUsable: boolean;
    timeAccuracy: string;
  };
  positions: {
    graha: string;
    sign: string;
    degree: string;
    nakshatra: string;
    pada: number;
    house: number | null;
    dignity: string;
    retrograde: boolean;
    combust: boolean;
  }[];
  houses: { house: number; sign: string; lord: string; lordIn: number | null; signifies: string[] }[];
  dasha: {
    balanceAtBirth: string;
    current: { level: string; lord: string; from: string; to: string }[];
    upcoming: { lord: string; from: string; to: string; years: number }[];
  };
  findings: {
    name: string;
    polarity: string;
    strength: number;
    cancelled: boolean;
    detail: string;
    classicalEffect: string;
    citation: string;
    contested?: string;
  }[];
  ashtakavarga: { house: number; sign: string; bindus: number; strength: string }[];
  /** Warnings the chart itself carries. The narration must not paper over these. */
  warnings: string[];
  /** Every proper noun the model is permitted to use, for post-generation checks. */
  vocabulary: {
    findingNames: string[];
    grahaNames: string[];
    signNames: string[];
    nakshatraNames: string[];
    years: number[];
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function buildFactBundle(birth: BirthData, asOf = new Date()): FactBundle {
  const { chart, warnings } = castChart(birth);
  const conditions = allConditions(chart);
  const analysis = evaluateRules(chart);
  const balance = dashaBalance(chart);
  const chain = dashaChainAt(chart, asOf);
  const periods = mahadashas(chart, { spanYears: 120 });
  const av = ashtakavarga(chart);

  const housesUsable = birth.timeAccuracy !== 'Unknown';

  const positions = GRAHAS.map((g) => {
    const p = chart.positions[g];
    const c = conditions[g];
    return {
      graha: GRAHA_NAMES_SA[g],
      sign: RASHI_NAMES_SA[p.rashi]!,
      degree: formatDMS(p.degreeInRashi, 0),
      nakshatra: NAKSHATRA_NAMES_SA[p.nakshatra]!,
      pada: p.pada,
      house: housesUsable ? chart.grahaBhava[g] : null,
      dignity: c.dignity,
      retrograde: p.retrograde,
      combust: c.combust,
    };
  });

  const houses = housesUsable
    ? chart.bhavas.map((b) => ({
      house: b.number,
      sign: RASHI_NAMES_SA[b.rashi]!,
      lord: GRAHA_NAMES_SA[b.lord],
      lordIn: chart.grahaBhava[b.lord],
      signifies: BHAVA_SIGNIFICATIONS[b.number] ?? [],
    }))
    : [];

  const upcoming = periods
    .filter((p) => p.end.getTime() > asOf.getTime())
    .slice(0, 4)
    .map((p) => ({ lord: GRAHA_NAMES_SA[p.lord], from: iso(p.start), to: iso(p.end), years: Number(p.years.toFixed(1)) }));

  const levelName = ['Mahadasha', 'Antardasha', 'Pratyantardasha', 'Sookshma', 'Prana'];

  const findings = analysis.findings.map((f) => ({
    name: f.name,
    polarity: f.polarity,
    strength: Number((f.strength ?? 1).toFixed(2)),
    cancelled: f.cancelled,
    detail: f.detail ?? '',
    classicalEffect: f.classicalEffect,
    citation: [f.citation.work, f.citation.locus].filter(Boolean).join(', '),
    ...(f.citation.contested ? { contested: f.citation.contested } : {}),
  }));

  const ashtakavargaRows = housesUsable
    ? av.sarvaByHouse.map((bindus, i) => ({
      house: i + 1,
      sign: RASHI_NAMES_SA[(chart.lagnaRashi + i) % 12]!,
      bindus,
      strength: savStrength(bindus),
    }))
    : [];

  // Years the model is allowed to mention: every dasha boundary in range.
  const years = [...new Set(periods.flatMap((p) => [
    p.start.getUTCFullYear(), p.end.getUTCFullYear(),
  ]))].sort((a, b) => a - b);

  return {
    chart: {
      lagna: housesUsable
        ? `${RASHI_NAMES_SA[chart.lagnaRashi]} ${formatDMS(chart.lagna % 30, 0)}`
        : 'not determinable from the given birth time',
      lagnaNakshatra: housesUsable
        ? `${NAKSHATRA_NAMES_SA[chart.lagnaNakshatra]} pada ${chart.lagnaPada}`
        : 'not determinable',
      moon: `${RASHI_NAMES_SA[chart.positions.Moon.rashi]}, ${NAKSHATRA_NAMES_SA[chart.positions.Moon.nakshatra]} pada ${chart.positions.Moon.pada}`,
      sun: `${RASHI_NAMES_SA[chart.positions.Sun.rashi]}, ${NAKSHATRA_NAMES_SA[chart.positions.Sun.nakshatra]}`,
      ayanamsa: `${formatDMS(chart.ayanamsa, 0)} (${chart.settings.ayanamsa})`,
      birthPlace: birth.location.label ?? `${birth.location.latitude}, ${birth.location.longitude}`,
      housesUsable,
      timeAccuracy: birth.timeAccuracy ?? 'ToMinute',
    },
    positions,
    houses,
    dasha: {
      balanceAtBirth: `${GRAHA_NAMES_SA[balance.lord]}, ${balance.remainingYears.toFixed(2)} years remaining at birth`,
      current: chain.map((p, i) => ({
        level: levelName[i] ?? `level ${i + 1}`,
        lord: GRAHA_NAMES_SA[p.lord],
        from: iso(p.start),
        to: iso(p.end),
      })),
      upcoming,
    },
    findings,
    ashtakavarga: ashtakavargaRows,
    warnings: warnings.map((w) => w.message),
    vocabulary: {
      findingNames: findings.map((f) => f.name),
      grahaNames: GRAHAS.map((g) => GRAHA_NAMES_SA[g]),
      signNames: [...RASHI_NAMES_SA],
      nakshatraNames: [...NAKSHATRA_NAMES_SA],
      years,
    },
  };
}

/** Facts for a specific question, so a chat answer is grounded in the same way. */
export function buildPanchangFacts(chart: Kundali, asOf = new Date()) {
  const p = computePanchang(asOf, chart.birth.location);
  return {
    date: iso(asOf),
    weekday: p.vara.name,
    tithi: `${p.tithi.paksha} ${p.tithi.name}`,
    nakshatra: p.nakshatra.name,
    yoga: p.yoga.name,
    karana: p.karana.name,
    sunrise: p.sunrise?.toISOString() ?? null,
    sunset: p.sunset?.toISOString() ?? null,
  };
}

export { ordinal as _ordinal };
export type { Graha as _Graha };
