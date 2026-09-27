# ekam — Meet many. Choose one.

A working prototype of an intentional dating and matrimonial platform built on **scarcity of attention**.
You can meet many people and like many people, but you give your full attention to one.

> You don’t need 1,000 matches. You need enough choice to find someone — and enough restraint to actually get to know them.

```bash
cd ekam
npm install
npm run dev          # http://localhost:5173
npm test             # domain rule tests (vitest)
npm run build        # static build in dist/
npm run build:single # one self-contained HTML file in dist-single/
```

Everyone in the sample community is fictional. The portraits are generated duotone illustrations standing in for member photos.

---

## Brand

| Concept | Meaning | Verdict |
| --- | --- | --- |
| **ekam** | Sanskrit/Hindi for *one* | **Chosen.** Short, easy to say in any language, rooted in India without sounding regional. It names the product’s one idea: one Primary. |
| Saath | Hindi for *together* | Warm, but feels India-only and the name is widely used. |
| Chosen | English | Strong emotion, but generic and hard to own. |
| Within | English | Elegant but abstract. It doesn’t explain anything. |
| Niyyat | Urdu for *intention* | Beautiful, but hard to spell and pronounce outside South Asia. |
| Vow | English | Too marriage-heavy; leaves out friendship. |

- **Wordmark:** a lowercase serif *ekam*.
- **Mark:** one clay-coloured point of focus inside a wider circle: many people around you, one person in focus.
- **Tagline:** *Meet many. Choose one.* Supporting line: *Less choice. More connection.*
- **Palette:** ivory and ink, with **clay** for romance and **sage** for friendship. There is no Tinder pink or red, no neon and no gradients-as-decoration. Brass marks Premium, sparingly.
- **Type:** Instrument Serif for editorial display text, Inter for the interface.
- **Light and dark** themes both come from one set of colour tokens.

---

## The model

| State | Meaning | What happens |
| --- | --- | --- |
| **Discovery** | “I might be interested.” | You get 5 explained recommendations a day. Tapping **I’m interested** opens nothing on its own. |
| **Mutual interest** | “We both chose each other.” | A waiting connection is created on both sides. If your Primary slot is free you *may* begin; otherwise they wait. |
| **Primary** | “We’re actively getting to know each other.” | You get chat, voice, video, meeting and date planning. There is **one romantic and one friendship Primary** per person, on every plan. |

Rules enforced in `src/domain/rules.ts` (and covered by tests):

- A person holds at most one Primary per kind. A **paused** Primary still holds the slot.
- A Primary is always shared: it only activates when **both** people have a free slot. Otherwise the invitation waits quietly.
- Having a Primary doesn’t remove you from Discovery. New mutual interest goes to the waiting list.
- **Changing Primary** means first deciding what happens to the current one: *continue*, *move to friendship*, *pause and return to waiting* (mutual interest kept), or *close*.
- **Romance → friendship** frees the romantic slot. The friendship becomes Primary if both friendship slots are free, otherwise it goes to the waiting list, marked “once romantic”.
- **Closure** asks for a reason plus an optional kind note. Neither person is shown to the other in Discovery again, and closures are never counted publicly.
- **Waiting reminder:** after mutual interest has waited 7 days, each person gets one gentle “Someone on your waiting list is still interested.” It is never repeated and never shows a count.
- **Pausing your profile** hides you from new Discovery. Your connections and waiting lists stay exactly as they are.

## Trust, transparency and feedback

- **Verification:** identity, phone, photo, employment, education and profile details, each shown as “independently confirmed”, never as “better”.
- **Maturity:** *Established*, *Limited history* or *New member*, each with its criteria shown. “New” never means suspicious.
- **Platform history (Premium):** aggregate counts, connection-length patterns, and when photos, location or intent last changed. It never shows identities, conversations or who ended things.
- **Connection Feedback:** after a meaningful Primary ends, both people rate structured traits and can leave an optional comment.
  - **Double-blind:** feedback is released only when both people have submitted, or after 14 days.
  - **No summary under 5 responses:** before that, the profile says “Not enough feedback yet”.
  - **Screened first:** comments that look like harassment, doxxing, links or handles are held for human review. Members can report a comment, which hides it until someone reviews it. There’s a demo Trust & Safety console.
  - **No automatic labels:** a report or negative feedback never labels anyone.

### Reciprocal visibility — *See feedback ⟷ Share feedback*

`src/domain/trust.ts → feedbackAccess(viewer, target)`

| Viewer | Own feedback | Can view others? |
| --- | --- | --- |
| Free | Always visible | No |
| Premium, visibility **on** | Visible | Yes, but only people whose feedback is also visible |
| Premium, visibility **off** | Hidden | No |

Downgrading to Free switches your feedback back to visible.

## Premium

- **Advanced filters** (age, intention, verified-only) narrow the day’s 5. Changing filters keeps people you already considered counted, so filters can never show more than 5 a day.
- **Incognito** views are never recorded. Everyone else’s views appear in a quiet *Recent profile visitors* list under Privacy, never as notifications.
- **Verification:** identity, phone, photo and profile checks are free. Employment and education are Premium. You can run each check from You → Verification (simulated).

Premium gives you **more reach, more information, more control and more verification**. It **never** gives you more Primaries, unlimited swiping, boosts, a higher ranking, a way to look at feedback while hiding your own, or a view of who passed on you. The rules live in `src/domain/entitlements.ts`. `concierge` is a reserved plan with a `matchmaker` entitlement, so a future human-matchmaking tier can be added without changing the model.

---

## Architecture

```
src/
  domain/            pure TypeScript, no React — the product rules
    types.ts         data model
    rules.ts         connection engine (state in → state out)
    discovery.ts     reach, eligibility, curation, “Why this person?”
    trust.ts         feedback access, summaries, maturity, stats, screening
    privacy.ts       progressive sharing (Discovery → Mutual → Primary)
    entitlements.ts  what each plan unlocks
    seed.ts          fictional community covering every state
    rules.test.ts    30 tests of the rules above
  state/
    store.tsx        React context, simulated clock, localStorage persistence
    simulate.ts      demo stand-in for “the other person”
  components/        Icon, Portrait, Sheet, Trust, ProfileBody, DemoPanel, ui
  screens/           Welcome, Home, Discover, Profile, Connections (+ Change Primary),
                     Chat, DatePlan, Close, Feedback, Inbox, You (+ settings), Premium,
                     Report, Safety
```

Because the domain layer is pure, a real backend can wrap the same functions behind an API and keep identical behaviour.

## Prototype controls

On desktop, the panel beside the phone frame lets you:

- **Explore as** one of three personas:
  - **Abhishek:** Premium, dating Ananya, four people waiting.
  - **Meera:** Free, new member, open slot.
  - **Sarah:** Premium, London, feedback hidden.
- **Someone in Discover chooses you:** a quiet reciprocal interest, with no notification.
- **Move to tomorrow:** get a fresh daily selection.
- **Network: failing:** see the error and retry states.
- **Theme:** switch between system, light and dark.
- **Trust & Safety console** and **Reset all sample data**.

On mobile, the same controls are behind the gear on Home or under You → Prototype controls.

## 30-second comprehension checklist

| Concept | Where it’s taught |
| --- | --- |
| I can like multiple people | Onboarding step 1; the daily Discover deck |
| Mutual interest ≠ active conversation | Onboarding step 2; the interest-result sheet |
| I can only actively date one person | Home “Your connections”; Connections “1 of 1” |
| Other mutual connections wait | Home “Waiting”; Connections waiting list |
| I stay discoverable while dating | Onboarding step 4; the “Mutual interest with X” sheet |
| Romance can become friendship | Change Primary flow, chat menu, closure suggestion |
| Premium = farther discovery | Discovery reach (locked tiers); end-of-day card |
| Premium = more information | Trust & history → Platform history (locked teaser on Free) |
| Feedback is reciprocal | Onboarding step 3; every locked feedback panel |
| To see feedback, mine must be visible | You → Connection Feedback; Sarah’s persona |
| Premium controls my visibility | On/off switch (Premium) vs “Always visible on Free” |
