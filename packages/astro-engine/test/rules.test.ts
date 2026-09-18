import { describe, it, expect } from 'vitest';
import { evaluateRules, ALL_RULES, factSheet } from '../src/rules/engine.js';
import { ChartContext } from '../src/rules/context.js';
import { castChart } from '../src/chart/kundali.js';
import { makeChart, SIGN } from './helpers/synthetic.js';
import type { BirthData } from '../src/core/types.js';

const find = (chart: ReturnType<typeof makeChart>, id: string) =>
  evaluateRules(chart).findings.find((f) => f.ruleId === id);

describe('rule set hygiene', () => {
  it('gives every rule a unique id', () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('requires every rule to cite a source', () => {
    for (const rule of ALL_RULES) {
      expect(rule.citation.work, rule.id).toBeTruthy();
      expect(rule.classicalEffect, rule.id).toBeTruthy();
    }
  });

  it('states classical effects as attribution, never as a claim about the person', () => {
    // A reading must not assert outcomes in the second person. Catching this in
    // the rule set is cheaper than catching it in generated prose.
    for (const rule of ALL_RULES) {
      expect(rule.classicalEffect, rule.id).not.toMatch(/\byou\b|\byour\b|\bwill\b/i);
    }
  });

  it('is pure: the same chart evaluates identically twice', () => {
    const chart = makeChart({ lagna: [SIGN.Mesha, 10], positions: { Jupiter: [SIGN.Karka, 5] } });
    expect(JSON.stringify(evaluateRules(chart).findings))
      .toBe(JSON.stringify(evaluateRules(chart).findings));
  });
});

describe('Panch Mahapurusha yogas', () => {
  it('fires for Mars exalted in Makara in a kendra', () => {
    // Mesha lagna, Mars in Makara = the 10th house, exalted.
    const chart = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Mars: [SIGN.Makara, 28] } });
    const f = find(chart, 'ruchaka');
    expect(f).toBeDefined();
    expect(f!.strength).toBe(1);
    expect(f!.grahas).toEqual(['Mars']);
  });

  it('does not fire for an exalted graha outside a kendra', () => {
    // Vrishabha lagna puts Makara in the 9th - a trikona, not a kendra.
    const chart = makeChart({ lagna: [SIGN.Vrishabha, 5], positions: { Mars: [SIGN.Makara, 28] } });
    expect(find(chart, 'ruchaka')).toBeUndefined();
  });

  it('does not fire for a graha in a kendra without dignity', () => {
    // Mars in Mithuna (Mercury's sign) in the 4th from Mesha: kendra, no dignity.
    const chart = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Mars: [SIGN.Karka, 10] } });
    expect(find(chart, 'ruchaka')).toBeUndefined();
  });

  it('scores an own-sign placement slightly below an exalted one', () => {
    const exalted = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Saturn: [SIGN.Tula, 20] } });
    const own = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Saturn: [SIGN.Makara, 15] } });
    expect(find(exalted, 'sasa')!.strength).toBe(1);
    expect(find(own, 'sasa')!.strength).toBe(0.85);
  });
});

describe('Gaja Kesari Yoga', () => {
  it('fires when Jupiter is in a kendra from the Moon', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Moon: [SIGN.Mesha, 10], Jupiter: [SIGN.Karka, 10] },   // 4th from Moon
    });
    expect(find(chart, 'gaja-kesari')).toBeDefined();
  });

  it('does not fire when Jupiter is in the 3rd from the Moon', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Moon: [SIGN.Mesha, 10], Jupiter: [SIGN.Mithuna, 10] },
    });
    expect(find(chart, 'gaja-kesari')).toBeUndefined();
  });

  it('weakens sharply when Jupiter is debilitated', () => {
    const strong = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Moon: [SIGN.Mesha, 10], Jupiter: [SIGN.Karka, 5] },     // exalted, 4th
    });
    const weak = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Moon: [SIGN.Mesha, 10], Jupiter: [SIGN.Makara, 5] },    // debilitated, 10th
    });
    expect(find(strong, 'gaja-kesari')!.strength).toBe(1);
    expect(find(weak, 'gaja-kesari')!.strength).toBe(0.4);
    expect(find(weak, 'gaja-kesari')!.cancelled).toBe(true);
  });
});

describe('Kemadruma and its cancellations', () => {
  it('fires when the Moon stands entirely alone', () => {
    // Moon in Karka; nothing in Mithuna, Karka or Simha, and no graha in a
    // kendra from the Moon or the lagna.
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: {
        Moon: [SIGN.Karka, 10],
        Mars: [SIGN.Vrischika, 10],     // 5th from Moon
        Mercury: [SIGN.Dhanu, 10],      // 6th from Moon
        Jupiter: [SIGN.Kumbha, 10],     // 8th from Moon
        Venus: [SIGN.Meena, 10],        // 9th from Moon
        Saturn: [SIGN.Dhanu, 20],       // 6th from Moon
        Sun: [SIGN.Kumbha, 20],
      },
    });
    const f = find(chart, 'kemadruma');
    expect(f).toBeDefined();
  });

  it('does not fire when a graha sits in the 2nd from the Moon', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Moon: [SIGN.Karka, 10], Venus: [SIGN.Simha, 10] },
    });
    expect(find(chart, 'kemadruma')).toBeUndefined();
  });

  it('is marked cancelled when a graha occupies a kendra from the Moon', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: {
        Moon: [SIGN.Karka, 10],
        Saturn: [SIGN.Makara, 10],       // 7th from Moon - a kendra, and not 2nd/12th
        Mars: [SIGN.Vrischika, 10],
        Mercury: [SIGN.Dhanu, 10],
        Jupiter: [SIGN.Kumbha, 10],
        Venus: [SIGN.Meena, 10],
        Sun: [SIGN.Kumbha, 20],
      },
    });
    const f = find(chart, 'kemadruma');
    expect(f).toBeDefined();
    expect(f!.cancelled).toBe(true);
  });
});

describe('Mangal Dosha', () => {
  it('fires for Mars in the 7th and reports all three reference points', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Mars: [SIGN.Tula, 10], Moon: [SIGN.Mesha, 15], Venus: [SIGN.Mesha, 20] },
    });
    const f = find(chart, 'mangal-dosha');
    expect(f).toBeDefined();
    expect(f!.strength).toBeCloseTo(1, 6);   // 7th from lagna, Moon and Venus alike
  });

  it('scores lower when the dosha holds from only one reference point', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Mars: [SIGN.Tula, 10], Moon: [SIGN.Mithuna, 15], Venus: [SIGN.Simha, 20] },
    });
    const f = find(chart, 'mangal-dosha');
    expect(f!.strength).toBeCloseTo(1 / 3, 6);
  });

  it('marks the dosha cancelled when Mars is in its own sign', () => {
    // Mars in Vrischika in the 8th from Mesha: dosha house, but own sign.
    const chart = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Mars: [SIGN.Vrischika, 10] } });
    const f = find(chart, 'mangal-dosha');
    expect(f).toBeDefined();
    expect(f!.cancelled).toBe(true);
    expect(f!.cancellations!.some((x) => x.present)).toBe(true);
  });

  it('marks the dosha cancelled when Jupiter aspects Mars', () => {
    // Mars in the 7th (Tula); Jupiter in Mesha casts its 7th aspect onto Tula.
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Mars: [SIGN.Tula, 10], Jupiter: [SIGN.Mesha, 10] },
    });
    expect(find(chart, 'mangal-dosha')!.cancelled).toBe(true);
  });

  it('does not fire for Mars in the 5th', () => {
    const chart = makeChart({ lagna: [SIGN.Mesha, 5], positions: { Mars: [SIGN.Simha, 10] } });
    expect(find(chart, 'mangal-dosha')).toBeUndefined();
  });
});

describe('Kaal Sarp Dosha', () => {
  it('fires when every physical graha lies on one side of the nodal axis', () => {
    // Rahu at 0 Mesha, Ketu at 0 Tula; all seven grahas between them.
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: {
        Rahu: [SIGN.Mesha, 0],
        Sun: [SIGN.Vrishabha, 10], Moon: [SIGN.Mithuna, 10], Mars: [SIGN.Karka, 10],
        Mercury: [SIGN.Simha, 10], Jupiter: [SIGN.Kanya, 10], Venus: [SIGN.Vrishabha, 20],
        Saturn: [SIGN.Mithuna, 20],
      },
    });
    const f = find(chart, 'kaal-sarp');
    expect(f).toBeDefined();
    expect(f!.detail).toMatch(/Anant/);      // Rahu in the 1st
  });

  it('does not fire when one graha falls outside the arc', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: {
        Rahu: [SIGN.Mesha, 0],
        Sun: [SIGN.Vrishabha, 10], Moon: [SIGN.Mithuna, 10], Mars: [SIGN.Karka, 10],
        Mercury: [SIGN.Simha, 10], Jupiter: [SIGN.Kanya, 10], Venus: [SIGN.Vrishabha, 20],
        Saturn: [SIGN.Dhanu, 20],            // on the far side
      },
    });
    expect(find(chart, 'kaal-sarp')).toBeUndefined();
  });

  it('names the form from the house Rahu occupies', () => {
    const chart = makeChart({
      lagna: [SIGN.Makara, 5],               // puts Mesha in the 4th
      positions: {
        Rahu: [SIGN.Mesha, 0],
        Sun: [SIGN.Vrishabha, 10], Moon: [SIGN.Mithuna, 10], Mars: [SIGN.Karka, 10],
        Mercury: [SIGN.Simha, 10], Jupiter: [SIGN.Kanya, 10], Venus: [SIGN.Vrishabha, 20],
        Saturn: [SIGN.Mithuna, 20],
      },
    });
    expect(find(chart, 'kaal-sarp')!.detail).toMatch(/Shankhpal/);
  });

  it('is marked cancelled when a graha sits on the axis', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: {
        Rahu: [SIGN.Mesha, 0],
        Sun: [SIGN.Mesha, 0.5],              // within a degree of Rahu
        Moon: [SIGN.Mithuna, 10], Mars: [SIGN.Karka, 10], Mercury: [SIGN.Simha, 10],
        Jupiter: [SIGN.Kanya, 10], Venus: [SIGN.Vrishabha, 20], Saturn: [SIGN.Mithuna, 20],
      },
    });
    const f = find(chart, 'kaal-sarp');
    expect(f!.cancelled).toBe(true);
    expect(f!.strength).toBe(0.5);
  });
});

describe('Raja Yoga', () => {
  it('fires when a kendra lord and a trikona lord are conjunct', () => {
    // Karka lagna: Mars owns the 5th (Vrischika) and the 10th (Mesha), so it is
    // the yogakaraka; place it with the 9th lord Jupiter.
    const chart = makeChart({
      lagna: [SIGN.Karka, 5],
      positions: { Mars: [SIGN.Mesha, 10], Jupiter: [SIGN.Mesha, 12] },
    });
    expect(find(chart, 'raja-yoga-kendra-trikona')).toBeDefined();
    expect(find(chart, 'yogakaraka-strong')).toBeDefined();
  });
});

describe('Neecha Bhanga', () => {
  it('fires for a debilitated graha whose dispositor is in a kendra', () => {
    // Sun debilitated in Tula; its dispositor Venus in a kendra from the lagna.
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Sun: [SIGN.Tula, 10], Venus: [SIGN.Karka, 10] },
    });
    const f = find(chart, 'neecha-bhanga');
    expect(f).toBeDefined();
    expect(f!.grahas).toContain('Sun');
  });

  it('does not fire when no cancellation condition is met', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Sun: [SIGN.Tula, 10], Venus: [SIGN.Vrishabha, 10] },
    });
    // Venus in the 2nd is neither a kendra from lagna nor from the Moon at 0 Mesha.
    const f = find(chart, 'neecha-bhanga');
    if (f) expect(f.grahas).not.toContain('Sun');
  });
});

describe('analysis over real charts', () => {
  const birth: BirthData = {
    year: 1990, month: 8, day: 15, hour: 10, minute: 30,
    location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
    timeAccuracy: 'Exact',
  };

  it('runs cleanly across a wide span of dates without throwing', () => {
    for (let year = 1940; year <= 2030; year += 5) {
      for (const month of [1, 4, 7, 10]) {
        const { chart } = castChart({ ...birth, year, month, day: 12 });
        const analysis = evaluateRules(chart);
        expect(Array.isArray(analysis.findings)).toBe(true);
        for (const f of analysis.findings) {
          expect(f.strength).toBeGreaterThan(0);
          expect(f.strength).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('partitions findings consistently', () => {
    const { chart } = castChart(birth);
    const a = evaluateRules(chart);
    expect(a.active.length + a.cancelled.length).toBe(a.findings.length);
    expect(a.yogas.length + a.doshas.length).toBe(a.findings.length);
  });

  it('produces a fact sheet carrying no prose beyond classical attribution', () => {
    const { chart } = castChart(birth);
    const sheet = factSheet(chart, evaluateRules(chart));
    expect(sheet.lagna.rashi).toBe(chart.lagnaRashi);
    for (const f of sheet.findings) {
      expect(f.citation).toBeTruthy();
      expect(f.classicalEffect).toBeTruthy();
    }
  });
});

describe('ChartContext helpers', () => {
  it('counts houses inclusively from a graha', () => {
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Moon: [SIGN.Mesha, 10], Jupiter: [SIGN.Karka, 10] },
    });
    const c = new ChartContext(chart);
    expect(c.houseFrom('Moon', 'Jupiter')).toBe(4);
    expect(c.inKendraFrom('Jupiter', 'Moon')).toBe(true);
  });

  it('detects sign exchange between two grahas', () => {
    // Mars in Venus's sign, Venus in Mars's sign.
    const chart = makeChart({
      lagna: [SIGN.Mesha, 5],
      positions: { Mars: [SIGN.Vrishabha, 10], Venus: [SIGN.Mesha, 10] },
    });
    expect(new ChartContext(chart).exchange('Mars', 'Venus')).toBe(true);
  });

  it('resolves house lordship from the lagna', () => {
    const c = new ChartContext(makeChart({ lagna: [SIGN.Karka, 5], positions: {} }));
    expect(c.lordOf(1)).toBe('Moon');      // Karka
    expect(c.lordOf(10)).toBe('Mars');     // Mesha
    expect(c.lordOf(5)).toBe('Mars');      // Vrischika
    expect(c.lagnaLord).toBe('Moon');
  });
});
