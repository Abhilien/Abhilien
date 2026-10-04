# Aistro

**Live app: https://abhilien.github.io/Abhilien/aistro/**

A Vedic astrology platform: an exact calculation engine, an offline-first app,
and an AI narration layer that cannot fabricate.

Positions and periods are astronomy, computed on the device. Interpretations are
what classical Jyotish texts say, each one cited to its source. A language model
is used only to put computed facts into sentences, and a guardrail pass verifies
it did not invent anything.

```
┌──────────────────────────┐
│  packages/astro-engine   │  deterministic. no network, no clock,
│  244 tests               │  no randomness, no model.
└────────────┬─────────────┘
             │  Kundali, dashas, yogas, panchang, transits
    ┌────────┴────────┐
    │                 │
┌───▼──────────┐  ┌───▼─────────────┐
│  apps/web    │  │  apps/api       │  fact bundle → model → guardrails
│  70 KB, PWA  │  │  29 tests       │  optional: the app is complete alone
└──────────────┘  └─────────────────┘
```

## Run it

```bash
npm ci
npm test          # 273 tests
npm run build     # → apps/web/dist, a static site
```

Then open `apps/web/dist` on any static host, or `npm --workspace @jyotish/web run dev`.

To deploy it for real, see **[SHIP.md](../SHIP.md)**. For why each piece is built
the way it is — and what is deliberately not built — see **[PROJECT.md](../PROJECT.md)**.

## What it does

Eight screens, all working offline on a phone, in Hindi and English:

| | |
|---|---|
| **Chart** | Rasi and all sixteen vargas, North and South Indian styles |
| **Dasha** | Vimshottari to five levels, Yogini, Ashtottari |
| **Yogas** | Yogas and doshas, each with a classical citation and its cancellations |
| **Transits** | Gochar with vedha, Sade Sati across a lifetime, Dhaiya |
| **Panchang** | Five limbs, Rahu Kaal, Gulika, Abhijit, choghadiya, horas |
| **Muhurta** | Auspicious windows for ten activities, scored factor by factor |
| **Matching** | Ashtakoot Guna Milan, all 36 points, with exemptions |
| **Birth time** | Rectification from dated life events — with a confidence allowed to say no |

## The decisions that matter

- **astronomy-engine, not the Swiss Ephemeris.** SE is AGPL, which would force
  this codebase open or cost a commercial licence. Its extra precision is
  irrelevant when charts are read to the arcminute.
- **Time resolved to the second.** India had no uniform offset before 1955
  (Madras +05:21:10, Calcutta +05:53:20, wartime +06:30). A hardcoded +05:30
  puts a 1943 ascendant half a sign out.
- **Compute everything computable.** "Jupiter in a kendra from the Moon" is a
  boolean function, not a language problem. The model never calculates a
  position, a period or a rule outcome, and guardrails verify it didn't.
- **Uncertainty is representable.** Where the software cannot know something —
  an unknown birth time, a rectification that did not separate its candidates —
  the type system makes false confidence impossible to express.
- **Everything stays on the device.** Birth data is personal data under the DPDP
  Act 2023. No account, no server, no analytics.

## Checking the readings

The astronomy is verified against JPL ephemerides and every rule cites its text.
That establishes correctness, not usefulness. For that:

```bash
npm run review    # → review-pack.html, 23 charts for an astrologer to mark up
```

It found four real bugs on its first run, before any astrologer saw it.

## Layout

```
packages/astro-engine/   the engine: ephemeris, charts, dashas, rules, panchang,
                         muhurta, transits, rectification   (13 test files)
apps/web/                the PWA: 8 tabs, 2 languages, 70 KB gzipped
apps/api/                HTTP API + grounded narration + guardrails
scripts/                 place database build, deployment check, review pack
.github/workflows/       CI on every push; deploy is manual only
```

Place data from [GeoNames](https://www.geonames.org/), CC BY 4.0.
