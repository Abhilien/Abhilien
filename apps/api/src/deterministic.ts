/**
 * Template narration — a full reading with no model involved.
 *
 * This exists for three reasons, and all three matter commercially:
 *  - it costs nothing per request, so it can be the free tier at any scale;
 *  - it cannot hallucinate, so it is the fallback when the model is
 *    unavailable, rate-limited, or produces output the guardrails reject;
 *  - it is the reference the AI narration is measured against — if the model
 *    says something this cannot, that difference is worth inspecting.
 */
import { ordinal } from '@jyotish/engine';
import type { FactBundle } from './facts.js';

function paragraph(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function deterministicReading(facts: FactBundle): string {
  const sections: string[] = [];

  // --- the chart itself ---
  if (facts.chart.housesUsable) {
    sections.push(paragraph(
      `The ascendant is ${facts.chart.lagna}, in ${facts.chart.lagnaNakshatra}.`,
      `The Moon is in ${facts.chart.moon}, and the Sun in ${facts.chart.sun}.`,
      `Positions are sidereal, using the ${facts.chart.ayanamsa} ayanamsa.`,
    ));
  } else {
    sections.push(paragraph(
      `The birth time is not known, so the ascendant and the houses cannot be determined`,
      `and are left out of this reading.`,
      `The Moon is in ${facts.chart.moon}, and the Sun in ${facts.chart.sun}.`,
      `The Moon can move as much as thirteen degrees across a day, so even its position`,
      `carries some uncertainty here.`,
    ));
  }

  // --- warnings come early, not buried ---
  if (facts.warnings.length > 0) {
    sections.push(`Worth knowing before reading further: ${facts.warnings.join(' ')}`);
  }

  // --- dasha ---
  const current = facts.dasha.current;
  if (current.length >= 2) {
    const maha = current[0]!;
    const antar = current[1]!;
    sections.push(paragraph(
      `The Vimshottari dasha running now is ${maha.lord}, from ${maha.from} to ${maha.to},`,
      `and within it the ${antar.lord} sub-period, from ${antar.from} to ${antar.to}.`,
      `At birth the balance was ${facts.dasha.balanceAtBirth}.`,
    ));
    if (facts.dasha.upcoming.length > 1) {
      const next = facts.dasha.upcoming[1]!;
      sections.push(`The next major period is ${next.lord}, beginning ${next.from} and running ${next.years} years.`);
    }
  }

  // --- findings, active first ---
  const active = facts.findings.filter((f) => !f.cancelled);
  const cancelled = facts.findings.filter((f) => f.cancelled);

  const favourable = active.filter((f) => f.polarity === 'Favourable');
  const difficult = active.filter((f) => f.polarity === 'Difficult');
  const mixed = active.filter((f) => f.polarity === 'Mixed');

  if (favourable.length > 0) {
    sections.push(`Supportive combinations in this chart:`);
    for (const f of favourable) {
      sections.push(`• ${f.name}. ${f.detail} ${f.classicalEffect} (${f.citation})`);
    }
  }

  if (mixed.length > 0) {
    sections.push(`Combinations the tradition reads as mixed:`);
    for (const f of mixed) {
      sections.push(`• ${f.name}. ${f.detail} ${f.classicalEffect} (${f.citation})`);
    }
  }

  if (difficult.length > 0) {
    sections.push(`Combinations the tradition treats as demanding:`);
    for (const f of difficult) {
      sections.push(
        `• ${f.name}. ${f.detail} ${f.classicalEffect} (${f.citation})`
        + (f.contested ? ` Note that authorities differ here: ${f.contested}` : ''),
      );
    }
  }

  if (cancelled.length > 0) {
    sections.push(
      `The following were found but are cancelled by classical exemptions, and do not apply `
      + `to this chart:`,
    );
    for (const f of cancelled) {
      sections.push(`• ${f.name}. ${f.detail}`);
    }
  }

  if (facts.findings.length === 0) {
    sections.push(
      `No yoga or dosha from the current rule set was formed in this chart. That is an ordinary `
      + `result and not a negative one; the rule set covers the well-attested combinations, not `
      + `every statement ever made in the classical literature.`,
    );
  }

  // --- strongest and weakest houses by Ashtakavarga ---
  if (facts.ashtakavarga.length > 0) {
    const sorted = [...facts.ashtakavarga].sort((a, b) => b.bindus - a.bindus);
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    sections.push(paragraph(
      `By Sarvashtakavarga, the ${ordinal(best.house)} house is the best supported in this chart,`,
      `with ${best.bindus} bindus, and the ${ordinal(worst.house)} the least, with ${worst.bindus}.`,
      `The average across the twelve houses is about 28.`,
    ));
  }

  sections.push(
    `These readings are what classical Jyotish texts say about the placements computed above, `
    + `cited to their sources. The positions and periods are astronomy and are exact. The `
    + `interpretations are tradition, offered for reflection rather than as advice about health, `
    + `money, or any decision that is yours to make.`,
  );

  return sections.join('\n\n');
}
