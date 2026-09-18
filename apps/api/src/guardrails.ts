/**
 * Post-generation checks.
 *
 * A system prompt is an instruction, not a guarantee. These checks read what the
 * model actually produced and refuse to ship text that breaks the rules — most
 * importantly text that names a yoga the engine never found, which is the
 * failure mode a user cannot possibly detect for themselves.
 */
import type { FactBundle } from './facts.js';

export interface GuardrailViolation {
  kind:
    | 'UNGROUNDED_FINDING'
    | 'UNGROUNDED_YEAR'
    | 'PROHIBITED_TOPIC'
    | 'ABSOLUTE_CLAIM'
    | 'FEAR_SELLING'
    | 'SECOND_PERSON_CLAIM';
  detail: string;
  /** The offending fragment, for logging and for prompting a retry. */
  evidence: string;
}

/**
 * Yoga and dosha names the engine can produce. Any "... Yoga" or "... Dosha"
 * in the output that is not in the supplied findings is ungrounded.
 */
const FINDING_PATTERN = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s+(Yoga|Dosha)\b/g;

/**
 * Every yoga or dosha phrase that appears anywhere in the fact bundle's own
 * text, not just in the finding names.
 *
 * Citations legitimately contain such phrases — "Ch. 75, Panch Mahapurusha
 * Yoga", "Raja Yoga Adhyaya" — and a narration that quotes its source must not
 * be accused of inventing a finding. Deriving the allowed set from the bundle
 * keeps the check precise without hardcoding chapter titles.
 */
function allowedFindingPhrases(facts: FactBundle): Set<string> {
  const allowed = new Set(facts.vocabulary.findingNames.map(normalise));
  const factText = facts.findings
    .flatMap((f) => [f.name, f.detail, f.classicalEffect, f.citation, f.contested ?? ''])
    .join('\n');
  for (const match of factText.matchAll(FINDING_PATTERN)) {
    allowed.add(normalise(match[0]));
  }
  return allowed;
}

/**
 * Years the narration may mention: every dasha boundary the bundle contains, at
 * every level. Restricting this to mahadasha boundaries would wrongly flag a
 * correct sentence about the antardasha currently running.
 */
function allowedYears(facts: FactBundle): Set<number> {
  const years = new Set(facts.vocabulary.years);
  const addFrom = (s: string) => {
    const m = /^(\d{4})/.exec(s);
    if (m) years.add(Number(m[1]));
  };
  for (const p of facts.dasha.current) { addFrom(p.from); addFrom(p.to); }
  for (const p of facts.dasha.upcoming) { addFrom(p.from); addFrom(p.to); }
  return years;
}

const PROHIBITED = [
  { re: /\b(die|death|dying|lifespan|longevity of life|when .{0,20}will pass away)\b/i,
    detail: 'Predicting death or lifespan' },
  { re: /\b(cancer|tumour|tumor|diabetes|heart attack|stroke|depression|schizophreni|miscarriage|infertil)\w*\b/i,
    detail: 'Diagnosing or predicting illness' },
  { re: /\b(you should (buy|sell|invest)|invest in|stock market will|guaranteed returns?)\b/i,
    detail: 'Financial advice' },
  { re: /\b(you should (not )?(marry|divorce)|do not marry|must not marry)\b/i,
    detail: 'Directing a marriage decision' },
];

const ABSOLUTE = [
  { re: /\b(will definitely|is certain to|guaranteed to|without doubt you will|is bound to happen)\b/i,
    detail: 'Stating a guaranteed outcome' },
];

const FEAR_SELLING = [
  { re: /\b(you must (wear|perform|do) .{0,40}(to avoid|to prevent|or else)|unless you (wear|perform)|failing which)\b/i,
    detail: 'Pressuring a remedy to avert harm' },
  { re: /\b(only (a|an) .{0,30}(puja|pooja|gemstone|ritual) can|immediately (wear|perform))\b/i,
    detail: 'Creating urgency around a remedy' },
];

/** Normalise for comparison: case, punctuation and extra whitespace. */
const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function checkNarration(text: string, facts: FactBundle): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  // 1. Every named yoga or dosha must be one the engine actually found.
  const allowed = allowedFindingPhrases(facts);
  for (const match of text.matchAll(FINDING_PATTERN)) {
    const named = normalise(match[0]);
    const isKnown = [...allowed].some((a) => a.includes(named) || named.includes(a));
    if (!isKnown) {
      violations.push({
        kind: 'UNGROUNDED_FINDING',
        detail: `"${match[0]}" is not among the findings the engine computed`,
        evidence: match[0],
      });
    }
  }

  // 2. Any four-digit year should be one of the dasha boundaries supplied.
  // Matching only 19xx-21xx would miss an obviously fabricated 1847, so this
  // takes any plausible year and lets the boundary check decide.
  const years = allowedYears(facts);
  for (const match of text.matchAll(/\b[12]\d{3}\b/g)) {
    const year = Number(match[0]);
    // Allow a year adjacent to a real boundary: prose often rounds a period
    // that ends in January to "until the previous year".
    const near = [...years].some((y) => Math.abs(y - year) <= 1);
    if (!near) {
      violations.push({
        kind: 'UNGROUNDED_YEAR',
        detail: `the year ${year} does not correspond to any computed dasha boundary`,
        evidence: match[0],
      });
    }
  }

  for (const { re, detail } of PROHIBITED) {
    const m = re.exec(text);
    if (m) violations.push({ kind: 'PROHIBITED_TOPIC', detail, evidence: m[0] });
  }
  for (const { re, detail } of ABSOLUTE) {
    const m = re.exec(text);
    if (m) violations.push({ kind: 'ABSOLUTE_CLAIM', detail, evidence: m[0] });
  }
  for (const { re, detail } of FEAR_SELLING) {
    const m = re.exec(text);
    if (m) violations.push({ kind: 'FEAR_SELLING', detail, evidence: m[0] });
  }

  // 3. A cancelled finding must not be presented as though it applies.
  for (const finding of facts.findings.filter((f) => f.cancelled)) {
    const mentioned = text.toLowerCase().includes(finding.name.toLowerCase().split('(')[0]!.trim());
    if (!mentioned) continue;
    // Note the trailing \w*: a bare \bcancel\b does not match "cancelled",
    // which is the word any correct narration will actually use.
    const saysCancelled =
      /\b(cancel\w*|nullif\w*|exempt\w*|void\w*|does not apply|no longer applies)\b/i.test(text);
    if (!saysCancelled) {
      violations.push({
        kind: 'SECOND_PERSON_CLAIM',
        detail: `${finding.name} is cancelled in this chart but the text does not say so`,
        evidence: finding.name,
      });
    }
  }

  return violations;
}

/** A short instruction that tells the model exactly what to fix on a retry. */
export function repairInstruction(violations: GuardrailViolation[]): string {
  const lines = violations.map((v) => `- ${v.detail} (you wrote: "${v.evidence}")`);
  return `Your previous response broke the rules in these ways:\n${lines.join('\n')}\n\n`
    + `Rewrite it. Use only the supplied facts, name only the findings that were supplied, `
    + `say explicitly when a finding is cancelled, and stay inside the hard limits.`;
}
