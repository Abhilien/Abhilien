# Kundali — a Vedic astrology platform

A complete, working Jyotish product: an exact calculation engine, an offline
mobile app, and an AI narration layer that cannot fabricate.

> **Note on this repository.** This is `Abhilien/Abhilien`, the special repo
> whose `README.md` renders on your GitHub profile. That file has been left
> untouched. Before this goes further, move the project to a dedicated
> repository — a product codebase does not belong in a profile repo, and the
> profile README will be confusing to anyone who lands here.

## What exists

| Package | What it is | State |
|---|---|---|
| `packages/astro-engine` | Deterministic Jyotish engine. No network, no clock, no randomness, no model. | 175 tests |
| `apps/web` | Offline-first PWA, 58 KB gzipped, Hindi and English. | Verified in a real browser |
| `apps/api` | HTTP API + grounded AI narration with guardrails. | 20 tests |

## The one idea everything follows from

About 90% of what a Kundali app tells a user is not a matter of opinion. It is
astronomy plus a body of rules that classical texts already state as formal
conditions — "if Jupiter is in a kendra from the Moon" is a boolean function,
not a language problem.

So: **compute everything that can be computed, and let a model only put it into
words.** The model never calculates a position, a period or a rule outcome, and
a set of guardrails verifies that it didn't.

## Engine

- **Ephemeris** — astronomy-engine (MIT), validated against JPL DE405/DE431.
  Chosen over the Swiss Ephemeris deliberately: SE is AGPL, which would force
  this codebase open or cost a commercial licence, and its extra precision is
  irrelevant when charts are read to the arcminute.
- **Ayanamsa** — Lahiri by default, from the IAU 2006 precession polynomial
  anchored at the Swiss Ephemeris epoch, so results agree with mainstream
  Indian software. Reproduces published values for 1900–2020 to within 13″.
  Raman, KP, Yukteshwar and a properly computed True Chitra.
- **Time** — IANA zones only, resolved to the second. India had no uniform
  offset before 1955 (Madras +05:21:10, Calcutta +05:53:20, wartime +06:30), and
  a hardcoded +05:30 puts a 1943 ascendant half a sign out.
- **Charts** — whole-sign, Equal, Porphyry, Sripati. All sixteen vargas.
- **Dashas** — Vimshottari to five levels, Yogini, Ashtottari.
- **Strength** — Ashtakavarga (Bhinna and Sarva) with self-checking tables.
- **Rectification** — birth-time search from dated life events, with a confidence
  that is allowed to say no.
- **Rules** — yogas and doshas, each with a classical citation, each disputed
  rule flagged as disputed, each dosha carrying its cancellations.
- **Panchang** — five limbs, Rahu Kaal, Gulika, Yamaganda, Abhijit, choghadiya,
  horas, all anchored on sunrise rather than midnight.
- **Matching** — Ashtakoot Guna Milan, all 36 points, with exemptions.

## How correctness is established

Not by assertion. The suite checks things the code cannot fake:

- The computed **ascendant is converted back to horizon coordinates** and
  asserted to be actually on the eastern horizon, across latitudes from the
  southern hemisphere to Srinagar and across all 24 hours. This caught a sign
  error that a plausible quadrant heuristic had been masking — wrong in 120 of
  120 samples.
- Sidereal solar ingresses must land on **Mesha Sankranti (14 April)** and
  **Makara Sankranti (14–15 January)**, validating ephemeris and ayanamsa
  together.
- Lahiri must advance at precession rate with **no 18.6-year nutation wobble**.
- Navamsa is cross-checked against an independent derivation at every longitude.
- Vargottama is **derived** to fall on the 1st/5th/9th navamsa of movable/fixed/
  dual signs, matching the classical statement.
- Ashtakavarga tables must total 48/49/39/54/56/52/39 and **exactly 337**.
- Dasha sub-periods must tile their parent with no gap or overlap.
- India's Independence chart reproduces the published horoscope: **Vrishabha
  lagna 7°43′, Moon in Pushya**.

## How honesty is enforced

This industry's characteristic failure is selling remedies for problems the
texts say do not exist. Three mechanisms push against that:

1. **Cancellations are first-class.** Most charts that "have" Mangal Dosha have
   it cancelled. The engine reports the cancellation, the app shows it in its own
   section, and a guardrail rejects narration that omits it.
2. **Every rule cites a source**, and contested rules say they are contested.
   Kaal Sarp states plainly that it is not in the Parashari corpus.
3. **Uncertainty is surfaced, not hidden.** An unknown birth time suppresses the
   ascendant, houses and vargas rather than displaying them as if they meant
   something. Pre-1955 Indian births carry a warning.

A test asserts that no rule's stated effect uses "you" or "will" — findings are
traditional attributions, not claims about a person.

### The rectification result is the clearest case

Birth-time rectification is where an astrology product is most tempted to invent
confidence, so its confidence was **measured against a null** rather than
assumed. Scoring twelve sets of *random* event dates produced peaks standing
1.1–2.7 standard deviations above their window mean; a synthetic true history
scored only 1.2. Noise routinely out-scored signal. Per-event agreement failed
the same way. Only leave-one-out stability separated them at all (signal 13.5
minutes, noise median 50), and noise still beat it in 3 trials of 12.

So the module has **no "Strong" or "Certain" tier for the minute** — the type
itself makes that unrepresentable — and when it does state a result the verdict
discloses that random dates cleared the same bar about one time in six.

What it *can* do reliably it reports separately: the rising sign is often
settled even when the minute is not, and that is the output a practitioner can
act on. On a synthetic history it recovers the true birth time to within one
minute while still, correctly, declining to claim it.

## Running it

```bash
npm install
npm --workspace @jyotish/engine run test    # 175 tests
npm --workspace @jyotish/engine run build
npm --workspace @jyotish/web run dev        # the app
npm --workspace @jyotish/api run dev        # the API
```

The API works without an `ANTHROPIC_API_KEY` — it serves template readings,
which is the intended free tier.

## What is not done yet

Stated plainly, because a half-built feature presented as finished is worse than
a missing one:

- **Shadbala.** Sthana, Dig, Naisargika and Cheshta are well specified, but
  several Kala Bala sub-components differ materially between authorities and
  there is no arithmetic identity (like Ashtakavarga's 337) to catch a wrong
  choice. It lands when it can be validated against reference tables.
- **KP system and Placidus houses.** Held back for the same reason — validated
  against KP reference tables, or not shipped.
- **Full place database.** 150 places are bundled; production needs the GeoNames
  India extract (~500k places) behind the same interface.
- **Voice and more languages.** Hindi is complete; the engine is ready for the
  rest. Bhashini (Government of India) provides free Indic ASR and TTS.
- **Transits, Sade Sati, muhurta selection, Prashna.**

## Before selling this

- Astrology apps are permitted on both stores. The lines not to cross are
  medical claims, death predictions, and fear-based monetisation — all three are
  blocked in code here, and that should stay true.
- Birth data is personal data under the **DPDP Act 2023**. The app stores it only
  on-device; the API must not log it.
- The astronomy is exact science. The interpretive layer is a traditional system
  without scientific predictive support. Presenting it as faithful, cited
  tradition is both the honest position and the one that keeps the product safe.
