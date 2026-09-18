/**
 * Time conversion.
 *
 * This module exists because the single most common cause of a wrong Indian
 * horoscope is a mishandled birth-time offset. India did not use a uniform
 * +05:30 until 1955-56: Calcutta ran on HMT (+05:53:20), Bombay on BST
 * (+04:51), and the whole country observed +06:30 war time from Sept 1942 to
 * Oct 1945. A chart cast with a hardcoded +05:30 for a 1943 Kolkata birth is
 * an hour wrong, which moves the ascendant by roughly half a sign.
 *
 * We therefore never accept a numeric UTC offset from the caller: we take an
 * IANA zone id and resolve the offset that was actually in force at that
 * instant, using the tzdata shipped with the host's Intl implementation.
 */

/** Unix epoch as a Julian Day Number. */
const UNIX_EPOCH_JD = 2440587.5;

export interface ResolvedInstant {
  /** The UTC instant the local wall-clock time corresponds to. */
  date: Date;
  /** Offset actually in force, in seconds east of UTC. Seconds rather than
   *  minutes because several historical Indian offsets are not whole minutes:
   *  Madras time was +05:21:10 and Calcutta HMT was +05:53:20. Rounding those
   *  to the minute moves the ascendant by a couple of arcminutes. */
  offsetSeconds: number;
  /** True when the wall-clock time occurs twice (DST fall-back). We return the
   *  earlier of the two; callers may want to warn. */
  ambiguous: boolean;
  /** True when the wall-clock time does not exist (DST spring-forward gap).
   *  We return the instant the clock jumped to. */
  nonexistent: boolean;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        era: 'short',
      });
    } catch {
      throw new Error(
        `Unknown IANA time zone "${timeZone}". Use an identifier such as "Asia/Kolkata". ` +
        `Numeric offsets are rejected on purpose: they produce wrong charts for ` +
        `historical dates.`,
      );
    }
    partsCache.set(timeZone, f);
  }
  return f;
}

/** The offset in force in `timeZone` at the given UTC instant, in seconds east. */
export function zoneOffsetSeconds(instant: Date, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (t: string) => {
    const p = parts.find((x) => x.type === t);
    return p ? p.value : '';
  };
  const year = Number(get('year'));
  // `era` is requested so that BCE dates are not silently folded onto CE.
  const bce = get('era').toLowerCase().startsWith('b');
  const asUTC = Date.UTC(
    2000, Number(get('month')) - 1, Number(get('day')),
    Number(get('hour')), Number(get('minute')), Number(get('second')),
  );
  const d = new Date(asUTC);
  // Astronomical year numbering: 1 BCE -> 0, 2 BCE -> -1.
  d.setUTCFullYear(bce ? 1 - year : year);
  return Math.round((d.getTime() - instant.getTime()) / 1000);
}

/** Convenience wrapper for display. */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  return zoneOffsetSeconds(instant, timeZone) / 60;
}

/**
 * Convert a local wall-clock date/time in an IANA zone to the UTC instant.
 *
 * Fixed-point iteration: the offset depends on the instant, and the instant
 * depends on the offset. Two passes settle every real-world zone; a third
 * confirms convergence and detects gap/overlap cases.
 */
export function zonedTimeToUTC(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  timeZone: string,
): ResolvedInstant {
  const wall = Date.UTC(2000, month - 1, day, hour, minute, Math.floor(second),
    Math.round((second % 1) * 1000));
  const wallDate = new Date(wall);
  wallDate.setUTCFullYear(year);
  const target = wallDate.getTime();

  let guess = target;
  let offset = 0;
  for (let i = 0; i < 3; i++) {
    offset = zoneOffsetSeconds(new Date(guess), timeZone);
    const next = target - offset * 1000;
    if (next === guess) break;
    guess = next;
  }

  // Verify the round trip: if re-reading the instant does not reproduce the
  // requested wall-clock time, we are in a DST gap.
  const check = zoneOffsetSeconds(new Date(guess), timeZone);
  const nonexistent = check !== offset;

  // Overlap: the clock was set back, so this wall-clock reading happens twice.
  // We return the earlier instant, which is the convention birth records assume.
  const ambiguous = !nonexistent &&
    zoneOffsetSeconds(new Date(guess - 3600000), timeZone) !== offset;

  return { date: new Date(guess), offsetSeconds: check, ambiguous, nonexistent };
}

/** Julian Day (UT) for a JS Date. */
export function dateToJulianDay(date: Date): number {
  return date.getTime() / 86400000 + UNIX_EPOCH_JD;
}

/** Inverse of `dateToJulianDay`. */
export function julianDayToDate(jd: number): Date {
  return new Date((jd - UNIX_EPOCH_JD) * 86400000);
}

/** Julian centuries from J2000.0. */
export function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

/**
 * ΔT = TT − UT1 in seconds, via the Espenak & Meeus polynomial set used by
 * NASA's eclipse canon. Accurate to a second or so over the range that matters
 * for birth charts, and gracefully extrapolated outside it.
 *
 * Note: this is exposed for reporting and for callers doing their own
 * reductions. The chart pipeline itself uses astronomy-engine's internal ΔT so
 * that positions and times stay mutually consistent.
 */
export function deltaTSeconds(jd: number): number {
  const y = jdToDecimalYear(jd);
  let dt: number;
  if (y < -500) {
    const u = (y - 1820) / 100;
    dt = -20 + 32 * u * u;
  } else if (y < 500) {
    const u = y / 100;
    dt = 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3
       - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  } else if (y < 1600) {
    const u = (y - 1000) / 100;
    dt = 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3
       - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  } else if (y < 1700) {
    const t = y - 1600;
    dt = 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129;
  } else if (y < 1800) {
    const t = y - 1700;
    dt = 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (y < 1860) {
    const t = y - 1800;
    dt = 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3
       - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5
       - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  } else if (y < 1900) {
    const t = y - 1860;
    dt = 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3
       - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  } else if (y < 1920) {
    const t = y - 1900;
    dt = -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (y < 1941) {
    const t = y - 1920;
    dt = 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3;
  } else if (y < 1961) {
    const t = y - 1950;
    dt = 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  } else if (y < 1986) {
    const t = y - 1975;
    dt = 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  } else if (y < 2005) {
    const t = y - 2000;
    dt = 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3
       + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  } else if (y < 2050) {
    const t = y - 2000;
    dt = 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  } else if (y < 2150) {
    const u = (y - 1820) / 100;
    dt = -20 + 32 * u * u - 0.5628 * (2150 - y);
  } else {
    const u = (y - 1820) / 100;
    dt = -20 + 32 * u * u;
  }
  return dt;
}

function jdToDecimalYear(jd: number): number {
  const d = julianDayToDate(jd);
  const year = d.getUTCFullYear();
  const start = Date.UTC(2000, 0, 1);
  const s = new Date(start); s.setUTCFullYear(year);
  const e = new Date(start); e.setUTCFullYear(year + 1);
  return year + (d.getTime() - s.getTime()) / (e.getTime() - s.getTime());
}

/**
 * Historical offsets that a naive implementation gets wrong. Exposed so the UI
 * can warn a user entering an old Indian birth date, and so tests can assert
 * that the host tzdata actually knows about them.
 */
export const INDIA_HISTORICAL_NOTES: readonly {
  from: string; to: string; note: string;
}[] = [
  { from: '1870-01-01', to: '1906-01-01',
    note: 'Madras time (+05:21:14) served as the de facto Indian railway standard.' },
  { from: '1906-01-01', to: '1942-09-01',
    note: 'IST +05:30 adopted, but Calcutta kept HMT +05:53:20 and Bombay kept +04:51 locally.' },
  { from: '1942-09-01', to: '1945-10-15',
    note: 'Wartime clocks: +06:30 across India.' },
  { from: '1945-10-15', to: '1955-01-01',
    note: 'Back to +05:30, with Calcutta on +05:53:20 until 1948 and Bombay on +04:51 until 1955.' },
] as const;
