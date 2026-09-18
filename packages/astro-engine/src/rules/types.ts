/** Rule definition shared by yogas, doshas and any later rule family. */
import type { Graha, BhavaNumber } from '../core/types.js';
import type { ChartContext } from './context.js';

export type RuleCategory =
  | 'RajaYoga' | 'DhanaYoga' | 'MahapurushaYoga' | 'ChandraYoga'
  | 'SolarYoga' | 'NabhasaYoga' | 'AristaYoga' | 'SpiritualYoga'
  | 'ParivartanaYoga' | 'Dosha';

/** Where a rule comes from. Every rule must cite something. */
export interface Citation {
  /** Classical work, e.g. `Brihat Parashara Hora Shastra`. */
  work: string;
  /** Chapter or verse reference where available. */
  locus?: string;
  /**
   * Which stream of practice states the rule this way. Rules that traditions
   * disagree about carry different entries rather than being averaged into one.
   */
  tradition?: 'Parashari' | 'Jaimini' | 'KP' | 'TajikaAnnual' | 'FolkPractice' | 'Modern';
  /** Set when practitioners genuinely differ, with a note on how. */
  contested?: string;
}

export interface RuleResult {
  /** Grahas that actually triggered the rule, for explaining the finding. */
  grahas?: Graha[];
  houses?: BhavaNumber[];
  /** A short, chart-specific sentence describing what was found. */
  detail?: string;
  /**
   * How strongly the rule fired, 0..1. Rules that are all-or-nothing return 1.
   * Rules with degrees of fulfilment (a yoga formed by aspect rather than
   * conjunction, say) return less.
   */
  strength?: number;
  /** Conditions that would cancel this finding, and whether they are present. */
  cancellations?: { description: string; present: boolean }[];
}

export interface Rule {
  id: string;
  /** Sanskrit or conventional name. */
  name: string;
  nameHi?: string;
  category: RuleCategory;
  /** Whether the finding is favourable, difficult or mixed. */
  polarity: 'Favourable' | 'Difficult' | 'Mixed';
  citation: Citation;
  /**
   * What the classical text says this indicates.
   *
   * Written as traditional attribution, not as a claim about the person — the
   * narration layer is required to preserve that framing.
   */
  classicalEffect: string;
  /**
   * Evaluate against a chart. Return null when the rule does not fire.
   * Must be a pure function: no dates, no randomness, no I/O.
   */
  evaluate(context: ChartContext): RuleResult | null;
}

export interface Finding extends RuleResult {
  ruleId: string;
  name: string;
  nameHi?: string;
  category: RuleCategory;
  polarity: Rule['polarity'];
  citation: Citation;
  classicalEffect: string;
  /** True when a cancellation condition applies and the finding is nullified. */
  cancelled: boolean;
}
