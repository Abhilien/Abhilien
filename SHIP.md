# Shipping Aistro

Everything below has been run end to end. Timings are what it actually took,
not estimates.

## The short version

The app is a set of static files. There is no server to run, no database to
provision and no key to buy. Build it, upload one directory, done.

```bash
npm ci
npm run build
# → apps/web/dist/  — upload this directory to any static host
```

That build contains the app, the 7,117-place tier-1 database and the service
worker, and it works offline from the first load. Fifteen minutes end to end.

## Step 1 — build the full place database (optional, 5 minutes)

Skip this and the app still works: every city, town and administrative seat is
already committed. Do it and you also get 550,831 villages, which is what stops
a user in rural Bihar from being unable to enter their own birthplace.

```bash
npm run places     # downloads IN.zip (~16 MB, cached) and rebuilds the shards
```

This adds about 13 MB to `apps/web/public/places/`, split into 36 per-state
files that the app fetches only when someone picks that state. The files are
gitignored on purpose — 13 MB does not belong in git history when a script
reproduces it exactly.

Re-run it every few months; GeoNames updates weekly and the shards are a
snapshot.

## Step 2 — build

```bash
npm run build
```

If you are serving from a subdirectory rather than a domain root, say so:

```bash
APP_BASE=/kundali/ npm run build      # served at example.com/kundali/
```

Getting this wrong is the one way to ship a broken build: the app renders and
the place search silently 404s. Both cases are covered by the browser checks
described at the bottom.

## Step 3 — host it

Any static host works. In rough order of how fast you can be live:

| Host | How | Cost |
|---|---|---|
| **Cloudflare Pages** | Drag `apps/web/dist` onto the dashboard | Free |
| **Netlify** | Drag `apps/web/dist` onto the dashboard | Free |
| **GitHub Pages** | Run the **Deploy** workflow (below) | Free |
| **Any nginx box** | Copy `dist` into the web root | Whatever you pay now |

Three requirements, all of which the hosts above satisfy by default:

1. **HTTPS.** The service worker will not register without it, and without the
   worker there is no offline mode. `localhost` is exempt for development.
2. **`index.html` for unknown paths**, so a deep link does not 404.
3. **Do not cache `sw.js`.** If the host caches it for a year, users will be
   stuck on an old version. Most hosts get this right unaided; on nginx add
   `location = /sw.js { add_header Cache-Control "no-cache"; }`.

### GitHub Pages

The live app is at https://abhilien.github.io/Abhilien/aistro/. It is served
from the `gh-pages` branch of Abhilien/Abhilien, alongside the other projects.
To update it, build with `APP_BASE=/Abhilien/aistro/ npm run build`, run
`npm run verify -- /Abhilien/aistro/`, and replace the `aistro/` folder on that
branch with `apps/web/dist`.

## What about the AI part?

**The app does not need it.** Every reading in `apps/web` is computed on the
device and written from the rule engine's own citations. Ship the app alone and
nothing is missing or degraded.

`apps/api` is a separate, optional service that rewrites those same computed
facts into flowing prose. It needs an Anthropic API key:

```bash
cd apps/api && npm run build
ANTHROPIC_API_KEY=sk-ant-... PORT=8080 npm start
```

The model is never given the birth data and never computes anything — it
receives a fact bundle the engine produced and a guardrail pass rejects any
sentence containing a number, date or claim that is not in that bundle. That
design is what makes the AI safe to sell; it is documented in
`apps/api/README.md`.

Decide later. The cost is per-reading and the app is a complete product without
it.

## Before you tell anyone about it

One thing that is not code, and it is the real risk:

**Get a practising astrologer to read a pack of generated readings.** The
astronomy is verified against JPL ephemerides and the rules are cited to their
texts, but nobody has yet checked that the readings are *useful* — that they
say what a Jyotishi would say, in the register a customer expects. No amount of
further engineering establishes that, and it is cheap to find out:

```bash
npm run build
npm run review          # → review-pack.html
```

That is 23 charts chosen to stress what is most likely to be wrong — four times
of day at one place, Srinagar against Kanyakumari at the same instant, births
from before 1955 when India had no single time offset, and births where the
time is not properly known. Each one shows the computed positions, so a
reviewer can check them against their own software, and the reading as a
customer sees it, with room to write what it should have said instead. Open it
on a phone or print it and hand it over.

Generating that pack found four real bugs on its first run, including an
ascendant being stated to the arcsecond for a birth time the app had been told
was a guess. It is worth running again whenever the rules or the narration
change.

And a housekeeping item: this is `Abhilien/Abhilien`, the repository whose
`README.md` renders on your GitHub profile. Move the project to its own
repository before it goes further. Nothing here depends on the repository name.

## How the build was verified

`npm test` runs 261 tests — 241 in the engine, 20 on the API guardrails. Those
cover the calculations, not the deployment.

The deployment itself was checked by serving `apps/web/dist` as plain static
files and driving Chromium against it, twice: once from a domain root and once
from `/kundali/`. Each run casts a chart for a village that exists only in the
GeoNames data, opens all eight tabs, drops the network, reloads, and confirms
the app still renders and the chart is still there. Reproduce it with:

```bash
npm run build
npx playwright install chromium    # once
npm run verify                     # add a base path as an argument if you use one
```

It exits non-zero and says what broke. The deploy workflow runs it against the
artifact before publishing, so a GitHub Pages deploy cannot go out broken.

Run it yourself whenever you change the build config. It is the only thing that
catches a wrong base path, and a wrong base path looks perfectly fine until
someone searches for their town.
