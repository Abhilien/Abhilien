# The AI channel business playbook

How to run a portfolio of AI-character ("AI celeb") and faceless Instagram channels as a
business. The agent applies these principles (see the system prompt in `studio/agent.py`).
Treat this file as the human operating manual.

## 1. The business model in one paragraph

Each channel is a small media property. Content costs are low (images cost cents and Claude
plans the posts), so the scarce things are **attention, trust and consistency**. You make money
once a channel holds a defined audience that a brand wants to reach, or one that will buy
something from you. Run several channels in different genres. Most will plateau and one or two
will break out, so run them as a portfolio: kill or pivot the weak ones and double down on
winners. Successful operators (The Clueless, Aww Inc., Sidus Studio X) all work this way:
they are talent agencies whose talent is software.

## 2. Picking genres

Score each candidate niche 1–5 on each column and launch the top 3–5.

| Criterion | What to look for |
|---|---|
| Brand money | Are there brands with influencer budgets? (fashion, beauty, travel, food, fitness, home, tech, gaming) |
| Visual fit | Can it be told in still photos? AI images should look *better* than phone photos here |
| Saveability | Will people save and share it? (outfits, places, recipes-as-ideas, interiors, carousels with value) |
| Competition | How saturated is it? "Pretty AI girl in a bikini" is saturated, and risky under platform rules |
| Language/region gap | Non-English and regional markets (Hindi, Hinglish, Arabic, Portuguese, Indonesian) are less crowded |
| Your edge | Do you know the culture well enough to make it feel real and respectful? |

Good starting portfolio: **2–3 AI characters** in brand-friendly niches (travel, fashion,
food, fitness, gaming) and **2 faceless pages** (aesthetic, places, micro-education). Faceless
pages are cheaper, faster to test, and carry no face-consistency risk.

Use `studio research "<niche>"` to get current evidence before committing.

## 3. What makes an AI celeb work (from the case studies)

1. **A signature trait visible at thumbnail size**: Aitana's pink hair, Imma's pink bob, a mole,
   a colour of jacket. Identity has to survive any outfit or location.
2. **A life, not a lookbook.** Lil Miquela grew because of storylines, friends and opinions.
   Give each character a home base, recurring people and places, and 2–3 running storylines
   (a challenge, a project, a trip, a rivalry).
3. **A point of view.** Values the character holds and boundaries they never cross. Brands buy
   *alignment*, not pixels.
4. **Brand safety as the product.** Rozy's pitch: never ages, never gets cancelled. Your
   operating discipline (approval queue, boundaries, disclosure) is what you sell.
5. **Expand into IP.** Noonoouri got a record deal. Once a character has fans, the character
   can do more than post: music, books, merch, licensing.

## 4. Content system

**Formats** (photos only):

| Format | Purpose | Rule of thumb |
|---|---|---|
| Carousel (2–10) | Saves and shares; the growth engine | Frame 1 is a hook; last frame asks a question or gives a reason to save |
| Single image | Grid aesthetic, announcements, moments | The strongest single image of the week |
| Story sequence (3–5) | Daily relationship with followers | Mini-arc: setup → moment → question. Add polls and question stickers manually in the app |

**Cadence:** 3–7 feed posts a week and 1–2 story sequences a day per channel is enough. Consistency
beats volume. The planner enforces each persona's cadence.

**Pillars:** 3–5 content pillars per channel with target shares (for example 40/30/20/10). The
planner assigns pillars to slots so the mix stays on target.

**Weekly rhythm per channel (≈45–60 min of human time):**

| Day | Task | Command |
|---|---|---|
| Mon | Review last week's numbers, adjust | `studio insights` → `studio review <slug>` |
| Mon | Plan the week | `studio plan <slug> --days 7` |
| Mon | Render and approve | `studio render --persona <slug>` → look at images → `studio approve …` / `reject` |
| Daily | Publish what's due (automate with cron) | `studio publish --live` |
| Daily, 10 min | Reply to comments and DMs *as the character*, add story stickers | Instagram app |

## 5. Growth

- **Saves and shares are the metrics that matter** for reach on Instagram. Design carousels people
  want to keep (guides, outfit formulas, places, comparisons).
- **Reply to comments** in the first hour after posting. Conversation signals matter.
- **Collaborate**: collab posts between your own characters (they can be friends) and with
  human creators in the niche. Cross-promotion inside your portfolio is free.
- **Hashtags:** 5–10 specific ones beat 30 generic ones. Core tags plus rotating tags, per persona.
- **Don't buy followers or use engagement pods or follow/unfollow bots.** They inflate numbers
  brands check for and get accounts restricted.
- **Funnel off-platform early**: a link-in-bio page with an email list or a free download. You
  don't own your Instagram audience; you do own an email list.

## 6. Monetization ladder

| Stage | Followers (rough) | Revenue options |
|---|---|---|
| 0 | 0–5k | None yet. Prove the concept; find the pillar that gets saves |
| 1 | 5k–20k | Affiliate links (Amazon, LTK-style programs, niche brands), digital products (presets, wallpapers, guides, itineraries) |
| 2 | 20k–100k | Paid brand posts (labelled #ad / paid-partnership tool); UGC-style product shots; small brand retainers |
| 3 | 100k+ | Brand ambassador deals, licensing the character, your own product line, selling "virtual ambassador" services to brands |

Sponsored-post prices vary widely by niche, engagement and region. Ask brands for their budget
and build a media kit (`studio research "media kit benchmarks for <niche>"`).

**Agency play:** once you run 3–5 channels well, sell the capability. Build a branded virtual
ambassador for a company (Lu do Magalu is the template), and charge setup plus a monthly fee.

## 7. Rules that keep the business alive

| Rule | Why |
|---|---|
| **Disclose AI** in bio and caption (the code appends it to every caption) | Meta labels AI content and expects disclosure of realistic AI images. Ad regulators (FTC, ASCI, ASA) treat undisclosed AI and undisclosed ads as misleading. Trust is the asset |
| **Original characters only.** Never a real person's face, name or likeness | Right-of-publicity, impersonation and deepfake laws; Instagram removes impersonation |
| **Adults only** (the studio requires age ≥ 18 and defaults to 21+) | Non-negotiable legal and platform line |
| **No sexualised content** | Fastest way to lose reach, brand deals and the account |
| **Label paid posts** | Legally required in most markets |
| **Official API only** (Graph API, no bots or unofficial libraries) | Automation through unofficial clients violates Instagram's terms and gets accounts banned |
| **Human approval before publishing** | One bad image (six fingers, wrong face, accidental brand logo) can sink a character |
| **Don't fake reality** for products or places (fake results, fake trips) | Consumer-protection law; it also destroys trust when exposed |

Check your local rules too: AI-labelling and influencer-advertising rules are changing fast
in the EU, India, the UK and the US.

## 8. KPIs to watch (per channel, weekly)

- Followers and weekly growth %
- **Saves per 1k reach** and **shares per 1k reach** (content quality)
- Story reach ÷ followers (relationship strength)
- Profile visits → link clicks → email signups / sales (business)
- Top 3 and bottom 3 posts: what's different? (`studio review` does this)

Kill or pivot a channel that shows no growth after ~60–90 days of consistent posting despite
two pivots in content angle.
