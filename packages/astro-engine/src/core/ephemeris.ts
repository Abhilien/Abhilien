/**
 * Graha positions.
 *
 * Positions come from astronomy-engine (MIT licensed, validated against JPL
 * DE405/DE431). That choice is deliberate: the Swiss Ephemeris is AGPL, which
 * would either force this codebase open or require a commercial licence, and
 * its accuracy advantage is irrelevant here. Astrology reads charts to the
 * arcminute; this ephemeris is good to roughly an arcsecond.
 *
 * All longitudes are computed in the ecliptic of date and then reduced to
 * sidereal by subtracting the ayanamsa.
 */
import * as Astro from 'astronomy-engine';
import { norm360, norm180, DEG, RAD } from './angle.js';
import { ayanamsa } from './ayanamsa.js';
import { NAKSHATRA_SPAN, PADA_SPAN, NAKSHATRA_LORDS, GRAHAS } from './constants.js';
import type {
  Graha, GrahaPosition, RashiIndex, NakshatraIndex, Pada,
  AyanamsaSystem, NodeModel,
} from './types.js';

/** Step used for numerical differentiation of longitude, in days. */
const SPEED_DELTA_DAYS = 0.01;

const BODY_OF: Partial<Record<Graha, Astro.Body>> = {
  Sun: Astro.Body.Sun,
  Moon: Astro.Body.Moon,
  Mars: Astro.Body.Mars,
  Mercury: Astro.Body.Mercury,
  Jupiter: Astro.Body.Jupiter,
  Venus: Astro.Body.Venus,
  Saturn: Astro.Body.Saturn,
};

interface EclipticPosition {
  longitude: number;
  latitude: number;
  distanceAu?: number;
}

/** Apparent geocentric position in the ecliptic of date. */
function apparentEclipticOfDate(body: Astro.Body, time: Astro.AstroTime): EclipticPosition {
  // `true` applies light-time correction and annual aberration, giving the
  // apparent position — which is what an ephemeris for astrology must use.
  const geo = Astro.GeoVector(body, time, true);
  const ect = Astro.RotateVector(Astro.Rotation_EQJ_ECT(time), geo);
  const r = Math.hypot(ect.x, ect.y, ect.z);
  return {
    longitude: norm360(Math.atan2(ect.y, ect.x) * RAD),
    latitude: Math.asin(ect.z / r) * RAD,
    distanceAu: r,
  };
}

/**
 * Mean lunar node, referred to the mean equinox of date.
 * Meeus, Astronomical Algorithms, 2nd ed., eq. 47.7.
 *
 * The mean node is the default because every mainstream Indian panchang and
 * almost all Indian software use it; the true node can differ from it by up to
 * about 1°40', which is enough to move Rahu into a different nakshatra pada.
 */
export function meanNodeLongitude(time: Astro.AstroTime): number {
  const T = time.tt / 36525;
  return norm360(
    125.0445479
    - 1934.1362891 * T
    + 0.0020754 * T ** 2
    + T ** 3 / 467441
    - T ** 4 / 60616000,
  );
}

/**
 * True (osculating) lunar node, from the Moon's instantaneous state vector.
 *
 * The node line is perpendicular to both the ecliptic pole and the Moon's
 * orbital angular momentum h = r × v, so it lies along ẑ × h = (−h_y, h_x, 0),
 * which points to the ascending node.
 */
export function trueNodeLongitude(time: Astro.AstroTime): number {
  const state = Astro.GeoMoonState(time);
  const rot = Astro.Rotation_EQJ_ECT(time);
  const pos = Astro.RotateVector(rot, new Astro.Vector(state.x, state.y, state.z, time));
  const vel = Astro.RotateVector(rot, new Astro.Vector(state.vx, state.vy, state.vz, time));

  const hx = pos.y * vel.z - pos.z * vel.y;
  const hy = pos.z * vel.x - pos.x * vel.z;

  return norm360(Math.atan2(hx, -hy) * RAD);
}

/** Tropical longitude of a graha in the ecliptic of date. */
function tropicalLongitude(graha: Graha, time: Astro.AstroTime, nodeModel: NodeModel): number {
  if (graha === 'Rahu') {
    return nodeModel === 'True' ? trueNodeLongitude(time) : meanNodeLongitude(time);
  }
  if (graha === 'Ketu') {
    return norm360((nodeModel === 'True' ? trueNodeLongitude(time) : meanNodeLongitude(time)) + 180);
  }
  const body = BODY_OF[graha];
  if (!body) throw new Error(`No ephemeris body mapped for ${graha}`);
  return apparentEclipticOfDate(body, time).longitude;
}

/**
 * Sidereal longitude only, skipping the speed calculation.
 *
 * `grahaPosition` differentiates numerically to get daily motion, which costs
 * two extra ephemeris evaluations. Scanning decades of transits to find sign
 * ingresses needs thousands of samples and does not need speed, so this exists
 * to make that roughly three times cheaper.
 */
export function siderealLongitudeOf(
  graha: Graha,
  time: Astro.AstroTime,
  ayanamsaDegrees: number,
  nodeModel: NodeModel = 'Mean',
): number {
  return norm360(tropicalLongitude(graha, time, nodeModel) - ayanamsaDegrees);
}

/** Apparent daily motion in longitude, deg/day, by central difference. */
function longitudeSpeed(graha: Graha, time: Astro.AstroTime, nodeModel: NodeModel): number {
  const before = tropicalLongitude(graha, time.AddDays(-SPEED_DELTA_DAYS), nodeModel);
  const after = tropicalLongitude(graha, time.AddDays(SPEED_DELTA_DAYS), nodeModel);
  return norm180(after - before) / (2 * SPEED_DELTA_DAYS);
}

/** Split a sidereal longitude into its rashi / nakshatra / pada coordinates. */
export function decomposeLongitude(siderealLongitude: number): {
  rashi: RashiIndex;
  degreeInRashi: number;
  nakshatra: NakshatraIndex;
  degreeInNakshatra: number;
  pada: Pada;
  nakshatraLord: Graha;
} {
  const lon = norm360(siderealLongitude);
  const rashi = Math.floor(lon / 30) as RashiIndex;
  const nakshatra = Math.floor(lon / NAKSHATRA_SPAN) as NakshatraIndex;
  const degreeInNakshatra = lon - nakshatra * NAKSHATRA_SPAN;
  const pada = (Math.floor(degreeInNakshatra / PADA_SPAN) + 1) as Pada;
  return {
    rashi,
    degreeInRashi: lon - rashi * 30,
    nakshatra,
    degreeInNakshatra,
    pada,
    nakshatraLord: NAKSHATRA_LORDS[nakshatra]!,
  };
}

/** Full sidereal position of one graha. */
export function grahaPosition(
  graha: Graha,
  time: Astro.AstroTime,
  ayanamsaDegrees: number,
  nodeModel: NodeModel,
): GrahaPosition {
  const tropical = tropicalLongitude(graha, time, nodeModel);
  const sidereal = norm360(tropical - ayanamsaDegrees);

  let latitude = 0;
  let distanceAu: number | undefined;
  if (graha !== 'Rahu' && graha !== 'Ketu') {
    const body = BODY_OF[graha]!;
    const p = apparentEclipticOfDate(body, time);
    latitude = p.latitude;
    distanceAu = p.distanceAu;
  }

  const speed = longitudeSpeed(graha, time, nodeModel);
  const decomposed = decomposeLongitude(sidereal);

  return {
    graha,
    longitude: sidereal,
    latitude,
    ...(distanceAu === undefined ? {} : { distanceAu }),
    speed,
    // The nodes are always retrograde by convention, and the mean node is
    // retrograde by construction; the true node can briefly go direct, which we
    // report honestly rather than forcing.
    retrograde: speed < 0,
    ...decomposed,
  };
}

/** All nine grahas at one instant. */
export function computePositions(
  time: Astro.AstroTime,
  system: AyanamsaSystem,
  nodeModel: NodeModel,
): { ayanamsa: number; positions: Record<Graha, GrahaPosition> } {
  const ayan = ayanamsa(time, system);
  const positions = {} as Record<Graha, GrahaPosition>;
  for (const graha of GRAHAS) {
    positions[graha] = grahaPosition(graha, time, ayan, nodeModel);
  }
  return { ayanamsa: ayan, positions };
}

/**
 * Sidereal longitude of the ascendant (lagna).
 *
 * The ascendant is the ecliptic point rising on the eastern horizon:
 *
 *   λ = atan2( cos(θ), −(sin(θ)·cos(ε) + tan(φ)·sin(ε)) )
 *
 * where θ is local apparent sidereal time as an angle, ε the true obliquity and
 * φ the geographic latitude. Written with atan2 in this exact sign arrangement
 * the quadrant comes out right everywhere, with no correction step — including
 * in the southern hemisphere, where an "add 180 if needed" heuristic silently
 * returns the descendant instead. `test/chart.test.ts` pins this down by
 * converting the result back to horizon coordinates and asserting it really is
 * on the eastern horizon.
 */
export function ascendant(
  time: Astro.AstroTime,
  geographicLatitude: number,
  geographicLongitude: number,
  ayanamsaDegrees: number,
): { tropical: number; sidereal: number; mc: number; obliquity: number } {
  // Greenwich apparent sidereal time in hours -> local, in degrees.
  const gastHours = Astro.SiderealTime(time);
  const lst = norm360(gastHours * 15 + geographicLongitude);

  const eps = trueObliquity(time) * DEG;
  const phi = geographicLatitude * DEG;
  const theta = lst * DEG;

  const asc = norm360(Math.atan2(
    Math.cos(theta),
    -(Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
  ) * RAD);

  // The ecliptic point on the meridian: the point whose right ascension is the
  // local sidereal time.
  const mc = norm360(Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(eps)) * RAD);

  return {
    tropical: asc,
    sidereal: norm360(asc - ayanamsaDegrees),
    mc: norm360(mc - ayanamsaDegrees),
    obliquity: eps * RAD,
  };
}

/** True obliquity of the ecliptic (mean obliquity plus nutation), in degrees. */
export function trueObliquity(time: Astro.AstroTime): number {
  // astronomy-engine exposes the rotation to the true ecliptic of date; the
  // obliquity is recoverable from how it tilts the equatorial pole.
  const rot = Astro.Rotation_EQJ_ECT(time);
  const poleEqd = Astro.RotateVector(
    Astro.Rotation_EQD_EQJ(time),
    new Astro.Vector(0, 0, 1, time),
  );
  const poleEct = Astro.RotateVector(rot, poleEqd);
  return Math.acos(Math.max(-1, Math.min(1, poleEct.z))) * RAD;
}
