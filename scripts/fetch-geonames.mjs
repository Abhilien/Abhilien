#!/usr/bin/env node
/**
 * Download the GeoNames India dump that the place database is built from.
 *
 * Kept separate from build-places.mjs so that script stays a pure
 * transformation with no network in it: given the same two input files it
 * produces the same output, which is what makes the place database
 * reproducible. This is the part that reaches the internet.
 *
 * Data: https://download.geonames.org/export/dump/, licensed CC BY 4.0.
 * Attribution is a licence condition and is shown in the app's footer.
 *
 * Usage:  node scripts/fetch-geonames.mjs [dir]     (default .geonames)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(process.argv[2] ?? join(here, '../.geonames'));
const BASE = 'https://download.geonames.org/export/dump';

mkdirSync(dir, { recursive: true });

async function download(name) {
  const target = join(dir, name);
  // The dump changes rarely and is ~10 MB, so a present file is reused. Delete
  // the directory to force a refresh.
  if (existsSync(target) && statSync(target).size > 0) {
    console.log(`have    ${name} (${(statSync(target).size / 1e6).toFixed(1)} MB)`);
    return target;
  }
  console.log(`fetch   ${BASE}/${name}`);
  const response = await fetch(`${BASE}/${name}`);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  console.log(`saved   ${name} (${(statSync(target).size / 1e6).toFixed(1)} MB)`);
  return target;
}

const zip = await download('IN.zip');
await download('admin1CodesASCII.txt');

if (!existsSync(join(dir, 'IN.txt'))) {
  execFileSync('unzip', ['-o', '-q', zip, 'IN.txt', '-d', dir], { stdio: 'inherit' });
  console.log(`unzip   IN.txt (${(statSync(join(dir, 'IN.txt')).size / 1e6).toFixed(1)} MB)`);
}

console.log(`\nReady. Now run:\n  node scripts/build-places.mjs ${join(dir, 'IN.txt')} ${join(dir, 'admin1CodesASCII.txt')}`);
