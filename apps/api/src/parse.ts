/**
 * Validating birth data that arrives over the wire.
 *
 * Its own module so it can be tested without starting a listener, which is
 * exactly the kind of friction that leaves a boundary check untested.
 */
import type { BirthData, TimeAccuracy } from '@jyotish/engine';

const TIME_ACCURACIES: TimeAccuracy[] = [
  'Exact', 'ToMinute', 'ToFiveMin', 'ToFifteenMin', 'ToHour', 'ToPartOfDay', 'Unknown',
];

export function parseBirth(value: unknown): BirthData {
  const b = value as Partial<BirthData>;
  const loc = b?.location;
  if (
    typeof b?.year !== 'number' || typeof b?.month !== 'number' || typeof b?.day !== 'number'
    || typeof b?.hour !== 'number' || typeof b?.minute !== 'number'
    || !loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number'
    || typeof loc.timezone !== 'string'
  ) {
    throw new Error(
      'birth must supply year, month, day, hour, minute and a location with '
      + 'latitude, longitude and an IANA timezone',
    );
  }
  if (Math.abs(loc.latitude) > 90 || Math.abs(loc.longitude) > 180) {
    throw new Error('latitude must be within +/-90 and longitude within +/-180');
  }
  // How sure the time is decides whether the ascendant, the houses and every
  // varga are presented as fact. A typo here used to pass straight through the
  // `as BirthData` cast below and read as "known to the minute", which would put
  // a confident rising sign in front of someone whose time is a guess. Rejecting
  // it is better than guessing which end of the scale they meant.
  if (b.timeAccuracy !== undefined && !TIME_ACCURACIES.includes(b.timeAccuracy)) {
    throw new Error(`timeAccuracy must be one of: ${TIME_ACCURACIES.join(', ')}`);
  }
  return b as BirthData;
}
