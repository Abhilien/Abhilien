/**
 * Ayanamsa — the offset between the tropical zodiac (measured from the moving
 * vernal equinox) and the sidereal zodiac that Jyotish actually uses.
 *
 * Two families are implemented, and they differ in a way worth understanding:
 *
 *  - Precession-anchored ayanamsas (Lahiri, Raman, KP, Yukteshwar) fix the
 *    sidereal zero point by decree at one epoch and carry it forward with
 *    accumulated general precession in longitude. They are referred to the MEAN
 *    equinox, so they advance smoothly at ~50.29"/yr with no wobble. This is
 *    what published Lahiri tables show, and reproducing that smoothness is how
 *    we know the model is right.
 *
 *  - Star-anchored ayanamsas (True Chitra) are defined by an actual star's
 *    position, so they inherit nutation and wobble by up to ±17".
 *
 * Verified against published Lahiri values: the model reproduces 1900, 1950,
 * 2000 and 2020 to within 13 arcseconds. For scale, one nakshatra pada spans
 * 12000 arcseconds, so this is about 0.1% of the finest division in ordinary
 * use. See `test/ayanamsa.test.ts`.
 */
import * as Astro from 'astronomy-engine';
import { norm360, DEG, RAD } from './angle.js';
import type { AyanamsaSystem } from './types.js';

/**
 * Accumulated general precession in longitude, arcseconds, referred to the mean
 * equinox. IAU 2006 (Capitaine et al.). T = Julian centuries TT from J2000.0.
 */
export function generalPrecessionArcsec(T: number): number {
  return 5028.796195 * T
       + 1.1054348 * T ** 2
       + 0.00007964 * T ** 3
       - 0.000023857 * T ** 4
       - 0.0000000383 * T ** 5;
}

/** Epoch + value definitions for the precession-anchored ayanamsas. */
interface Anchor {
  /** Julian Day (TT) at which the ayanamsa had the stated value. */
  jd: number;
  /** Ayanamsa in degrees at that epoch. */
  degrees: number;
  /** Where the number comes from, so the choice is auditable. */
  source: string;
}

const ANCHORS: Record<Exclude<AyanamsaSystem, 'TrueChitra'>, Anchor> = {
  // Chitrapaksha ayanamsa as adopted by the Calendar Reform Committee (1955) and
  // used by the Rashtriya Panchang. Same epoch constant as Swiss Ephemeris
  // SE_SIDM_LAHIRI, so charts agree with mainstream Indian software.
  Lahiri: {
    jd: 2415020.0, degrees: 22.460148,
    source: 'Calendar Reform Committee / Rashtriya Panchang; epoch value as in Swiss Ephemeris SE_SIDM_LAHIRI',
  },
  // B. V. Raman's value, roughly 1.4 degrees behind Lahiri.
  Raman: {
    jd: 2415020.0, degrees: 21.010,
    source: 'B. V. Raman, Hindu Predictive Astrology; Swiss Ephemeris SE_SIDM_RAMAN',
  },
  // K. S. Krishnamurti's value, about 5 arcminutes behind Lahiri.
  KP: {
    jd: 2415020.0, degrees: 22.363789,
    source: 'K. S. Krishnamurti, KP Reader; Swiss Ephemeris SE_SIDM_KRISHNAMURTI',
  },
  // Stated directly by Sri Yukteshwar in The Holy Science (1894): 20°54'36".
  Yukteshwar: {
    jd: 2412874.5, degrees: 20.91,
    source: 'Swami Sri Yukteshwar, The Holy Science (1894), preface',
  },
};

/** Spica (alpha Virginis / Chitra) in ICRS at J2000.0, with proper motion. */
const SPICA = {
  raDeg: 201.2982473,      // 13h 25m 11.579s
  decDeg: -11.1613235,     // -11° 09' 40.75"
  pmRaCosDecMasPerYr: -42.35,
  pmDecMasPerYr: -30.67,
};

/**
 * True Chitra Paksha: the ayanamsa for which Spica sits at exactly 180°00'00"
 * sidereal. Computed from the star's actual precessed position rather than from
 * a fitted constant, so it stays correct outside the range any table covers.
 */
function trueChitraAyanamsa(time: Astro.AstroTime): number {
  const yearsFromJ2000 = time.tt / 365.25;
  const masToDeg = 1 / 3_600_000;

  const dec = SPICA.decDeg + SPICA.pmDecMasPerYr * yearsFromJ2000 * masToDeg;
  const ra = SPICA.raDeg +
    (SPICA.pmRaCosDecMasPerYr / Math.cos(SPICA.decDeg * DEG)) * yearsFromJ2000 * masToDeg;

  // Unit vector in the J2000 equatorial frame, then rotated to the ecliptic of date.
  const cd = Math.cos(dec * DEG);
  const eqj = new Astro.Vector(
    cd * Math.cos(ra * DEG),
    cd * Math.sin(ra * DEG),
    Math.sin(dec * DEG),
    time,
  );
  const ect = Astro.RotateVector(Astro.Rotation_EQJ_ECT(time), eqj);
  const spicaLongitude = norm360(Math.atan2(ect.y, ect.x) * RAD);
  return norm360(spicaLongitude - 180);
}

/** Ayanamsa in degrees for the given system at the given time. */
export function ayanamsa(time: Astro.AstroTime, system: AyanamsaSystem = 'Lahiri'): number {
  if (system === 'TrueChitra') return trueChitraAyanamsa(time);

  const anchor = ANCHORS[system];
  const tNow = time.tt / 36525;                          // centuries TT from J2000
  const tAnchor = (anchor.jd - 2451545.0) / 36525;
  const advance = generalPrecessionArcsec(tNow) - generalPrecessionArcsec(tAnchor);
  return norm360(anchor.degrees + advance / 3600);
}

/** Provenance of an ayanamsa definition, for display in a "why this number" panel. */
export function ayanamsaSource(system: AyanamsaSystem): string {
  if (system === 'TrueChitra') {
    return 'Defined so that Spica (Chitra) is exactly 180°00\'00" sidereal; computed from the star\'s precessed position.';
  }
  return ANCHORS[system].source;
}

/** Convert an apparent tropical longitude to sidereal. */
export function toSidereal(tropicalLongitude: number, ayanamsaDegrees: number): number {
  return norm360(tropicalLongitude - ayanamsaDegrees);
}
