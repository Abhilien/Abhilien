/**
 * Rule evaluation.
 *
 * The engine's only job is to run every rule against a chart and collect what
 * fires. It adds no interpretation of its own, and it never suppresses a
 * cancellation: a dosha whose classical exemption applies is reported as
 * present *and* cancelled, because that is the honest answer and because hiding
 * it is how this industry sells remedies for problems the texts say do not
 * exist.
 */
import { ChartContext } from './context.js';
import { ALL_YOGA_RULES } from './yogas.js';
import { ALL_DOSHA_RULES } from './doshas.js';
import type { Rule, Finding } from './types.js';
import type { Kundali } from '../core/types.js';
import type { AspectOptions } from '../chart/aspects.js';

export const ALL_RULES: Rule[] = [...ALL_YOGA_RULES, ...ALL_DOSHA_RULES];

export interface EvaluateOptions extends AspectOptions {
  /** Restrict to a subset of rules, by id. */
  only?: string[];
  /** Minimum strength for a finding to be included. Defaults to 0 (all). */
  minStrength?: number;
}

export interface Analysis {
  findings: Finding[];
  /** Findings that fired and were not cancelled. */
  active: Finding[];
  /** Findings that fired but whose classical cancellation applies. */
  cancelled: Finding[];
  yogas: Finding[];
  doshas: Finding[];
  context: ChartContext;
}

export function evaluateRules(chart: Kundali, options: EvaluateOptions = {}): Analysis {
  const context = new ChartContext(chart, { nodesAspect: options.nodesAspect ?? false });
  const rules = options.only
    ? ALL_RULES.filter((r) => options.only!.includes(r.id))
    : ALL_RULES;

  const findings: Finding[] = [];

  for (const rule of rules) {
    const result = rule.evaluate(context);
    if (!result) continue;
    if (options.minStrength !== undefined && (result.strength ?? 1) < options.minStrength) continue;

    findings.push({
      ...result,
      ruleId: rule.id,
      name: rule.name,
      ...(rule.nameHi === undefined ? {} : { nameHi: rule.nameHi }),
      category: rule.category,
      polarity: rule.polarity,
      citation: rule.citation,
      classicalEffect: rule.classicalEffect,
      cancelled: (result.cancellations ?? []).some((x) => x.present),
    });
  }

  findings.sort((a, b) => (b.strength ?? 1) - (a.strength ?? 1));

  return {
    findings,
    active: findings.filter((f) => !f.cancelled),
    cancelled: findings.filter((f) => f.cancelled),
    yogas: findings.filter((f) => f.category !== 'Dosha'),
    doshas: findings.filter((f) => f.category === 'Dosha'),
    context,
  };
}

/**
 * A compact, machine-readable summary of everything the engine determined.
 *
 * This is the object the narration layer is allowed to see. It deliberately
 * contains no prose beyond the classical attributions, so that a model writing
 * from it can only rephrase computed findings, never invent new ones.
 */
export interface FactSheet {
  lagna: { rashi: number; degree: number; nakshatra: number; pada: number };
  moon: { rashi: number; nakshatra: number; pada: number };
  sun: { rashi: number; nakshatra: number };
  ayanamsa: number;
  findings: {
    id: string; name: string; polarity: string; strength: number;
    cancelled: boolean; detail: string; citation: string; classicalEffect: string;
  }[];
}

export function factSheet(chart: Kundali, analysis: Analysis): FactSheet {
  return {
    lagna: {
      rashi: chart.lagnaRashi,
      degree: chart.lagna % 30,
      nakshatra: chart.lagnaNakshatra,
      pada: chart.lagnaPada,
    },
    moon: {
      rashi: chart.positions.Moon.rashi,
      nakshatra: chart.positions.Moon.nakshatra,
      pada: chart.positions.Moon.pada,
    },
    sun: {
      rashi: chart.positions.Sun.rashi,
      nakshatra: chart.positions.Sun.nakshatra,
    },
    ayanamsa: chart.ayanamsa,
    findings: analysis.findings.map((f) => ({
      id: f.ruleId,
      name: f.name,
      polarity: f.polarity,
      strength: f.strength ?? 1,
      cancelled: f.cancelled,
      detail: f.detail ?? '',
      citation: [f.citation.work, f.citation.locus].filter(Boolean).join(', '),
      classicalEffect: f.classicalEffect,
    })),
  };
}
