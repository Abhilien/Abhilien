#!/usr/bin/env node
/**
 * Build a pack of readings for a practising astrologer to review.
 *
 * This is the one check the test suite cannot make. The astronomy is verified
 * against JPL ephemerides and every rule cites its text, but that establishes
 * correctness, not usefulness: whether a reading says what a Jyotishi would
 * say, in the register a customer expects. Nobody has confirmed that, and no
 * further engineering will.
 *
 * So: one self-contained HTML file, readable on a phone and printable, with a
 * spread of charts chosen to stress the parts most likely to be wrong rather
 * than fifty variations of the same easy case. Each entry shows the birth data,
 * the computed positions (so the reviewer can check them against their own
 * software) and the reading, with somewhere to mark what is wrong.
 *
 * The sample is fixed, not random: two runs produce the same pack, so a second
 * reviewer sees what the first one saw, and a fix can be checked against the
 * same charts.
 *
 * Usage:  node scripts/review-pack.mjs [out.html]
 *         npm run build   # must be run first — this reads apps/api/dist
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFactBundle } from '../apps/api/dist/facts.js';
import { parseBirth } from '../apps/api/dist/parse.js';
import { deterministicReading } from '../apps/api/dist/deterministic.js';

const OUT = resolve(process.argv[2] ?? 'review-pack.html');

/**
 * Places spread across the country, because latitude is what makes an ascendant
 * hard: at Srinagar's 34°N the signs rise at wildly uneven speeds, at
 * Kanyakumari's 8°N they are nearly even. A bug that hides in Delhi shows here.
 */
const PLACES = {
  srinagar:   { latitude: 34.084, longitude: 74.797, timezone: 'Asia/Kolkata', label: 'Srinagar, Jammu and Kashmir' },
  amritsar:   { latitude: 31.634, longitude: 74.873, timezone: 'Asia/Kolkata', label: 'Amritsar, Punjab' },
  delhi:      { latitude: 28.651, longitude: 77.231, timezone: 'Asia/Kolkata', label: 'Delhi' },
  jaipur:     { latitude: 26.916, longitude: 75.820, timezone: 'Asia/Kolkata', label: 'Jaipur, Rajasthan' },
  patna:      { latitude: 25.594, longitude: 85.138, timezone: 'Asia/Kolkata', label: 'Patna, Bihar' },
  guwahati:   { latitude: 26.186, longitude: 91.746, timezone: 'Asia/Kolkata', label: 'Guwahati, Assam' },
  kolkata:    { latitude: 22.563, longitude: 88.363, timezone: 'Asia/Kolkata', label: 'Kolkata, West Bengal' },
  ahmedabad:  { latitude: 23.026, longitude: 72.588, timezone: 'Asia/Kolkata', label: 'Ahmedabad, Gujarat' },
  nagpur:     { latitude: 21.146, longitude: 79.089, timezone: 'Asia/Kolkata', label: 'Nagpur, Maharashtra' },
  mumbai:     { latitude: 19.076, longitude: 72.878, timezone: 'Asia/Kolkata', label: 'Mumbai, Maharashtra' },
  hyderabad:  { latitude: 17.385, longitude: 78.487, timezone: 'Asia/Kolkata', label: 'Hyderabad, Telangana' },
  bengaluru:  { latitude: 12.972, longitude: 77.594, timezone: 'Asia/Kolkata', label: 'Bengaluru, Karnataka' },
  chennai:    { latitude: 13.083, longitude: 80.270, timezone: 'Asia/Kolkata', label: 'Chennai, Tamil Nadu' },
  kochi:      { latitude:  9.932, longitude: 76.267, timezone: 'Asia/Kolkata', label: 'Kochi, Kerala' },
  kanyakumari:{ latitude:  8.088, longitude: 77.539, timezone: 'Asia/Kolkata', label: 'Kanyakumari, Tamil Nadu' },
  sasaram:    { latitude: 24.949, longitude: 84.016, timezone: 'Asia/Kolkata', label: 'Sasaram, Bihar' },
};

/**
 * The sample. Each row exists for a reason, given in `why`, so a reviewer can
 * see what is being asked of them and a later reader can see what was covered.
 */
const CASES = [
  // --- times of day: the ascendant moves a degree every four minutes --------
  { p: 'delhi',      d: [1990, 8, 15],  t: [5, 42],  why: 'Just after sunrise — lagna and Sun in the same sign' },
  { p: 'delhi',      d: [1990, 8, 15],  t: [12, 0],  why: 'Midday, same day and place: everything but the houses should match the row above' },
  { p: 'delhi',      d: [1990, 8, 15],  t: [18, 55], why: 'Just after sunset, same day and place' },
  { p: 'delhi',      d: [1990, 8, 15],  t: [0, 20],  why: 'Just after midnight — the Vedic day has not turned over yet' },

  // --- latitude: sign rising times diverge sharply with distance from equator
  { p: 'srinagar',   d: [1975, 1, 12],  t: [7, 15],  why: 'Northernmost — signs of long and short ascension are most unequal here' },
  { p: 'kanyakumari',d: [1975, 1, 12],  t: [7, 15],  why: 'Southernmost, same instant: a direct comparison against Srinagar' },
  { p: 'guwahati',   d: [2001, 6, 21],  t: [4, 50],  why: 'Far east — sunrise is nearly an hour before the clock suggests' },
  { p: 'ahmedabad',  d: [2001, 6, 21],  t: [4, 50],  why: 'Far west, same instant: the same clock time, a different sky' },

  // --- India before 1955 had no single offset ------------------------------
  { p: 'chennai',    d: [1943, 3, 9],   t: [9, 30],  why: 'Wartime: India ran at +06:30 from Sept 1942 to Oct 1945' },
  { p: 'kolkata',    d: [1946, 11, 4],  t: [16, 10], why: 'Calcutta kept its own +05:53:20 until 1948' },
  { p: 'chennai',    d: [1951, 5, 23],  t: [11, 45], why: 'Madras local time, +05:21:10 — a hardcoded +05:30 puts this half a sign out' },

  // --- across the decades, for ayanamsa drift and dasha arithmetic ---------
  { p: 'mumbai',     d: [1947, 8, 15],  t: [0, 1],   why: 'Independence midnight — a date every Indian reader will recognise' },
  { p: 'patna',      d: [1958, 2, 27],  t: [14, 20], why: 'Late fifties; the dasha now running should be a late one' },
  { p: 'jaipur',     d: [1966, 10, 3],  t: [21, 5],  why: 'Night birth, sixties' },
  { p: 'nagpur',     d: [1972, 12, 30], t: [3, 40],  why: 'Pre-dawn, year end' },
  { p: 'hyderabad',  d: [1984, 4, 18],  t: [10, 55], why: 'Mid-eighties' },
  { p: 'bengaluru',  d: [1993, 9, 7],   t: [19, 30], why: 'Nineties evening' },
  { p: 'kochi',      d: [2005, 1, 29],  t: [8, 0],   why: 'A reader in their twenties now — the most likely customer' },
  { p: 'amritsar',   d: [2012, 7, 11],  t: [23, 50], why: 'Late night, recent' },
  { p: 'sasaram',    d: [2018, 3, 2],   t: [6, 30],  why: 'A village birth, recent — the case the place database was rebuilt for' },

  // --- an unknown birth time must degrade honestly, not guess --------------
  { p: 'patna',      d: [1968, 6, 14],  t: [12, 0], accuracy: 'Unknown',
    why: 'Birth time not known: the reading must drop the houses and say so, not quietly assume noon' },
  { p: 'kolkata',    d: [1988, 11, 22], t: [15, 0], accuracy: 'ToPartOfDay',
    why: 'Only the part of the day is known — houses are uncertain and should be flagged' },
  { p: 'mumbai',     d: [1996, 2, 9],   t: [9, 20], accuracy: 'ToHour',
    why: 'Within an hour: the lagna may be wrong by a whole sign and the reading should admit it' },
];

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const entries = CASES.map((c, i) => {
  const place = PLACES[c.p];
  const [year, month, day] = c.d;
  const [hour, minute] = c.t;
  // Through the same validator the HTTP API uses, so a typo in the sample below
  // fails the run rather than quietly producing a pack that overstates its
  // confidence — which is exactly what this pack exists to catch in the product.
  const birth = parseBirth({
    year, month, day, hour, minute, second: 0,
    location: place,
    timeAccuracy: c.accuracy ?? 'ToMinute',
  });
  const facts = buildFactBundle(birth);
  return { n: i + 1, why: c.why, birth, place, facts, reading: deterministicReading(facts) };
});

const stamp = new Date().toISOString().slice(0, 10);

const body = entries.map((e) => {
  const b = e.birth;
  const when = `${String(b.day).padStart(2, '0')}-${String(b.month).padStart(2, '0')}-${b.year}`
    + ` at ${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`;

  const positions = e.facts.positions.map((p) => `
      <tr>
        <td>${esc(p.graha)}</td>
        <td>${esc(p.degree)} ${esc(p.sign)}</td>
        <td>${esc(p.nakshatra)} ${p.pada}</td>
        <td>${p.house ?? '—'}</td>
        <td>${esc(p.dignity)}${p.retrograde ? ' · R' : ''}${p.combust ? ' · combust' : ''}</td>
      </tr>`).join('');

  const findings = e.facts.findings.length
    ? `<ul class="findings">${e.facts.findings.map((f) => `
        <li${f.cancelled ? ' class="cancelled"' : ''}>
          <b>${esc(f.name)}</b> — ${esc(f.classicalEffect)}
          <span class="cite">${esc(f.citation)}</span>
          ${f.cancelled ? '<span class="tag">cancelled</span>' : ''}
          ${f.contested ? `<span class="tag contested">disputed: ${esc(f.contested)}</span>` : ''}
        </li>`).join('')}</ul>`
    : '<p class="muted">No yogas or doshas fired for this chart.</p>';

  return `
  <article id="c${e.n}">
    <header>
      <span class="num">${e.n} / ${entries.length}</span>
      <h2>${esc(when)} — ${esc(e.place.label)}</h2>
      <p class="why">${esc(e.why)}</p>
    </header>

    <div class="grid">
      <div>
        <h3>Computed positions</h3>
        <p class="meta">
          Lagna <b>${esc(e.facts.chart.lagna)}</b> ·
          Moon <b>${esc(e.facts.chart.moon)}</b> ·
          Sun <b>${esc(e.facts.chart.sun)}</b><br>
          ${esc(e.facts.chart.ayanamsa)} · time given as ${esc(e.facts.chart.timeAccuracy)}
        </p>
        <div class="scroll"><table>
          <thead><tr><th>Graha</th><th>Position</th><th>Nakshatra</th><th>Bhava</th><th>Dignity</th></tr></thead>
          <tbody>${positions}</tbody>
        </table></div>
        <h3>Dasha</h3>
        <p class="meta">
          ${e.facts.dasha.current.map((d) => `${esc(d.level)}: <b>${esc(d.lord)}</b> ${esc(d.from)} → ${esc(d.to)}`).join('<br>')}
          <br>Balance at birth: ${esc(e.facts.dasha.balanceAtBirth)}
        </p>
        <h3>Yogas and doshas</h3>
        ${findings}
        ${e.facts.warnings.length ? `<h3>What the chart admits it cannot do</h3>
        <ul class="warnings">${e.facts.warnings.map((w) => `<li>${esc(w.message)}</li>`).join('')}</ul>` : ''}
      </div>

      <div>
        <h3>The reading as a customer sees it</h3>
        <div class="reading">${e.reading.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>

        <h3>Your verdict</h3>
        <div class="verdict">
          <label><input type="checkbox"> Positions match my software</label>
          <label><input type="checkbox"> The yogas fired are the ones I would cite</label>
          <label><input type="checkbox"> The reading is something I would say to a client</label>
          <label><input type="checkbox"> Nothing here is misleading or alarming</label>
          <p class="note-label">What is wrong, and what should it say instead?</p>
          <div class="notes"></div>
        </div>
      </div>
    </div>
  </article>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kundali — reading review pack</title>
<style>
  :root {
    --ink: #1c1917; --muted: #78716c; --line: #e7e5e4;
    --surface: #fff; --bg: #fbf7f0; --accent: #9a3412; --flag: #b45309;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.6 Georgia, 'Times New Roman', serif;
  }
  .wrap { max-width: 68rem; margin: 0 auto; padding: 2rem 1rem 6rem; }
  h1 { font-size: 1.9rem; margin: 0 0 .25rem; }
  .lede { color: var(--muted); max-width: 42rem; }
  .lede b { color: var(--ink); }
  article {
    background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
    padding: 1.25rem; margin: 1.5rem 0; break-inside: avoid;
  }
  article header { border-bottom: 1px solid var(--line); padding-bottom: .75rem; margin-bottom: 1rem; }
  .num { color: var(--accent); font: 600 .75rem/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
  article h2 { font-size: 1.15rem; margin: .35rem 0 .3rem; }
  .why { color: var(--flag); font-size: .9rem; margin: 0; font-style: italic; }
  .grid { display: grid; gap: 1.75rem; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
  @media (max-width: 800px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  h3 { font: 600 .78rem/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em;
       text-transform: uppercase; color: var(--muted); margin: 1.4rem 0 .5rem; }
  h3:first-child { margin-top: 0; }
  .meta { font-size: .9rem; margin: 0 0 .5rem; }
  .scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: .78rem; }
  th { text-align: left; font: 600 .68rem/1.2 ui-sans-serif, system-ui, sans-serif;
       text-transform: uppercase; letter-spacing: .04em; color: var(--muted);
       border-bottom: 1px solid var(--line); padding: .35rem .3rem; }
  td { padding: .3rem .3rem; border-bottom: 1px solid var(--line); }
  td:nth-child(4) { text-align: right; }
  .findings { margin: 0; padding-left: 1.1rem; font-size: .88rem; }
  .findings li { margin-bottom: .4rem; }
  .findings .cancelled { color: var(--muted); text-decoration-line: line-through; text-decoration-thickness: 1px; }
  .cite { color: var(--muted); font-size: .8rem; }
  .tag { background: #fef3c7; color: #92400e; font-size: .7rem; padding: .1rem .35rem;
         border-radius: 3px; margin-left: .25rem; white-space: nowrap; }
  /* A disputed note is a sentence, not a chip: left as nowrap it dragged the
     page 1,200px wider than the phone it is meant to be read on. */
  .tag.contested { background: #fee2e2; color: #991b1b; display: block;
                   white-space: normal; margin: .25rem 0 0; padding: .25rem .4rem; }
  .reading p { margin: 0 0 .75rem; }
  .verdict { border: 1px dashed var(--line); border-radius: 8px; padding: .85rem; }
  .verdict label { display: block; font-size: .88rem; margin-bottom: .4rem; }
  .note-label { font-size: .82rem; color: var(--muted); margin: .7rem 0 .3rem; }
  .notes { min-height: 5.5rem; border-bottom: 1px solid var(--line);
           background: repeating-linear-gradient(transparent, transparent 1.6rem, var(--line) 1.6rem, var(--line) calc(1.6rem + 1px)); }
  .muted { color: var(--muted); font-size: .88rem; }
  .warnings { margin: 0; padding-left: 1.1rem; font-size: .85rem; color: var(--flag); }
  footer { color: var(--muted); font-size: .85rem; margin-top: 2.5rem; max-width: 42rem; }
  @media print {
    body { background: #fff; }
    article { break-inside: avoid; border-color: #ccc; }
    .wrap { max-width: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>Kundali — reading review</h1>
  <p class="lede">
    ${entries.length} charts, generated ${stamp}. Each one is here for a reason,
    printed in orange under its heading — times of day, latitudes from Srinagar to
    Kanyakumari, births before 1955 when India had no single time offset, and
    births where the time is not properly known.
  </p>
  <p class="lede">
    <b>What is being asked:</b> not whether astrology works, but whether this
    software does its job — whether the positions match what your own software
    gives, whether the yogas that fired are the ones you would cite, and whether
    the reading is something you would put in front of a client. Where it is
    wrong, the useful part is what it should have said instead.
  </p>
  <p class="lede">
    The same ${entries.length} charts come out of every run, so a second reviewer
    sees exactly what the first one saw.
  </p>
  ${body}
  <footer>
    Generated by <code>scripts/review-pack.mjs</code>. Positions are sidereal
    (Lahiri), computed with astronomy-engine against JPL ephemerides. Readings are
    the template narration — the same text the app shows with no model involved,
    which is what the AI layer is held to.
  </footer>
</div>
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`${entries.length} readings → ${OUT}`);
console.log(`  ${entries.filter((e) => e.facts.chart.housesUsable).length} with usable houses, `
  + `${entries.filter((e) => !e.facts.chart.housesUsable).length} without`);
console.log(`  ${entries.reduce((n, e) => n + e.facts.findings.length, 0)} findings across the set`);
