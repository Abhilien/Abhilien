# Persona Studio

An AI agent that **researches, designs, plans and runs a portfolio of AI Instagram channels**:
AI characters ("AI celebs") with a consistent face, and faceless pages. It covers photos,
carousels and stories, in any genre.

```
           ┌──────────────── Claude agent (studio/agent.py) ────────────────┐
 research ─┤ web search · case studies · your own metrics                    │
 design   ─┤ persona bible (YAML): identity lock, style, voice, pillars      │
 plan     ─┤ fills calendar slots with concepts, scenes, captions, hashtags  │
           └──────────────────────────────┬──────────────────────────────────┘
                                          ▼
   queue (SQLite) ── render (image model) ── YOU approve ── publish (Instagram Graph API) ── insights
                                                                                   │
                                     review: agent reads the numbers, adjusts the plan ◄┘
```

The agent does the creative and strategic work. **You keep the two decisions that matter:
which images go out, and when the studio is allowed to post for real.**

## What's inside

| Path | What it is |
|---|---|
| `studio/agent.py` | The Claude agent: system prompt, tools, agent loop, and the `new`/`research`/`plan`/`review` missions |
| `studio/persona.py` | Persona bible schema plus the rules (original, adult, disclosed) |
| `studio/planner.py` | Deterministic calendar: cadence, carousel mix and pillar mix per channel |
| `studio/prompts.py` | Image prompt assembly with the locked identity on every frame |
| `studio/imagegen.py` | Image providers (`mock` offline, `replicate`) plus story text overlays |
| `studio/instagram.py` | Official Graph API client: single, carousel, story, insights |
| `studio/pipeline.py` | Render → publish → measure; the disclosure is always appended to captions |
| `studio/dashboard.py` | A static HTML dashboard of all channels |
| `personas/` | 5 example channels: 3 AI characters, 2 faceless |
| `research/case_studies.yaml` | Successful AI influencers and faceless models, with what worked |
| `docs/PLAYBOOK.md` | **The business:** niche selection, growth, monetization ladder, weekly routine, rules |
| `docs/CONSISTENT_FACES.md` | How to keep a character's face the same (reference images, LoRA) |
| `docs/INSTAGRAM_SETUP.md` | Connecting each channel to the Instagram Graph API |

### Example channels

| Slug | Type | Genre |
|---|---|---|
| `luna-voss` | AI character | Slow travel & capsule fashion, Lisbon |
| `kabir-sethi` | AI character | Mumbai street food & city culture, in Hinglish |
| `mira-okafor` | AI character | Sustainable fashion & thrifting, London |
| `cabin-hours` | Faceless | Cozy cabins & interiors |
| `midnight-tokyo` | Faceless | POV night walks in an imagined Tokyo |

## Quick start

```bash
cd persona-studio
pip install -e ".[dev]"
cp .env.example .env            # add ANTHROPIC_API_KEY (or run `ant auth login`)

studio personas                 # list channels
studio research "AI influencers in the Indian food niche: what works in 2026"
studio new "faceless page of AI-imagined Indian palace interiors, for decor lovers"
studio plan luna-voss --days 7  # the agent fills next week's calendar
studio queue --persona luna-voss
studio show 3                   # scenes, overlays, caption exactly as it will post
studio render --persona luna-voss   # mock images by default; set IMAGE_PROVIDER=replicate for real ones
studio approve 1 2 3            # or: studio reject 4
studio publish                  # dry run until you enable live posting
studio dashboard                # writes dashboard.html
studio chat                     # talk to the agent: "which channel should I double down on?"
```

`studio --effort xhigh plan …` gives the agent more reasoning for harder planning, and `--no-web`
turns off web research.

Going live: follow [docs/INSTAGRAM_SETUP.md](docs/INSTAGRAM_SETUP.md), then set
`ALLOW_LIVE_PUBLISH=true` and run `studio publish --live` (or schedule it with cron).

## Costs (rough)

- **Claude:** planning a week for one channel is one agent run of a few dozen tool calls; research
  runs add web searches. Use `--effort medium` for routine weeks.
- **Images:** a few cents per image on hosted FLUX-class models. A channel with 4 feed posts
  (≈10 images) and 7 three-frame story sequences uses about 30 images a week.
- **Instagram API:** free.

## Safety rails (enforced in code, not just suggested)

- Personas must be **original** (no `based_on_real_person`, plus a tripwire list of famous
  names), **adult** (age ≥ 18), and have a **disclosure** line.
- The disclosure is appended to **every caption** by code, never left to the model.
- Faceless channels reject scenes containing faces or selfies.
- The agent **cannot** render, approve or publish. Those are human commands.
- Nothing posts for real unless `ALLOW_LIVE_PUBLISH=true` **and** `--live` is passed.
- Publishing uses only the official Graph API, with a per-channel daily cap.

## Tests

```bash
python -m pytest -q
```

The tests cover persona rules, the planner, prompts, render and dry-run publishing, the Graph
API call sequence, and the agent loop (with a scripted fake Claude client, so no network is needed).
