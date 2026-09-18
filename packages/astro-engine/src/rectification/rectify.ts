/**
 * Birth-time rectification.
 *
 * Most people in India do not know their birth time to the minute, and the
 * ascendant moves a degree every four minutes. Rectification works backwards:
 * given events whose dates the person does know, find the birth time whose
 * chart best explains them.
 *
 * The signal this exploits is not the ascendant — it is the dasha. The Moon
 * moves about half a degree an hour, and because the Vimshottari balance is a
 * proportion of the Moon's position within its nakshatra, a two-hour
 * uncertainty in birth time moves later dasha boundaries by roughly eleven
 * months. That works out to about 2.7 days of dasha shift per minute of birth
 * time, which makes dasha timing a far sharper discriminator than the rising
 * sign. A single well-dated event therefore constrains the birth time much more
 * tightly than intuition suggests.
 *
 * The output is a ranked list with an explicit confidence, and the confidence is
 * allowed to be "inconclusive". A rectification tool that always returns a
 * confident minute is not measuring anything.
 */
import * as Astro from 'astronomy-engine';
import { castChart } from '../chart/kundali.js';
import { dashaChainAt } from '../dasha/vimshottari.js';
import { grahaPosition } from '../core/ephemeris.js';
import { ayanamsa } from '../core/ayanamsa.js';
import { vargaSign } from '../chart/varga.js';
import { aspectedRashis } from '../chart/aspects.js';
import {
  GRAHA_OWNED_RASHIS, RASHI_NAMES_SA, GRAHA_NAMES_EN, NAKSHATRA_LORDS,
} from '../core/constants.js';
import { ordinal } from '../core/format.js';
import {
  EVENT_SIGNATURES, PRECISION_WEIGHT,
  type LifeEvent, type EventSignature,
} from './events.js';
import type {
  BirthData, Kundali, Graha, RashiIndex, BhavaNumber,
} from '../core/types.js';

export interface RectificationOptions {
  /** Half-width of the search window around the stated time, in minutes. */
  windowMinutes?: number;
  /** Spacing between candidate times, in minutes. */
  stepMinutes?: number;
}

export interface EventMatch {
  event: LifeEvent;
  label: string;
  score: number;
  /** Why this candidate scored on this event, in readable form. */
  reasons: string[];
}

export interface Candidate {
  hour: number;
  minute: number;
  utcISO: string;
  lagnaRashi: RashiIndex;
  lagnaRashiName: string;
  lagnaDegree: number;
  /** Navamsa ascendant — the finest division in ordinary use, and the real test
   *  of whether a rectification has resolved anything. */
  navamsaLagna: RashiIndex;
  score: number;
  matches: EventMatch[];
}

/**
 * How much the events actually constrain the birth minute.
 *
 * There is deliberately no "Strong" or "Certain" tier. This was measured, not
 * assumed: scoring twelve sets of RANDOM event dates against the same chart
 * produced peaks that stood 1.1-2.7 standard deviations above their window
 * mean, while a synthetic true history scored only 1.2. Noise routinely
 * out-scored signal. Per-event agreement failed the same way (noise 0.76-0.96,
 * signal 0.93). The only measure that separated them at all was leave-one-out
 * stability (signal 13.5 minutes, noise median 50), and even that was beaten by
 * noise in 3 of 12 trials.
 *
 * So the honest ceiling for this method is "worth a practitioner's review".
 * `Indicative` clears a bar that random dates also cleared in roughly one trial
 * in six, and the verdict says so. A rectification tool that returns a
 * confident minute whatever you feed it is not measuring anything.
 */
export type RectificationConfidence = 'Indicative' | 'Weak' | 'Inconclusive';

/**
 * How well the rising sign is determined, reported separately from the minute.
 *
 * These come apart constantly and it matters: a run of candidate times can
 * score identically while all giving the same ascendant. The chart is then
 * settled even though the birth minute is not, and a practitioner can work with
 * that. Collapsing both into one number throws the useful half away.
 */
export type LagnaConfidence = 'Certain' | 'Likely' | 'Unresolved';

export interface RectificationResult {
  candidates: Candidate[];
  /** Midpoint of the highest-scoring plateau, not an arbitrary tie-break. */
  best: Candidate;
  confidence: RectificationConfidence;
  /** Confidence in the rising sign alone, which is often much higher — and is
   *  the output of this module that can actually be relied on. */
  lagnaConfidence: LagnaConfidence;
  /** Width of the top-scoring plateau in minutes: the resolution of the score itself. */
  resolutionMinutes: number;
  /**
   * Spread, in minutes, of the best time when each event is dropped in turn.
   *
   * This is the honest error bar. If removing any single event moves the answer
   * by an hour, the answer was fitting that event rather than measuring a
   * birth time.
   */
  stabilityMinutes: number;
  /** How far the best score stands above the field, in standard deviations. */
  separation: number;
  /** Distribution of rising signs among the strongest candidates. */
  lagnaConsensus: { rashi: RashiIndex; name: string; share: number }[];
  /** Distribution of navamsa ascendants among the strongest candidates. */
  navamsaConsensus: { rashi: RashiIndex; name: string; share: number }[];
  /** Span of the strongest candidates, in minutes. */
  spreadMinutes: number;
  verdict: string;
}

/** How strongly one graha is tied to an event's houses. */
function connectionScore(
  chart: Kundali, graha: Graha, signature: EventSignature,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const lagna = chart.lagnaRashi;
  const houseOfSign = (sign: RashiIndex): BhavaNumber =>
    ((((sign - lagna + 12) % 12) + 1) as BhavaNumber);

  const owned = GRAHA_OWNED_RASHIS[graha].map(houseOfSign);
  const occupied = chart.grahaBhava[graha];
  const aspected = aspectedRashis(graha, chart.positions[graha].rashi).map(houseOfSign);
  const name = GRAHA_NAMES_EN[graha];

  for (const house of signature.primary) {
    if (owned.includes(house)) {
      score += 3; reasons.push(`${name} rules the ${ordinal(house)}`);
    }
    if (occupied === house) {
      score += 2; reasons.push(`${name} sits in the ${ordinal(house)}`);
    }
    if (aspected.includes(house)) {
      score += 1; reasons.push(`${name} aspects the ${ordinal(house)}`);
    }
  }

  for (const house of signature.secondary) {
    if (owned.includes(house)) {
      score += 1.5; reasons.push(`${name} rules the ${ordinal(house)}`);
    }
    if (occupied === house) {
      score += 1; reasons.push(`${name} sits in the ${ordinal(house)}`);
    }
  }

  if (graha === signature.karaka) {
    score += 2; reasons.push(`${name} is the natural significator`);
  }

  // A graha also acts for the lord of the nakshatra it occupies, which is how
  // an otherwise unconnected dasha lord can still deliver an event.
  const nakshatraLord = NAKSHATRA_LORDS[chart.positions[graha].nakshatra]!;
  if (nakshatraLord !== graha) {
    const lordOwns = GRAHA_OWNED_RASHIS[nakshatraLord].map(houseOfSign);
    if (signature.primary.some((house) => lordOwns.includes(house))) {
      score += 1;
      reasons.push(`${name} is in a nakshatra of ${GRAHA_NAMES_EN[nakshatraLord]}, which rules a house of this matter`);
    }
  }

  return { score, reasons };
}

/** Sidereal signs of the slow transiting grahas at one moment. */
function transitSigns(date: Date): { Jupiter: RashiIndex; Saturn: RashiIndex } {
  const time = Astro.MakeTime(date);
  const ayan = ayanamsa(time, 'Lahiri');
  return {
    Jupiter: grahaPosition('Jupiter', time, ayan, 'Mean').rashi,
    Saturn: grahaPosition('Saturn', time, ayan, 'Mean').rashi,
  };
}

/**
 * Weights by dasha level: the mahadasha sets the theme, the antardasha triggers.
 *
 * Depth 5 was tried on the theory that sookshma and prana boundaries move by
 * hours per minute of birth time and should therefore carry the real
 * resolution. Measured against a null of random event dates it made no
 * difference (see the calibration note on `confidence` below), so the extra
 * levels are not worth their cost.
 */
const LEVEL_WEIGHT = [1.0, 1.2, 0.5];

function scoreEvent(
  chart: Kundali,
  event: LifeEvent,
  transits: { Jupiter: RashiIndex; Saturn: RashiIndex },
): EventMatch {
  const signature = EVENT_SIGNATURES[event.type];
  const chain = dashaChainAt(chart, event.date, { depth: 3 });

  let score = 0;
  const reasons: string[] = [];

  chain.forEach((period, level) => {
    const weight = LEVEL_WEIGHT[level] ?? 0;
    if (weight === 0) return;
    const { score: connection, reasons: why } = connectionScore(chart, period.lord, signature);
    if (connection > 0) {
      score += weight * connection;
      const levelName = ['Mahadasha', 'Antardasha', 'Pratyantardasha'][level];
      reasons.push(`${levelName} of ${GRAHA_NAMES_EN[period.lord]}: ${why.join('; ')}`);
    }
  });

  // Transit confirmation. Jupiter crossing a house of the matter is the
  // classical trigger; Saturn crossing it is the classical delay or weight.
  const houseOfSign = (sign: RashiIndex): BhavaNumber =>
    ((((sign - chart.lagnaRashi + 12) % 12) + 1) as BhavaNumber);

  const jupiterHouse = houseOfSign(transits.Jupiter);
  const saturnHouse = houseOfSign(transits.Saturn);

  if (signature.primary.includes(jupiterHouse)) {
    score += 2;
    reasons.push(`Jupiter was transiting the ${ordinal(jupiterHouse)} at the time`);
  }
  if (signature.primary.includes(saturnHouse)) {
    score += 1;
    reasons.push(`Saturn was transiting the ${ordinal(saturnHouse)} at the time`);
  }

  const weighted = score * PRECISION_WEIGHT[event.precision ?? 'Day'];
  return { event, label: signature.label, score: weighted, reasons };
}

/**
 * Spread of the best time when each event is dropped in turn.
 *
 * Cross-validation, computed for free: every candidate already carries its
 * per-event scores, so a leave-one-out total is a subtraction rather than
 * another search. A result that swings by an hour when one event is removed was
 * fitting that event, not locating a birth.
 */
function leaveOneOutSpread(candidates: Candidate[]): number {
  const count = candidates[0]?.matches.length ?? 0;
  if (count < 2) return Number.POSITIVE_INFINITY;

  const minuteOf = (c: Candidate) => c.hour * 60 + c.minute;
  const bests: number[] = [];

  for (let drop = 0; drop < count; drop++) {
    let bestScore = -Infinity;
    let plateau: number[] = [];
    for (const candidate of candidates) {
      let total = 0;
      for (let i = 0; i < count; i++) {
        if (i !== drop) total += candidate.matches[i]?.score ?? 0;
      }
      if (total > bestScore + 1e-9) { bestScore = total; plateau = [minuteOf(candidate)]; }
      else if (Math.abs(total - bestScore) < 1e-9) plateau.push(minuteOf(candidate));
    }
    bests.push((Math.min(...plateau) + Math.max(...plateau)) / 2);
  }

  return Math.max(...bests) - Math.min(...bests);
}

/** Distribution of a categorical property among a set of candidates. */
function consensus(
  candidates: Candidate[], pick: (c: Candidate) => RashiIndex,
): { rashi: RashiIndex; name: string; share: number }[] {
  const counts = new Map<RashiIndex, number>();
  for (const c of candidates) {
    const key = pick(c);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([rashi, n]) => ({ rashi, name: RASHI_NAMES_SA[rashi]!, share: n / candidates.length }))
    .sort((a, b) => b.share - a.share);
}

/**
 * Search for the birth time that best explains the supplied events.
 *
 * `birth.hour` and `birth.minute` are treated as the centre of the search, not
 * as fact.
 */
export function rectify(
  birth: BirthData,
  events: LifeEvent[],
  options: RectificationOptions = {},
): RectificationResult {
  const window = options.windowMinutes ?? 60;
  const step = options.stepMinutes ?? 1;

  if (events.length === 0) {
    throw new Error('rectification needs at least one dated life event');
  }

  const statedMinutes = birth.hour * 60 + birth.minute;
  const birthDay = Date.UTC(birth.year, birth.month - 1, birth.day);

  // Transits do not depend on the birth time, so they are computed once per
  // event rather than once per candidate — this is most of the speed.
  const transitsByEvent = events.map((e) => transitSigns(e.date));

  const candidates: Candidate[] = [];

  for (let offset = -window; offset <= window; offset += step) {
    const total = statedMinutes + offset;
    // Stay inside the stated calendar day: a birth time that crosses midnight
    // is a different date, which the person would have told us.
    if (total < 0 || total > 24 * 60 - 1) continue;

    const hour = Math.floor(total / 60);
    const minute = total % 60;

    const { chart } = castChart({ ...birth, hour, minute, second: 0 });

    // Events must postdate the birth, or they say nothing about it.
    const usable = events
      .map((event, i) => ({ event, transits: transitsByEvent[i]! }))
      .filter(({ event }) => event.date.getTime() > new Date(chart.utcISO).getTime());

    const matches = usable.map(({ event, transits }) => scoreEvent(chart, event, transits));
    const score = matches.reduce((sum, m) => sum + m.score, 0);

    candidates.push({
      hour,
      minute,
      utcISO: chart.utcISO,
      lagnaRashi: chart.lagnaRashi,
      lagnaRashiName: RASHI_NAMES_SA[chart.lagnaRashi]!,
      lagnaDegree: chart.lagna % 30,
      navamsaLagna: vargaSign(chart.lagna, 'D9'),
      score,
      matches,
    });
  }

  if (candidates.length === 0) {
    throw new Error('the search window produced no candidate times within the birth date');
  }

  // Ranked by score, but ties are common and must not be broken by sort order.
  candidates.sort((a, b) => b.score - a.score || (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

  // The top of the field is usually a plateau of equal-scoring minutes rather
  // than a single winner, because the dasha chain does not change within it.
  // The midpoint of that plateau is the defensible point estimate, and its
  // width is the resolution actually achieved.
  const topScore = candidates[0]!.score;
  const EPSILON = 1e-9;
  const plateau = candidates
    .filter((c) => Math.abs(c.score - topScore) < EPSILON)
    .sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

  const plateauStart = plateau[0]!.hour * 60 + plateau[0]!.minute;
  const plateauEnd = plateau[plateau.length - 1]!.hour * 60 + plateau[plateau.length - 1]!.minute;
  const resolutionMinutes = plateauEnd - plateauStart;
  const midpoint = Math.round((plateauStart + plateauEnd) / 2);
  const best = plateau.find((c) => c.hour * 60 + c.minute === midpoint) ?? plateau[0]!;

  // How far the winner stands above the field.
  const scores = candidates.map((c) => c.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stdev = Math.sqrt(variance);
  const separation = stdev === 0 ? 0 : (best.score - mean) / stdev;

  // The strongest tenth of the field, which is what "agreement" is measured over.
  const topCount = Math.max(3, Math.ceil(candidates.length / 10));
  const top = candidates.slice(0, topCount);

  const lagnaConsensus = consensus(top, (c) => c.lagnaRashi);
  const navamsaConsensus = consensus(top, (c) => c.navamsaLagna);

  const topMinutes = top.map((c) => c.hour * 60 + c.minute);
  const spreadMinutes = Math.max(...topMinutes) - Math.min(...topMinutes);

  const usableEvents = events.filter(
    (e) => e.date.getTime() > new Date(best.utcISO).getTime(),
  ).length;
  const effectiveEvents = events.reduce(
    (sum, e) => sum + PRECISION_WEIGHT[e.precision ?? 'Day'], 0,
  );

  const lagnaShare = lagnaConsensus[0]?.share ?? 0;

  // The rising sign is settled whenever the strong candidates agree on it, even
  // if they disagree about the minute. This is the part of the result that can
  // actually be relied on, so it is judged on its own terms.
  const lagnaConfidence: LagnaConfidence =
    lagnaShare >= 0.99 ? 'Certain' : lagnaShare >= 0.75 ? 'Likely' : 'Unresolved';

  const stabilityMinutes = leaveOneOutSpread(candidates);

  // Gated on stability rather than on how far the peak stands above the window
  // mean, because that second measure was found to be higher for random dates
  // than for a real history. See the note on RectificationConfidence.
  let confidence: RectificationConfidence;
  if (usableEvents < 3 || effectiveEvents < 3) {
    confidence = 'Inconclusive';
  } else if (stabilityMinutes <= 8 && usableEvents >= 6 && effectiveEvents >= 6) {
    confidence = 'Indicative';
  } else if (stabilityMinutes <= 25 && usableEvents >= 4) {
    confidence = 'Weak';
  } else {
    confidence = 'Inconclusive';
  }

  return {
    candidates,
    best,
    confidence,
    lagnaConfidence,
    resolutionMinutes,
    stabilityMinutes,
    separation,
    lagnaConsensus,
    navamsaConsensus,
    spreadMinutes,
    verdict: buildVerdict({
      best, confidence, lagnaConfidence, resolutionMinutes, stabilityMinutes,
      lagnaConsensus, navamsaConsensus, spreadMinutes,
      usableEvents, totalEvents: events.length, window,
    }),
  };
}

function buildVerdict(input: {
  best: Candidate;
  confidence: RectificationConfidence;
  lagnaConfidence: LagnaConfidence;
  resolutionMinutes: number;
  stabilityMinutes: number;
  lagnaConsensus: { name: string; share: number }[];
  navamsaConsensus: { name: string; share: number }[];
  spreadMinutes: number;
  usableEvents: number;
  totalEvents: number;
  window: number;
}): string {
  const {
    best, confidence, lagnaConfidence, stabilityMinutes,
    lagnaConsensus, navamsaConsensus, usableEvents, totalEvents, window,
  } = input;

  const time = `${String(best.hour).padStart(2, '0')}:${String(best.minute).padStart(2, '0')}`;
  const lagna = lagnaConsensus[0];
  const navamsa = navamsaConsensus[0];
  const pct = (share: number | undefined) => Math.round((share ?? 0) * 100);

  // The ascendant is reported on its own, because it is often settled even when
  // the minute is not — and unlike the minute, it is something the reader can
  // actually use.
  const lagnaNote = lagnaConfidence === 'Certain'
    ? `The ascendant, though, is settled: every one of the strongest candidates gives `
      + `${lagna?.name}, so the chart can be read even where the minute cannot be pinned down.`
    : lagnaConfidence === 'Likely'
      ? `The ascendant is probably ${lagna?.name}, which ${pct(lagna?.share)}% of the strongest `
        + `candidates give, but it is not settled.`
      : `The ascendant is not settled either: the strongest candidates split across `
        + `${lagnaConsensus.slice(0, 3).map((l) => l.name).join(', ')}.`;

  if (confidence === 'Inconclusive') {
    const reason = usableEvents < 3
      ? `Only ${usableEvents} of the ${totalEvents} events supplied fall after the birth and are `
        + `dated precisely enough to be usable. This needs at least three, and works far better `
        + `with six or more, all dated to the day.`
      : `Dropping any single event moves the answer by up to ${Math.round(stabilityMinutes)} `
        + `minutes, which means the result is following one event rather than locating a birth time.`;
    return `The birth minute could not be narrowed down. ${reason} ${lagnaNote}`;
  }

  const strength = confidence === 'Indicative'
    ? `The events are mutually consistent: dropping any one of them moves the answer by at most `
      + `${Math.round(stabilityMinutes)} minutes.`
    : `The events lean this way, but weakly — dropping any one of them moves the answer by up to `
      + `${Math.round(stabilityMinutes)} minutes.`;

  return `Best fit: ${time}, giving a ${best.lagnaRashiName} ascendant at `
    + `${best.lagnaDegree.toFixed(1)}\u00b0, with a ${navamsa?.name} navamsa ascendant in `
    + `${pct(navamsa?.share)}% of the strongest candidates. ${strength} ${lagnaNote}\n\n`
    + `Read this as a shortlist for review, not a determination. Tested against sets of random `
    + `event dates, this same bar was cleared about one time in six, so a result at this level is `
    + `suggestive rather than established. It was searched over \u00b1${window} minutes using `
    + `${usableEvents} events; adding more day-dated events is what would sharpen it.`;
}
