# Kundali API — narration and services

An HTTP API over the engine, plus the AI narration layer.

## The architecture that matters

A language model in an astrology app will confidently invent planetary positions,
and users cannot tell the difference. So the model never computes anything here.

```
birth data ──> engine ──> fact bundle ──> model ──> guardrails ──> response
                (exact)    (the only        (writes)   (verifies)
                           thing the
                           model sees)
```

`facts.ts` is the trust boundary. Everything on its far side was computed and is
exactly correct; nothing else crosses. A model given that bundle has no material
with which to fabricate a position, a date or a yoga — and the guardrails check
that it didn't anyway.

### Guardrails

`guardrails.ts` reads what the model actually produced and rejects:

- **Ungrounded findings** — any "… Yoga" or "… Dosha" not among the computed
  findings. This is the failure a user could never detect themselves. The
  allowed set is derived from the fact bundle's own text, so a narration that
  quotes its citation ("BPHS Ch. 75, Panch Mahapurusha Yoga") is not accused of
  inventing one.
- **Ungrounded years** — any year that is not a computed dasha boundary at any
  level, with one year of slack for prose that rounds.
- **Hard limits** — predictions of death or lifespan, medical claims, financial
  advice, directing a marriage decision, guaranteed outcomes, and fear-driven
  remedy selling.
- **Cancelled doshas presented as active** — the most common dishonesty in this
  field, and the one that sells the most remedies.

Two strikes and the caller gets the deterministic reading instead. A drier
answer is always better than a confident wrong one.

### The deterministic reading

`deterministic.ts` writes a full reading with no model at all. It exists for
three reasons, all commercial:

- it costs nothing per request, so it can be the free tier at any scale;
- it cannot hallucinate, so it is the fallback when the model is unavailable,
  rate-limited, or produces output the guardrails reject;
- it is the reference the AI narration is measured against.

The engine's own test suite asserts that this reading passes every guardrail —
if it ever fails, a guardrail has become too aggressive.

## Routes

| Route | Does |
|---|---|
| `POST /v1/chart` | The raw computation. No model, ever. |
| `POST /v1/facts` | The structured fact bundle a narrator would see. |
| `POST /v1/reading` | A reading. `mode: "template"` forces the zero-cost path. |
| `POST /v1/ask` | A grounded question about one chart. |
| `POST /v1/match` | Ashtakoot compatibility between two charts. |
| `POST /v1/panchang` | Panchang for a place and moment. |
| `GET /health` | Liveness, and whether the model is configured. |

Dependency-free beyond the Anthropic SDK: the surface is six routes, and every
dependency is one more thing to keep patched on a server holding birth data.

## Running it

```bash
npm install
npm --workspace @jyotish/engine run build   # the API consumes the built engine
export ANTHROPIC_API_KEY=...                # optional; without it, template readings
npm run dev
```

Without a key the service starts normally and serves template readings — the
product degrades to its free tier rather than failing.
