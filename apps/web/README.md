# Kundali — web app

An offline-first Vedic astrology app. Everything runs on the device: the engine
computes the chart locally in a few milliseconds, so there is no server, no
account and no network call.

## Why it is built this way

**Size.** The whole app — a full sidereal astronomy engine, sixteen divisional
charts, five levels of dasha, the rule set, transits, muhurta and Ashtakoot
matching — is about **71 KB gzipped**. Rendered with plain DOM rather than a
framework, because the question that decides this product is whether it works on
a four-year-old Android on a 2G connection, and a framework would cost more
bytes than the entire application file.

**No web fonts.** A Devanagari webfont is 150 KB or more, so the app uses the
system Indic fonts every Android device already ships.

**Offline.** A service worker caches the shell and the place database and serves
cache-first. Since every calculation happens on the device, a stale cache is a
fully working app rather than a degraded one.

**Privacy.** Birth data is personal data under the DPDP Act. It is stored only in
`localStorage` on the user's own device, every read and write is guarded because
storage throws in private mode, and each saved chart can be deleted.

## Places

149 bundled towns meant most users could not find where they were born. The app
now ships the GeoNames India database in two tiers, a split the data itself
forces: 550,855 of India's 558,000 populated places carry no population figure —
exactly the villages people are born in — so tiering by population would discard
98.7% of it, while the full set is 4.9 MB gzipped.

- **Tier 1**: every city, town and administrative seat. 7,117 places, 82 KB
  gzipped, precached by the service worker. Instant and offline.
- **State shards**: 550,832 villages, fetched only when asked for. Bihar's 43,046
  load in about 250 ms and are then cached.

Asking for the state first is better UX, not only smaller — 986 Indian villages
are called Rampur.

Regenerate with `node scripts/build-places.mjs`. Data is GeoNames, CC BY 4.0;
attribution appears in the app footer as the licence requires.

## Both regional conventions

North Indian and South Indian charts are not interchangeable to the people who
read them — one holds the houses fixed and moves the signs, the other does the
opposite. Both are rendered properly as inline SVG.

Three details that are easy to get wrong and are handled here:

- Sign abbreviations are an explicit table, not `name.slice(0, 3)`, which
  collapses **Vrishabha and Vrischika** to the same "Vri".
- The ascendant marker goes in the bottom-left corner of its cell, because a
  diagonal drawn in the traditional top-left strikes through the sign label.
- Devanagari graha abbreviations get a taller line height than Latin ones;
  matras sit above and below the baseline and collide at Latin spacing.

## Sharing

A birth chart in India is something people send to relatives and astrologers,
usually over WhatsApp, so the app exports both forms:

- **Text** — a summary that pastes into any chat, via the native share sheet
  where available and the clipboard everywhere else.
- **Image** — the diagram rasterised to PNG with the name, birth details and
  place drawn on, so it is self-contained when it lands in a chat.

One trap worth knowing: the on-screen SVG is styled with CSS custom properties,
which do not resolve once the markup is detached and loaded as an image — the
export comes out blank. The computed values are read from the live document and
baked into the exported copy as a literal stylesheet.

## Honesty in the interface

- Charts carry visible warnings: unknown or coarse birth times, DST gaps,
  pre-1955 Indian births.
- With an unknown birth time the ascendant, houses and divisional charts are
  suppressed rather than shown as though they meant something.
- Every yoga and dosha shows its classical source, and where authorities differ
  the app says so.
- Cancelled doshas are shown as cancelled, in their own section.
- Sade Sati always states that the cycle is universal and that everyone gets
  three or four, which is the fact this topic is most often sold against.

## Running it

```bash
npm install
npm run dev        # development
npm run build      # production bundle
npm run preview    # serve the build
```
