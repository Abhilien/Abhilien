# ekam — product design notes

The reasoning behind the product rules, brand and UX. The [README](../README.md) covers the engineering.

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

## The model

| State | Meaning | What happens |
| --- | --- | --- |
| **Discovery** | “I might be interested.” | You get 5 explained recommendations a day. Tapping **I’m interested** opens nothing on its own. |
| **Mutual interest** | “We both chose each other.” | A waiting connection is created on both sides. If your Primary slot is free you *may* begin; otherwise they wait. |
| **Primary** | “We’re actively getting to know each other.” | You get chat, voice, video, meeting and date planning. There is **one romantic and one friendship Primary** per person, on every plan. |

Rules enforced in [`src/domain/rules.ts`](../src/domain/rules.ts) (and covered by tests):

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
