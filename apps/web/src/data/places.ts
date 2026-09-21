/**
 * Place lookup.
 *
 * Birth places in India are villages as often as cities, and the app has to
 * work offline, so this cannot be an API call. The data is GeoNames, split into
 * two tiers because of what the data actually looks like:
 *
 *  - India has 558,000 populated places, and 550,855 of them carry no
 *    population figure — exactly the villages people are born in. Tiering by
 *    population would throw away 98.7% of them.
 *  - The full set is 4.9 MB gzipped, which is not something to download over 2G.
 *
 * Tier 1 is every city, town and administrative seat — 7,117 places, 82 KB
 * gzipped — precached by the service worker so the common case is instant and
 * works with no signal. Villages sit in per-state shards fetched only when
 * someone asks. Asking for the state first is also better than one national
 * search box: 986 Indian villages are called Rampur.
 *
 * Data: GeoNames (https://www.geonames.org/), CC BY 4.0.
 */
export interface Place {
  name: string;
  /** State name, or country for the diaspora entries. */
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface StateInfo { code: string; name: string; places: number }

/** Destinations with large Indian diasporas, kept inline so they always work. */
const ABROAD: Place[] = [
  { name: 'Dubai', region: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { name: 'Abu Dhabi', region: 'Abu Dhabi', country: 'UAE', latitude: 24.4539, longitude: 54.3773, timezone: 'Asia/Dubai' },
  { name: 'Doha', region: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.5310, timezone: 'Asia/Qatar' },
  { name: 'Kuwait City', region: 'Kuwait', country: 'Kuwait', latitude: 29.3759, longitude: 47.9774, timezone: 'Asia/Kuwait' },
  { name: 'Riyadh', region: 'Riyadh', country: 'Saudi Arabia', latitude: 24.7136, longitude: 46.6753, timezone: 'Asia/Riyadh' },
  { name: 'Muscat', region: 'Muscat', country: 'Oman', latitude: 23.5880, longitude: 58.3829, timezone: 'Asia/Muscat' },
  { name: 'Singapore', region: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  { name: 'Kuala Lumpur', region: 'Selangor', country: 'Malaysia', latitude: 3.1390, longitude: 101.6869, timezone: 'Asia/Kuala_Lumpur' },
  { name: 'Kathmandu', region: 'Bagmati', country: 'Nepal', latitude: 27.7172, longitude: 85.3240, timezone: 'Asia/Kathmandu' },
  { name: 'Colombo', region: 'Western', country: 'Sri Lanka', latitude: 6.9271, longitude: 79.8612, timezone: 'Asia/Colombo' },
  { name: 'Dhaka', region: 'Dhaka', country: 'Bangladesh', latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka' },
  { name: 'Karachi', region: 'Sindh', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011, timezone: 'Asia/Karachi' },
  { name: 'Lahore', region: 'Punjab', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587, timezone: 'Asia/Karachi' },
  { name: 'London', region: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { name: 'Birmingham', region: 'England', country: 'United Kingdom', latitude: 52.4862, longitude: -1.8904, timezone: 'Europe/London' },
  { name: 'Leicester', region: 'England', country: 'United Kingdom', latitude: 52.6369, longitude: -1.1398, timezone: 'Europe/London' },
  { name: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { name: 'Chicago', region: 'Illinois', country: 'United States', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
  { name: 'Houston', region: 'Texas', country: 'United States', latitude: 29.7604, longitude: -95.3698, timezone: 'America/Chicago' },
  { name: 'San Francisco', region: 'California', country: 'United States', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' },
  { name: 'Toronto', region: 'Ontario', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { name: 'Vancouver', region: 'British Columbia', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
  { name: 'Sydney', region: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Melbourne', region: 'Victoria', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
];

let tier1: Place[] = [];
let stateNames = new Map<string, string>();
let states: StateInfo[] = [];
let tier1Ready: Promise<void> | null = null;

const shards = new Map<string, Place[]>();
const shardLoads = new Map<string, Promise<Place[]>>();

/** Load tier 1 and the state index. Idempotent; safe to call on every render. */
export function ensurePlacesLoaded(): Promise<void> {
  if (!tier1Ready) tier1Ready = load();
  return tier1Ready;
}

async function load(): Promise<void> {
  try {
    const [rowsText, indexJson] = await Promise.all([
      fetch('/places/tier1.txt').then((r) => (r.ok ? r.text() : '')),
      fetch('/places/index.json').then((r) => (r.ok ? r.json() : null)),
    ]);

    if (indexJson?.states) {
      states = indexJson.states.map((s: StateInfo) => ({
        code: s.code, name: s.name, places: s.places,
      }));
      stateNames = new Map(states.map((s) => [s.code, s.name]));
    }

    tier1 = rowsText.split('\n').filter(Boolean).map((row) => {
      const [name, state, lat, lon] = row.split('\t');
      return {
        name: name!,
        region: stateNames.get(state!) ?? state!,
        country: 'India',
        latitude: Number(lat),
        longitude: Number(lon),
        // India is a single zone; the shards carry only Indian places.
        timezone: 'Asia/Kolkata',
      };
    });
  } catch {
    // Offline on first run with nothing cached. The diaspora list and manual
    // coordinates still work, so the app degrades rather than breaks.
    tier1 = [];
  }
}

export function placesLoaded(): boolean { return tier1.length > 0; }
export function allStates(): StateInfo[] { return states; }

/** Load one state's villages. Cached in memory and by the service worker. */
export function loadState(code: string): Promise<Place[]> {
  const cached = shards.get(code);
  if (cached) return Promise.resolve(cached);

  let pending = shardLoads.get(code);
  if (!pending) {
    pending = fetch(`/places/state-${code}.txt`)
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        const region = stateNames.get(code) ?? code;
        const rows = text.split('\n').filter(Boolean).map((row) => {
          const [name, lat, lon] = row.split('\t');
          return {
            name: name!, region, country: 'India',
            latitude: Number(lat), longitude: Number(lon), timezone: 'Asia/Kolkata',
          };
        });
        shards.set(code, rows);
        return rows;
      })
      .catch(() => {
        // The shards are large and are not committed; a deployment without them
        // must still work rather than throw.
        shards.set(code, []);
        return [];
      });
    shardLoads.set(code, pending);
  }
  return pending;
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function rank(place: Place, q: string): number {
  const name = fold(place.name);
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  if (fold(place.region).startsWith(q)) return 3;
  return -1;
}

function search(pool: Place[], query: string, limit: number): Place[] {
  const q = fold(query);
  if (q.length === 0) return [];
  const hits: { place: Place; score: number; index: number }[] = [];
  for (let i = 0; i < pool.length; i++) {
    const score = rank(pool[i]!, q);
    // Tier 1 is already ordered largest-first, so index breaks ties by size.
    if (score >= 0) hits.push({ place: pool[i]!, score, index: i });
    if (hits.length > 4000) break;
  }
  hits.sort((a, b) => a.score - b.score || a.index - b.index);
  return hits.slice(0, limit).map((h) => h.place);
}

/** Search the always-available set: towns and cities, plus the diaspora list. */
export function searchPlaces(query: string, limit = 8): Place[] {
  return search([...tier1, ...ABROAD], query, limit);
}

/** Search one state's villages. The shard must already be loaded. */
export function searchState(code: string, query: string, limit = 8): Place[] {
  return search(shards.get(code) ?? [], query, limit);
}

export function formatPlace(place: Place): string {
  return place.country === 'India'
    ? `${place.name}, ${place.region}`
    : `${place.name}, ${place.country}`;
}
