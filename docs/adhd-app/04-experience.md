# Part 4: AI architecture, UX architecture, home screen, personality, notifications, conversations, journeys

## 10. AI architecture: an executive-function agent the user controls

### 10.1 What the AI is for

The AI is not a chatbot you visit. It is a set of **narrow, reliable skills** that run behind capture, cues, starting and resuming:

| Skill | Input | Output | Model |
|---|---|---|---|
| **Parse** | Voice or text dump | Structured items (type, time, trigger, why, people, confidence) | On-device rule and grammar parser for common forms; cloud LLM for complex dumps (with a local fallback) |
| **Decompose** | Task + size check + ≤2 answers | ONE next physical step (+ hidden full plan) | LLM with constrained output schema; offline library for common tasks |
| **Recommend** | Tasks, calendar, time until next anchor, energy chip | Top-1 + reason + alternative | **Deterministic heuristic** (§8.8), learned weights later. *Not* an LLM decision. |
| **Time** | Calendar event, travel API, personal offsets | Leave/prep times, state | Deterministic + per-user statistics |
| **Adapt** | Notification outcomes | Per-user timing and strategy preferences | Simple on-device bandit / Bayesian averages |
| **Summarise** | Parked sessions, day log | Resume cards, morning brief, night handoff prompts | Small LLM (on-device where possible) |
| **Draft** | "Reply to landlord about X" | Draft text | LLM |
| **Converse** | "I can't deal with this", "what am I supposed to be doing?" | Routes to the flows above, with short warm language | LLM, tightly scoped |

**Design rule:** the LLM *proposes language and structure*. **Deterministic code decides timing, escalation and anything safety-critical.** Alarms never depend on a model call.

### 10.2 Permission matrix: what the AI may do

| Category | Examples |
|---|---|
| **Does automatically** (reversible, low-stakes, shown with undo) | Parse captures into items; set times the user *said*; generate the first step; create resume cards; batch non-urgent notifications into digests; auto-archive untouched undated items after 14 days; compute leave times |
| **Suggests, applies on one tap** | Assign a date to an undated item; change a reminder time based on learned patterns; add a prep-time correction; create a new anchor ("lunch"); move today's leftovers to tomorrow; if-then plans; change a notification tier |
| **Asks explicit permission, every time** | Anything that contacts another person (drafted messages, buddy pings, "running late" texts); any access to a new data source (calendar, location, email, contacts, health); escalating to *critical* tier for an item the user hasn't marked; deleting anything (not archiving) |
| **Never does** | Send messages, pay, book, or buy on its own; share data with third parties for ads; infer or label health or mental states, diagnoses, or medication effects; give medication/dosing advice; use shame, threats or loss-framing; wake the user with an alarm they didn't set; notify a trusted person automatically |

### 10.3 Memory model

- **Items** (tasks, reminders, waiting, events, notes), **Sessions** (start/stop, parked context), **Anchors**, **Outcomes** (notification → action), and **Patterns** (derived statistics with an evidence count).
- Memory is **inspectable and deletable** item by item ("What I've learned").
- The LLM gets **minimal context per call**: the relevant items, not the full history. No training on user data without separate opt-in consent (default off).

### 10.4 Guardrails

- **Structured outputs** with schema validation. Anything that fails validation falls back to rule-based output.
- **Time and date confirmation** whenever the parse is ambiguous, relative ("next Friday" near a weekend), or crosses a timezone.
- **Crisis detection:** a lightweight classifier on free text in Overwhelm and Converse. If self-harm language is detected, the app shows local crisis resources and suggests contacting someone. It does not try to counsel (§23, Part 5).
- **Tone linter:** generated copy is checked against a banned-phrase list ("again", "failed", "you should have", "lazy", "just do it").

---

## 11. UX architecture

The internal modules (Capture / Remember / Start / Focus / Switch / Recover / Understand) are **invisible**. The user sees **three places** and **one button**:

```
┌─────────────────────────────────────────────┐
│  NOW (home)        ·   LATER   ·   YOU       │
│  one next thing        all stuff    settings,│
│  countdown             (search-     learned, │
│  resume                first)       privacy  │
│                                              │
│              [ 🎙 hold to capture ]          │  ← always present
└─────────────────────────────────────────────┘
```

- **NOW:** everything time-relevant *right now*. This is where 90% of use happens.
- **LATER:** all items. **Search-first**, no folders. Grouped softly: *Soon · Scheduled · Waiting · Parked · Someday*. Sorting and filters are hidden behind "⋯".
- **YOU:** preferences, "What I've learned", notification tiers, privacy, accessibility. It is deliberately boring.
- **Modes**, entered from NOW, the lock screen, or voice: *Start* (timer), *Stay with me*, *Overwhelm*, *Reset day*, *Morning*, *Night*, *Leave*. Each mode takes over the full screen, with one exit.

---

## 12. Home screen (NOW) specification

### 12.1 Layout (phone portrait, top to bottom)

```
┌───────────────────────────────────┐
│ Tue 4:12 pm            ◐ (you)    │  status row: time, avatar → YOU
│ ─────●─────────|─────────|──────  │  day strip: now ● + next anchors
│        now    5:00 prep  6:00 🦷  │
├───────────────────────────────────┤
│  🟢 Free until 4:50               │  TIME CARD (state + plain text)
│  Dentist 6:00 · leave ~5:30       │
├───────────────────────────────────┤
│  NEXT                              │  PRIMARY CARD (one thing)
│  Pay electricity bill             │
│  due tomorrow · ~3 min            │
│  because: late fee                │
│  [   ▶ Start 3 min   ]  ⋯         │  big primary button
│  swipe for another →              │
├───────────────────────────────────┤
│  ⟲ Presentation · slide 7         │  RESUME CARD (if any)
│  next: find X revenue  [Continue] │
├───────────────────────────────────┤
│  2 more today ▾                   │  collapsed
├───────────────────────────────────┤
│  (😮‍💨 Overwhelmed)  (↺ Reset day)  │  quiet text buttons
│        ( 🎙  hold to capture )     │  floating, thumb zone
└───────────────────────────────────┘
```

### 12.2 Hierarchy rules

1. **Time card**: always at the top when an anchor is within 3h. It becomes the *primary* card in 🟡/🟠/🔴 states, and the NEXT card collapses.
2. **NEXT card**: one item, with the reason shown. The primary button always *starts* something (a timer, a link, the Start flow). It never just marks something done.
3. **Resume card**: only if something is parked from the last 7 days.
4. **Everything else is collapsed.** Maximum visible: 3 cards + the capture button.

### 12.3 Visual design

- **Feel:** calm, warm, premium, adult. Reference points: Things 3 restraint, Tiimo softness, Apple Weather's use of time and gradients. It should not look like a corporate dashboard.
- **Colour:** warm neutral background (light: `#FAF7F2`; dark: `#15161A`), one accent (deep teal `#1F7A74`). State colours: green `#3A8F5C` / amber `#C98A1B` / orange `#D06A2B` / red `#C2413A`. They are always **paired with an icon and words** (not colour alone). Red is **only** used for "leave now", never for overdue items (there is no overdue state).
- **Typography:** SF Pro / Roboto as system defaults (Dynamic Type / font scaling support). Optional **Atkinson Hyperlegible** or **Lexend** as a user choice. Body ≥17pt, primary card title 22–28pt, line height 1.4, left-aligned, no justified text, sentence case (no ALL CAPS paragraphs).
- **Motion:** gentle (200–300ms ease-out). The time ring shrinks continuously. **Reduced Motion** is respected: static ring, no parallax, no confetti.
- **Haptics:** a light tick on capture saved, a satisfying "thunk" on start, a soft double on done. All can be turned off.
- **Sound:** off by default in the app. Timer ends use a soft chime. Alarms are melodic by default [31].

### 12.4 Interaction patterns

- **Swipe right on NEXT:** another suggestion (with a reason). **Swipe left:** "Not now" → smart Later sheet.
- **Long-press any card:** Smaller · Later · Drop · Edit.
- **Hold 🎙 anywhere:** capture. Release to save; slide up to cancel.
- **Pull down on NOW:** "What now?" re-computes (with an optional energy chip).
- **Undo toast** on every automatic action (6 seconds).

### 12.5 States

| State | What NOW shows |
|---|---|
| **Empty (Day 1)** | "Hi. What's on your mind? Hold the mic and just talk." Two example chips: *"Call mom tomorrow"*, *"Leave for dentist at 5"*. No tutorials. |
| **Nothing due** | "Nothing urgent. 🌿" + one gentle suggestion (a parked task or a better break), or "Enjoy it." |
| **Morning** (after alarm / first unlock) | Morning brief takeover (§8.7, Part 3) → then NOW with "First: get dressed" or the morning routine card. |
| **Leave active** | The Time card goes full width with a ring and checklist; everything else is hidden. |
| **Focus session** | Timer, task, "park" button, anchor warning slot. Nothing else. |
| **Overwhelm** | Blank calm screen → one-thing picker → one card. The notifications pause banner is shown. |
| **Evening** (after the user's wind-down time) | "Wind down?" card → Night handoff; the day strip dims. |
| **Returning after absence** | "Welcome back 👋 I tucked older stuff away. 2 things actually matter:" (no count of what was archived) |
| **Offline / AI down** | Everything works. Captures show "saved, I'll sort it when I'm back online" |

---

## 13. Brand and personality

### 13.1 Name options (all need trademark and App Store search; none has been cleared)

| Name | Rationale | Risk |
|---|---|---|
| **Waypoint** (working) | Transitions, next point, "where was I" | Common word; crowded namespace |
| **Nowish** | Playful, time-honest, ADHD-friendly humour | Might read as unserious |
| **Next Step** | Literal core value | Generic, hard to own |
| **Pickup** | "Pick up where you left off" | Ambiguous (dating/delivery) |
| **Cairn** | Trail markers that show the way | Obscure meaning for some |
| **Kindly** | The tone as the product | Soft; says nothing about what it does |
| **Onward** | Momentum, no looking back | Generic |

**Recommendation:** shortlist *Waypoint*, *Nowish* and *Cairn*, and run a quick 5-second test with the target audience.

### 13.2 Taglines

- "Your brain's missing sticky note."
- "The next step, at the right moment."
- "Remembers, nudges, gets you started."
- "Less managing. More doing."
- "For brains that have a lot of tabs open."

### 13.3 Brand philosophy

**Friction is the enemy, not the user.** When something slips, the product assumes the system failed, not the person. It is warm like a good friend who happens to be very organised: never a coach who's disappointed in you, never a cartoon mascot talking down to you.

### 13.4 Tone of voice

| Do | Don't |
|---|---|
| Short, specific, plain | Long, abstract, "productivity-speak" |
| "Looks like that one slipped. Want to make it smaller?" | "You haven't completed your task again." |
| "Nice, you started." | "Great job!!! 🎉🎉🎉" (every time) |
| "Leave in 8 min. Shoes, keys, phone." | "REMINDER: DEPARTURE TIME APPROACHING" |
| "I've noticed you usually…" | "Your ADHD makes you…" |
| "The day isn't over." | "You wasted the day." |
| Light humour when things are calm | Jokes during stress, overwhelm or lateness |

### 13.5 Microcopy library (samples)

- Capture saved: "Got it." / "Out of your head, into mine."
- After a start: "That's the hard part done."
- Stop here: "Stopping is allowed. I saved your place."
- Coming back: "Welcome back. No catching up needed."
- Postponed 3×: "This one keeps sliding. Want a smaller first step, or should we drop it?"
- Drop: "Dropped. Not everything deserves doing."
- Empty Later list: "Nothing waiting. Suspicious, but nice."
- Permission ask: "To tell you when to leave, I need your calendar. I only read times and places. [Allow] [Not now]"

---

## 14. Example notifications

| Situation | Notification | Actions |
|---|---|---|
| Bill, cue (event-triggered: morning brief) | "⚡ Electricity bill due tomorrow · ~3 min" | Pay now · Later ▸ · Done |
| Bill, reframe | "Paying today avoids the £10 late fee. Link's ready." | Pay now · Smaller · Tonight 8pm |
| Bill, rescue | "This one keeps slipping. 2-minute start now, or pick a time?" | Start 2 min · Pick time · Drop |
| Leave, get ready | "🟡 Dentist at 6. Start getting ready. Leave in 30." | Show checklist · +10 min |
| Leave now | "🔴 Leave now for 5:55 arrival. Keys, wallet, documents." | I'm leaving · Running late ▸ |
| Late | "You'll get there ~6:07. Want me to draft 'running 7 min late'?" | Draft · No |
| Place trigger | "📍 At the pharmacy: pick up the prescription." | Done · Not now |
| Anchor during focus | "Pickup in 15. Park your place?" | Park & finish · 5 more min |
| Waiting | "Amazon refund was due today. Nudge them?" | Draft message · +3 days · Got it ✓ |
| Hyperfocus | "🔥 2h 47m. Water or food?" | Keep going · 3-min reset · Done |
| Night | "Wind down? 60 seconds to set up tomorrow." | Start · Later |
| Digest (midday) | "3 small things: bin day, reply to Priya, book haircut." | Open |
| Meds | "💊 Morning meds" | Taken ✓ · Snooze 15 |

---

## 15. Example AI conversations

**A. Brain dump (voice)**
> **User:** "okay so I need groceries, call mom, finish the presentation, toothpaste, pay the credit card, email my manager about Friday, and ask Rahul about the car"
> **Waypoint:** "Got 7 things.
> 📅 **Today:** Email manager about Friday · Pay credit card (due Thu. Want it today?)
> 🛒 **Shopping list:** groceries, toothpaste. I'll remind you when you're near a store.
> 📞 **Call mom:** when? *Tonight · Weekend · When I'm free*
> ⟲ **Presentation:** added to Resume.
> ⏳ **Rahul / car:** I'll remind you next time you see Rahul, or on Saturday?"
> *(user taps "Tonight", "Saturday")* → "Done. Your head's lighter."

**B. "I can't deal with this task"**
> **User:** "I can't deal with my taxes"
> **Waypoint:** "Fair. Taxes are awful. How does it feel right now?" `[Heavy] [Can't even]`
> *(Can't even)*
> **Waypoint:** "Tiny version: just find where your tax stuff lives. Drawer? Email? Don't open anything. 2 minutes." `[Start 2 min]`
> *(timer ends)* "Found it? That was the hardest part. `[Stop here ✓] [Next tiny step →]`"

**C. "What am I supposed to be doing?"**
> **Waypoint:** "You have 18 min before getting ready for the dentist. Nothing's on fire. Pay the electricity bill (3 min), then you're free. `[Start] [Something else]`"

**D. "Where was I yesterday?"**
> **Waypoint:** "Yesterday 4:10 pm: Presentation, slide 7. Next was *find Company X's 2025 revenue*. You also left 'fix chart colours' as a note. `[Continue, 10 min]`"

**E. Overwhelm**
> **User:** "everything is too much"
> **Waypoint:** "Okay. Let's pause. I've quieted everything that isn't urgent for an hour.
> Want 30 seconds of breathing, or skip?" `[Breathe] [Skip]`
> "What's the one thing that matters in the next hour? `[Pickup at 5] [Reply to boss] [Nothing, I need a break] [Something else]`"
> *(If distress language suggests risk)*: "It sounds really heavy right now. I'm a planning app, not the right help for this. Here's who you can talk to right now: [local helpline]. Would you like to message someone you trust?"

**F. "What do I need before I leave?"**
> **Waypoint:** "For the office: laptop, charger, badge, and the documents you mentioned last night. Leave in 12 min."

---

## 16. User journeys

Each: **Before app → Trigger → App response → Interaction → Outcome → Next.**

**1. Oversleeping**
- *Before:* 6 alarms, snoozes until 8:20, rushes, misses the 9:00 standup.
- *Trigger:* 7:00 melodic alarm (the night handoff set the first thing: "standup 9:00, leave 8:25").
- *Response:* The snooze plan appears: "Snooze 9 min (1 of 2)". After the second snooze: "Standup 9:00. Leave by 8:25. Morning routine starts now." Screen: *Sit up*, then a 30-second countdown.
- *Interaction:* 2 taps. The routine re-flows: "You're 6 min behind. Skip breakfast here and grab the banana? `[Yes]`"
- *Outcome:* Leaves at 8:29. The Late mode drafts "5 min late" and the user sends it.
- *Next:* The pattern model records "weekday mornings run ~6 min long". After 3 observations: "Start the routine 10 min earlier on weekdays? `[Yes] [No]`"

**2. Running late (appointment)**
- *Before:* Checks Maps at 5:40 for a 6:00 dentist; 25 min drive; late again.
- *Trigger:* A calendar event with a location. The Leave engine computes prep at 4:58 (with a learned +10 min correction).
- *Response:* 🟡 at 4:58 "Start getting ready." Live Activity ring. Checklist: phone, keys, wallet, insurance card (captured last week).
- *Interaction:* Checks items, taps "I'm leaving" at 5:31.
- *Outcome:* Arrives 5:56.
- *Next:* The actual leave time is logged, and the correction is kept.

**3. Forgotten bill**
- *Before:* The bill email sits unread; £10 late fee.
- *Trigger:* Captured by voice from the paper bill ("pay electricity by the 14th"), or later from an email share.
- *Response:* Morning brief on the 13th: "Electricity due tomorrow · 3 min". The user ignores it. At 7:40 pm (a transition point after arriving home): "Paying today avoids the late fee. Link's ready."
- *Interaction:* Taps Pay now, which opens the saved biller link, and a 3-min timer starts.
- *Outcome:* Paid. "Done. Nice."
- *Next:* After the second month the app suggests: "Make this monthly? `[Yes]`"

**4. Huge work assignment**
- *Before:* "Write Q3 report" sits on the list for 2 weeks; panic the night before.
- *Trigger:* Captured with a deadline 10 days out. The capacity check sees 0 free blocks planned.
- *Response:* Day 1: "Q3 report due in 10 days. Want a 10-min first bite today?" First step: "Open last quarter's report and copy its headings into a new doc."
- *Interaction:* Start 10 → Stop here ✓ (auto-park: "Next: fill in revenue section").
- *Outcome:* Four more short sessions surface via What now? across the week, each one resumed from a card.
- *Next:* Finish-line detection: "One step from done: send it to Maria (1 min)."

**5. Procrastination (aversive email)**
- *Before:* The landlord email goes unanswered for 3 weeks; anxiety grows.
- *Trigger:* Postponed 3×.
- *Response:* "This one keeps sliding. Want a draft? You'd only need to edit and send."
- *Interaction:* Accepts the draft, edits 1 line, sends from the mail app.
- *Outcome:* Done in 4 min. "Hardest one of the week, done."
- *Next:* Offers an if-then plan: "When a scary email arrives, then I'll ask Waypoint for a draft right away? `[Set it]`"

**6. Interrupted project**
- *Before:* A call interrupts the presentation work; the user never gets back into it that day.
- *Trigger:* A focus session is running and a phone call comes in. Afterwards: "Park your place?"
- *Response:* Voice: "I was on slide 7, next is finding Company X revenue." The app attaches a screenshot.
- *Interaction:* 5 seconds.
- *Outcome:* The Resume card is on NOW. The user taps Continue, which opens the deck and starts a 10-min timer.
- *Next:* In the morning brief: "Continue: Presentation, slide 7."

**7. Hyperfocus**
- *Before:* Coding till 3pm, skips lunch, misses the 3:30 school pickup call.
- *Trigger:* Anchors: 3:30 pickup (calendar), lunch (the user accepted the suggestion last week).
- *Response:* 12:45: "Lunch anchor. Park & eat? `[Park & eat] [15 more]`". 3:15: "Pickup in 15. Park now." (the one allowed interruption)
- *Outcome:* Lunch eaten at 1:05; leaves for the pickup on time.
- *Next:* No lecture about hours worked.

**8. Overwhelming to-do list**
- *Before:* Opens the app to 63 overdue items and closes it.
- *Trigger:* Returns after 9 days away.
- *Response:* "Welcome back 👋 I tucked older stuff away. 2 things actually matter: rent (due Fri), mum's birthday (Sun)."
- *Interaction:* Taps rent → Start 3 min.
- *Outcome:* Re-engaged in 30 seconds without facing a guilt pile.
- *Next:* Sunday sweep: "5 old items. Keep/archive?" (swipe cards).

**9. Waiting on something important**
- *Before:* Checks the job-portal email 20×/day, or forgets to follow up for a month.
- *Trigger:* Capture: "waiting to hear back from Acme about the interview, they said end of next week".
- *Response:* Waiting item with expected-by next Friday. No badge.
- *Interaction:* None until Friday 4pm: "Acme said end of week. Want a polite follow-up drafted for Monday?"
- *Outcome:* Follow-up sent Monday. Less checking. **[H]**: the reduced checking needs measuring.
- *Next:* A reply arrives; the user says "Acme replied" and the item closes.

**10. "I don't know what I should be doing"**
- *Before:* 40 min lost scrolling while deciding.
- *Trigger:* Pull down on NOW / widget "What now?"
- *Response:* Energy chip 🪫. "You have 1h 10m free. Low-energy pick: fold the laundry (10 min) with a podcast. Or rest; nothing's urgent." `[Start 10] [Rest] [Other]`
- *Outcome:* The laundry is done; "Better breaks" offers a 10-min walk with a return ping.

**11. (Bonus) Leaving the house with the right stuff**
- *Trigger:* The night handoff captured "bring passport tomorrow". Leave checklist at 8:15: "Passport ✓? It's in the blue drawer (you told me Tuesday)."

---

## 17. Product experience over time

**Day 1: Install (target: value in under 60 seconds)**
- Open: "Hi. What's on your mind for today or tomorrow? Hold and talk."
- User dumps 5 things. The app shows the parsed items. One ambiguity question.
- "Want me to tell you when to leave for things? I'd need your calendar." (asked in context) → Allow.
- "I can also remind you when you arrive or leave places. That needs location, and it stays on your phone." → optional.
- Suggest adding the **NOW widget** and the **Capture control** with a 3-step visual, once. Skippable.
- Evening: "Want a 60-second wind-down to set up tomorrow?" → the night handoff.

**Day 3: It starts to know the shape of the day**
- Morning brief works; the first Leave countdown ran.
- The first adaptive shift: "You didn't act on the 2pm reminder but did at 7pm. Want evening reminders for home stuff?"
- The first Resume card appears after a timer stop.

**Week 2: Personalisation emerges**
- The prep-time correction is proposed (after 3 observations).
- Postponed-task care: two tasks now get smaller first steps automatically.
- "What now?" suggestions reflect preferred session lengths (e.g. the user tends to pick 10 over 25).
- The first weekly loose-ends sweep.

**Month 1: An external executive-function layer**
- Most reminders are event or leave-anchored; digest batching is tuned; interruptive notifications are ≤4/day.
- "What I've learned" shows ~6 patterns, each with evidence and a toggle.
- The user relies on three reflexes: **hold to capture**, **tap Start**, **tap Continue**.
- A monthly note, strictly factual and optional: "This month: 41 starts, 12 comebacks, on time for 9 of 11 appointments."
