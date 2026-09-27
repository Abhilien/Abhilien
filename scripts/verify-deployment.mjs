#!/usr/bin/env node
/**
 * Drive a built app the way a phone would, before it is published.
 *
 * The unit tests cover the calculations. They say nothing about whether the
 * thing you are about to upload actually works: a wrong base path, a service
 * worker that does not register, a missing place file — each of those produces
 * a build that looks perfect in `dist/` and is broken in a browser. Every one
 * of them has happened here at least once.
 *
 * So this serves the build as static files, opens it in Chromium at phone size
 * and does what a user does: casts a chart for a village that exists only in
 * the GeoNames data, opens every tab, pulls the network away, reloads, and
 * checks the chart is still there.
 *
 * Usage:  node scripts/verify-deployment.mjs [dist-dir] [base-path]
 *   e.g.  node scripts/verify-deployment.mjs apps/web/dist /
 *         node scripts/verify-deployment.mjs apps/web/dist-sub /kundali/
 *
 * Needs Chromium:  npx playwright install chromium
 *                  (or set CHROMIUM_PATH to a browser already on the machine)
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const DIST = resolve(process.argv[2] ?? 'apps/web/dist');
const BASE = process.argv[3] ?? '/';
const PORT = Number(process.env.VERIFY_PORT ?? 8099);

if (!existsSync(DIST)) {
  console.error(`No such directory: ${DIST}\nRun \`npm run build\` first.`);
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png',
};

/**
 * A static server that mirrors what a host does, including the one rule that
 * matters: an unknown path serves index.html rather than a 404, so deep links
 * and an offline navigation both land on the app.
 */
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let path = decodeURIComponent(url.pathname);
  if (BASE !== '/' && path.startsWith(BASE)) path = '/' + path.slice(BASE.length);
  else if (BASE !== '/' && path !== '/') { res.writeHead(404).end(); return; }

  let file = join(DIST, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }

  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // The worker must never be served stale, or users are stuck on an old build.
    'cache-control': file.endsWith('sw.js') ? 'no-cache' : 'no-store',
  });
  createReadStream(file).pipe(res);
});

await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok));
const ORIGIN = `http://127.0.0.1:${PORT}${BASE}`;
console.log(`serving ${DIST} at ${ORIGIN}\n`);

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed.\n  npm i -D playwright && npx playwright install chromium');
  server.close();
  process.exit(2);
}

const fail = [];
const note = (tag, msg) => console.log(`  ${tag.padEnd(8)} ${msg}`);

// CHROMIUM_PATH lets a CI image with its own Chromium skip the download. It has
// to be a build that matches the installed Playwright: an older one drives most
// of this fine and then fails the offline navigation, which reads exactly like a
// broken service worker. When in doubt, unset it and let Playwright fetch its own.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
const page = await ctx.newPage();

const errors = [];
const broken = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) broken.push(`${r.status()} ${r.url()}`); });

/** Row counts straight from the page, checked against the generated index
 *  rather than a literal — GeoNames refreshes weekly. */
const places = () => page.evaluate(async () => {
  const base = location.pathname.replace(/[^/]*$/, '');
  const [rows, index] = await Promise.all([
    fetch(`${base}places/tier1.txt`).then((r) => (r.ok ? r.text() : '')),
    fetch(`${base}places/index.json`).then((r) => (r.ok ? r.json() : null)),
  ]);
  return { got: rows.split('\n').filter(Boolean).length, want: index?.tier1 ?? -1 };
});

await page.goto(ORIGIN, { waitUntil: 'load' });
await page.waitForTimeout(2500);

note('shell', `${await page.locator('h1').first().innerText()} — ${await page.locator('nav button').count()} tabs`);

const tier1 = await places();
note('places', `tier 1: ${tier1.got} rows, index says ${tier1.want}`);
if (tier1.got < 7000 || tier1.got !== tier1.want) {
  fail.push(`tier1 has ${tier1.got} rows but the index says ${tier1.want} — wrong base path, or a stale build`);
}

// A chart for a town that only exists once the GeoNames set has loaded.
await page.fill('#f-name', 'Verification');
await page.fill('#f-date', '1990-08-15');
await page.fill('#f-time', '14:35');
await page.fill('#f-place', 'Sasaram');
await page.waitForTimeout(700);
const suggestion = page.locator('li, [role=option], button').filter({ hasText: /Sasaram/i }).first();
if (await suggestion.count()) await suggestion.click();
else fail.push('Sasaram was not offered — the place database did not load');

await page.getByRole('button', { name: 'Show chart', exact: true }).click();
await page.waitForTimeout(3500);

let text = await page.locator('body').innerText();
if (!(await page.locator('svg').count())) fail.push('no chart SVG rendered');
if (!/lagna|ascendant/i.test(text)) fail.push('the reading has no ascendant in it');
note('chart', `${await page.locator('svg').count()} svg, ${text.length} chars`);

for (const name of await page.locator('nav button').allInnerTexts()) {
  await page.locator('nav button').filter({ hasText: new RegExp(`^${name}$`) }).first().click();
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  note('tab', `${name.padEnd(11)} ${body.length} chars`);
  if (body.length < 300) fail.push(`tab "${name}" rendered almost nothing (${body.length} chars)`);
}
await page.locator('nav button').first().click();
await page.waitForTimeout(800);

const sw = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  return { n: regs.length, scope: regs[0]?.scope, controlled: !!navigator.serviceWorker.controller };
});
note('worker', JSON.stringify(sw));
if (sw.n !== 1 || !sw.controlled) fail.push(`service worker did not take control: ${JSON.stringify(sw)}`);

// The promise of the product: no network, and it still works.
await ctx.setOffline(true);
await page.reload({ waitUntil: 'load' }).catch((e) => fail.push(`offline reload failed: ${e.message}`));
await page.waitForTimeout(2500);
text = await page.locator('body').innerText();
const offline = await places();
note('offline', `${text.length} chars, ${await page.locator('svg').count()} svg, ${offline.got} places`);
if (text.length < 500) fail.push('offline reload rendered nothing — the shell is not cached');
if (offline.got !== tier1.got) fail.push(`offline place search broken: ${offline.got} rows, expected ${tier1.got}`);
if (!(await page.locator('svg').count())) fail.push('the chart was lost across an offline reload');
if (!/Sasaram/i.test(text)) fail.push('the restored chart lost its place name');

await ctx.setOffline(false);
await browser.close();
server.close();

errors.forEach((e) => fail.push(e));
broken.forEach((b) => fail.push(b));

console.log();
if (fail.length) {
  console.error(`FAIL — ${fail.length} problem${fail.length > 1 ? 's' : ''} with this build at base ${BASE}`);
  fail.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log(`PASS — the build at base ${BASE} renders, casts and works offline`);
