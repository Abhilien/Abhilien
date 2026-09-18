# @jyotish/engine

Deterministic Vedic astrology (Jyotish) calculations. Pure functions, no network,
no clock, no randomness — and no language model anywhere in the computation path.

## Why this exists

Roughly 90% of what a Kundali app tells a user is not a matter of opinion: it is
astronomy plus a body of rules that classical texts already state as formal
conditions. Those parts should be *computed*, exactly and identically every time.
A language model belongs only in the layer that puts computed findings into
words.

## Design contract

1. Every export is a pure function of its inputs.
2. No model ever computes a position, a period, or a rule outcome.
3. Where classical authorities disagree, the disagreement is represented rather
   than resolved by fiat.

## Decisions worth knowing about

**Ephemeris.** [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT),
validated against JPL DE405/DE431. The Swiss Ephemeris is more precise but is
AGPL, which would force this codebase open or require a commercial licence — and
its extra precision is irrelevant when charts are read to the arcminute.

**Ayanamsa.** Lahiri (Chitrapaksha) by default, the Rashtriya Panchang standard.
Implemented from the IAU 2006 general-precession polynomial anchored at the same
epoch constant Swiss Ephemeris uses, so results agree with mainstream Indian
software. Verified against published values for 1900, 1950, 2000 and 2020 to
within 13 arcseconds — about 0.1% of a nakshatra pada. Raman, KP and Yukteshwar
are anchored the same way; True Chitra is computed from Spica's actual precessed
position rather than a fitted constant.

**Time.** The caller supplies an IANA zone id, never a numeric offset. This is
not pedantry: India had no uniform offset before 1955. Calcutta ran +05:53:20,
Bombay +04:51, Madras +05:21:10, and the entire country observed +06:30 war time
from September 1942 to October 1945. Offsets are resolved to the second, because
several of those are not whole minutes and rounding them moves the ascendant.

**Houses.** Whole-sign by default, as Brihat Parashara Hora Shastra describes and
as North and South Indian practice use. Equal, Porphyry and Sripati are also
available. Placidus is deliberately *absent* until the KP module lands, where it
can be validated against KP reference tables instead of shipped unverified.

**Nodes.** Mean node by default, matching Indian panchangs. The true node is
available and is computed properly from the Moon's osculating orbital plane
(ẑ × h), not approximated.

**Honesty about birth time.** Charts carry warnings rather than projecting false
precision: unknown or coarse birth times, DST gaps and overlaps, high latitudes,
and pre-1955 Indian births all produce an explicit caveat the UI must surface.

## Validation

Beyond unit tests, the suite checks the engine against facts it cannot fake:

- The computed ascendant is converted back to horizon coordinates and asserted to
  be **actually on the eastern horizon**, sampled across latitudes from the
  southern hemisphere to Srinagar and across all 24 hours. This caught a sign
  error that a plausible-looking quadrant heuristic had been masking.
- Sidereal solar ingresses must land on **Mesha Sankranti (14 April)** and
  **Makara Sankranti (14–15 January)**, which validates ephemeris and ayanamsa
  together.
- The Lahiri ayanamsa must advance smoothly at general-precession rate with **no
  18.6-year nutation wobble**, which is how a precession-anchored ayanamsa is
  distinguished from a star-anchored one.
- India's Independence chart (15 Aug 1947, 00:00 IST, Delhi) reproduces the
  horoscope published in standard texts: Vrishabha lagna 7°43', Moon in Pushya.

```bash
npm test
```
