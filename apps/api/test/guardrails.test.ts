import { describe, it, expect } from 'vitest';
import { checkNarration, repairInstruction } from '../src/guardrails.js';
import { buildFactBundle } from '../src/facts.js';
import { deterministicReading } from '../src/deterministic.js';
import type { BirthData } from '@jyotish/engine';

const birth: BirthData = {
  year: 1990, month: 8, day: 15, hour: 10, minute: 30,
  location: { latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata', label: 'Varanasi' },
  timeAccuracy: 'Exact',
};
const facts = buildFactBundle(birth, new Date('2026-09-18T00:00:00Z'));

const kinds = (text: string) => checkNarration(text, facts).map((v) => v.kind);

describe('ungrounded findings', () => {
  it('catches a yoga the engine never found', () => {
    // Kedara Yoga is a real classical yoga, and precisely for that reason a
    // model could produce it plausibly. It is not in this chart's findings.
    expect(kinds('This chart carries a strong Kedara Yoga.')).toContain('UNGROUNDED_FINDING');
  });

  it('catches an invented dosha', () => {
    expect(kinds('Shrapit Dosha is present here.')).toContain('UNGROUNDED_FINDING');
  });

  it('accepts a finding the engine did compute', () => {
    const real = facts.findings[0]!.name;
    expect(kinds(`The chart shows ${real}, which is worth noting.`))
      .not.toContain('UNGROUNDED_FINDING');
  });

  it('passes the engine own deterministic reading cleanly', () => {
    // The template reading is built from the facts alone, so by construction it
    // must satisfy every check. If it does not, a guardrail is too aggressive.
    expect(checkNarration(deterministicReading(facts), facts)).toEqual([]);
  });
});

describe('ungrounded dates', () => {
  it('catches a year with no corresponding dasha boundary', () => {
    expect(kinds('A decisive change arrives in 1847.')).toContain('UNGROUNDED_YEAR');
  });

  it('accepts a year that is a real period boundary', () => {
    const year = facts.vocabulary.years[2]!;
    expect(kinds(`The period beginning in ${year} is significant.`))
      .not.toContain('UNGROUNDED_YEAR');
  });
});

describe('hard limits', () => {
  it('blocks predictions of death', () => {
    expect(kinds('The 8th house suggests when you will die.')).toContain('PROHIBITED_TOPIC');
    expect(kinds('This indicates a long lifespan.')).toContain('PROHIBITED_TOPIC');
  });

  it('blocks medical claims', () => {
    expect(kinds('This placement indicates a risk of diabetes.')).toContain('PROHIBITED_TOPIC');
    expect(kinds('Saturn here often brings depression.')).toContain('PROHIBITED_TOPIC');
  });

  it('blocks financial advice', () => {
    expect(kinds('You should invest in property during this period.')).toContain('PROHIBITED_TOPIC');
    expect(kinds('This promises guaranteed returns.')).toContain('PROHIBITED_TOPIC');
  });

  it('blocks directing a marriage decision', () => {
    expect(kinds('You should not marry during this dasha.')).toContain('PROHIBITED_TOPIC');
  });

  it('blocks guaranteed outcomes', () => {
    expect(kinds('This period will definitely bring promotion.')).toContain('ABSOLUTE_CLAIM');
    expect(kinds('Success is certain to follow.')).toContain('ABSOLUTE_CLAIM');
  });

  it('blocks fear-driven remedy selling', () => {
    expect(kinds('You must wear a yellow sapphire to avoid losses.')).toContain('FEAR_SELLING');
    expect(kinds('Only a special puja can remove this.')).toContain('FEAR_SELLING');
  });
});

describe('cancelled findings', () => {
  it('objects when a cancelled dosha is discussed without saying it is cancelled', () => {
    const cancelledFinding = facts.findings.find((f) => f.cancelled);
    expect(cancelledFinding, 'this fixture chart should contain a cancelled finding').toBeDefined();
    const name = cancelledFinding!.name.split('(')[0]!.trim();
    const violations = checkNarration(
      `${name} is present in this chart and will affect married life.`, facts,
    );
    expect(violations.map((v) => v.kind)).toContain('SECOND_PERSON_CLAIM');
  });

  it('accepts the same discussion when the cancellation is stated', () => {
    const cancelledFinding = facts.findings.find((f) => f.cancelled)!;
    const name = cancelledFinding.name.split('(')[0]!.trim();
    const violations = checkNarration(
      `${name} is formed here, but it is cancelled by a classical exemption and does not apply.`,
      facts,
    );
    expect(violations.map((v) => v.kind)).not.toContain('SECOND_PERSON_CLAIM');
  });
});

describe('false positives', () => {
  it('does not flag ordinary, well-grounded narration', () => {
    const text =
      `The ascendant is Tula, and Jupiter is exalted in the 10th house. Classical texts `
      + `associate this with steady professional standing. The Vimshottari dasha of Guru is `
      + `running, and the tradition reads such a period as favouring study and advisory work. `
      + `Nothing here speaks to health or money, which this reading does not address.`;
    expect(checkNarration(text, facts)).toEqual([]);
  });

  it('does not flag the word "yoga" used generically', () => {
    expect(kinds('Several yogas are present, and each is described below.')).toEqual([]);
  });
});

describe('repair instruction', () => {
  it('names each violation and quotes the offending text', () => {
    const violations = checkNarration(
      'Kedara Yoga is present and you will definitely prosper in 1847.', facts,
    );
    expect(violations.length).toBeGreaterThanOrEqual(3);
    const instruction = repairInstruction(violations);
    expect(instruction).toMatch(/Kedara Yoga/);
    expect(instruction).toMatch(/1847/);
    expect(instruction).toMatch(/Rewrite it/);
  });
});

describe('fact bundle', () => {
  it('exposes only computed material, and a vocabulary to check against', () => {
    expect(facts.vocabulary.findingNames.length).toBe(facts.findings.length);
    expect(facts.vocabulary.years.length).toBeGreaterThan(5);
    expect(facts.positions).toHaveLength(9);
  });

  it('suppresses houses entirely when the birth time is unknown', () => {
    const blind = buildFactBundle({ ...birth, timeAccuracy: 'Unknown' });
    expect(blind.chart.housesUsable).toBe(false);
    expect(blind.houses).toEqual([]);
    expect(blind.ashtakavarga).toEqual([]);
    for (const p of blind.positions) expect(p.house).toBeNull();
  });

  it('carries the chart warnings through to the narration layer', () => {
    const blind = buildFactBundle({ ...birth, timeAccuracy: 'Unknown' });
    expect(blind.warnings.join(' ')).toMatch(/birth time/i);
    expect(deterministicReading(blind)).toMatch(/birth time is not known/i);
  });
});
