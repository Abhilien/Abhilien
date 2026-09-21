#!/usr/bin/env node
/**
 * Build the place database from GeoNames.
 *
 * Data: https://download.geonames.org/export/dump/IN.zip, licensed CC BY 4.0.
 * Attribution is a licence condition and is shown in the app's footer.
 *
 * Two tiers, because the shape of the data forces it:
 *
 *  - India has 558,000 populated places, and 550,855 of them carry no
 *    population figure — which is precisely the villages people are born in.
 *    Tiering by population would therefore discard 98.7% of the data.
 *  - The full set is 4.9 MB gzipped. That cannot sit in an app that has to work
 *    on a 2G connection.
 *
 * So: tier 1 is every city, town and administrative seat (about 7,100 places,
 * ~79 KB gzipped) and is precached by the service worker, so the common case is
 * instant and offline. Villages live in per-state shards fetched only when
 * asked for. That split is also better UX than one national search box: 986
 * Indian villages are called Rampur, so asking for the state first disambiguates
 * rather than just saving bytes.
 *
 * Usage:  node scripts/build-places.mjs [path/to/IN.txt] [path/to/admin1CodesASCII.txt]
 */
import { createReadStream, createWriteStream, mkdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../apps/web/public/places');

const IN_TXT = process.argv[2] ?? 'IN.txt';
const ADMIN1 = process.argv[3] ?? 'admin1CodesASCII.txt';

/** Strip diacritics: the data says "Rāmpur", a user types "Rampur". */
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Administrative seats are kept regardless of population — they are the
 *  places a birth certificate is most likely to name. */
const ADMIN_SEAT = /^PPL(C|A|A2|A3)$/;

async function main() {
  mkdirSync(OUT, { recursive: true });

  const states = new Map();
  for (const line of (await readFile(ADMIN1, 'utf8')).split('\n')) {
    const [code, name] = line.split('\t');
    if (code?.startsWith('IN.')) states.set(code.slice(3), name);
  }

  const tier1 = [];
  const byState = new Map();
  // A handful of rows carry an admin1 code that is blank, "00", or otherwise
  // absent from the official list. Left alone they produce nameless entries in
  // the state picker for the sake of 37 places out of 558,000.
  let unplaced = 0;

  const rl = createInterface({ input: createReadStream(IN_TXT, 'utf8'), crlfDelay: Infinity });
  let total = 0;

  for await (const line of rl) {
    const f = line.split('\t');
    if (f.length < 18 || f[6] !== 'P') continue;
    total++;

    const name = fold(f[1]);
    const state = f[10];
    const lat = Number(f[4]);
    const lon = Number(f[5]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    // Three decimals is about 110 m. The ascendant moves one degree per four
    // minutes of time, so this is orders of magnitude finer than it needs.
    const row = `${name}\t${state}\t${lat.toFixed(3)}\t${lon.toFixed(3)}`;

    if (Number(f[14]) >= 500 || ADMIN_SEAT.test(f[7])) {
      tier1.push({ row, pop: Number(f[14]) || 0, name });
    } else if (states.has(state)) {
      if (!byState.has(state)) byState.set(state, []);
      byState.get(state).push(`${name}\t${lat.toFixed(3)}\t${lon.toFixed(3)}`);
    } else {
      unplaced++;
    }
  }

  // Largest first, so a search for "Delhi" leads with the city.
  tier1.sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name));
  const tier1Body = [...new Set(tier1.map((t) => t.row))].join('\n');
  await writeFile(`${OUT}/tier1.txt`, tier1Body);

  const index = [];
  for (const [state, rows] of byState) {
    const unique = [...new Set(rows)].sort();
    const file = `state-${state}.txt`;
    await writeFile(`${OUT}/${file}`, unique.join('\n'));
    index.push({
      code: state,
      name: states.get(state) ?? state,
      places: unique.length,
      bytes: statSync(`${OUT}/${file}`).size,
    });
  }
  index.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(`${OUT}/index.json`, JSON.stringify({
    source: 'GeoNames (https://www.geonames.org/), CC BY 4.0',
    generated: new Date().toISOString().slice(0, 10),
    tier1: tier1.length,
    states: index,
  }, null, 1));

  console.log(`read ${total} populated places`);
  console.log(`tier 1: ${new Set(tier1.map((t) => t.row)).size} places -> tier1.txt`);
  console.log(`shards: ${index.length} states, ${index.reduce((s, x) => s + x.places, 0)} villages`);
  if (unplaced) console.log(`skipped ${unplaced} places with an unrecognised state code`);
}

main().catch((error) => { console.error(error); process.exit(1); });
