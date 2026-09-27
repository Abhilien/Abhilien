# Part 7: Example screens and build-ready specifications

This part turns Parts 3–5 into material a small team can design and build from. The contents: screen wireframes, the data model, the cue engine, the parser contract, the leave engine maths, an MVP backlog with acceptance criteria, an analytics taxonomy, and a discovery research kit.

---

## 30. Example screens

The NOW home screen is in Part 4 §12. The wireframes below cover the other MVP screens. They use the same rules: **one primary action**, **at most 3 cards**, **state conveyed by icon + words + colour** (never colour alone), and **every automatic action can be undone**.

### 30.1 Capture: confirmation card (after hold-to-talk)

```
┌───────────────────────────────────┐
│ Got 4 things.                  ✕  │
├───────────────────────────────────┤
│ 📄 Take the documents             │
│    when you leave for the office  │
│    tomorrow · fallback 8:30   ⚑   │  ⚑ = needs a glance (date)
│ ───────────────────────────────── │
│ 💳 Pay credit card                │
│    due Thu · ~3 min           ⚑   │  money → highlighted
│ ───────────────────────────────── │
│ 🛒 Toothpaste → Shopping          │  auto-accepted
│ ───────────────────────────────── │
│ ⏳ Ask Rahul about the car        │
│    next time you see Rahul?       │
│    [Next time I see him] [Sat]    │  one ambiguity question, buttons
├───────────────────────────────────┤
│        [ Looks right ✓ ]          │  auto-confirms in 5s
└───────────────────────────────────┘
```
- Tapping any row lets you edit it inline. Swipe left to delete it.
- **Auto-confirm timer:** 5 seconds, paused while the user is touching the card. This is off for users who choose "always ask" in settings.
- **Offline:** "Saved 4 notes. I'll sort them when you're back online." The raw text is kept.

### 30.2 Start flow

```
① Size check                 ② First step                 ③ Timer                     ④ End
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Taxes               │  │ Tiny version:       │  │        ◯            │  │ Nice, you started.  │
│ How does it feel?   │  │                     │  │     ╱  4:12 ╲       │  │                     │
│                     │  │ Find where your     │  │     ╲       ╱       │  │ [ Stop here ✓ ]     │
│ [ 😐 Fine        ]  │  │ tax stuff lives.    │  │        ◯            │  │   saves your place  │
│ [ 😬 Heavy       ]  │  │ Don't open it yet.  │  │ Find where your tax │  │ [ Keep going ]      │
│ [ 🧱 Can't even  ]  │  │                     │  │ stuff lives         │  │ [ Next step → ]     │
│                     │  │ 2 · 5 · 10 · 15 · 25│  │                     │  │                     │
│                     │  │ [  ▶ Start 2 min  ] │  │ [Park] [Done early] │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```
- The pre-selected size chip is **Heavy** if the task has been postponed 2 or more times.
- The timer keeps running on the lock screen (Live Activity / ongoing notification).
- **Stop here** opens the Park sheet (§30.4) with the next step pre-filled if the AI can infer it.

### 30.3 Leave: active state (full-screen takeover and Live Activity)

```
┌───────────────────────────────────┐      Lock screen / Dynamic Island
│ 🟠 LEAVE SOON                     │      ┌─────────────────────────────┐
│                                   │      │ 🟠 Dentist · leave in 8 min │
│          ╭─────────╮              │      │ ▓▓▓▓▓▓▓▓▓▓▓░░░  ☐ keys      │
│         │  8 min   │              │      └─────────────────────────────┘
│          ╰─────────╯              │
│   to leave · arrive 5:55          │
│                                   │
│  ☑ Phone                          │
│  ☐ Keys                           │
│  ☐ Wallet                         │
│  ☐ Insurance card (you added Tue) │
│                                   │
│ I've added your usual 10 min. ⓘ   │  tap ⓘ → why + turn off
│                                   │
│ [   I'm leaving   ]  Running late▸│
└───────────────────────────────────┘
```
- **State sequence:** 🟢 Free → 🟡 Get ready → 🟠 Leave soon → 🔴 Leave now → ⚫ Late. Each state has its own icon *and* label.
- **"Running late ▸"** gives a new ETA and offers a message draft for the organiser. It never sends anything automatically.
- If the user is behind during Get ready: "You're 4 min behind. Skip: ☐ change shoes?"

### 30.4 Park sheet ("Where was I?" save)

```
┌───────────────────────────────────┐
│ Park: Presentation                │
│                                   │
│ What's the very next thing?       │
│ ┌───────────────────────────────┐ │
│ │ 🎙 "find Company X revenue"    │ │  voice-first; keyboard optional
│ └───────────────────────────────┘ │
│ Where were you? (optional)        │
│ [ Slide 7 ]  [📷 Snap screen]     │
│ [🔗 Add link]                     │
│                                   │
│ [   Save my place   ]             │  one primary action
└───────────────────────────────────┘
```
- Only the "next thing" field is needed. Everything else is optional and collapsed on small screens.

### 30.5 Overwhelm mode

```
 Step 1                         Step 2                          Step 3
┌─────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────┐
│                     │   │ What's the ONE thing    │   │ Just this:          │
│  Pause.             │   │ that matters in the     │   │                     │
│  You don't have to  │   │ next hour?              │   │ Reply to boss       │
│  fix everything.    │   │                         │   │ ~5 min              │
│                     │   │ [ Pickup at 5      ]    │   │                     │
│  I've quieted non-  │   │ [ Reply to boss    ]    │   │ [ ▶ Start 5 min ]   │
│  urgent stuff for   │   │ [ Something else 🎙]    │   │                     │
│  1 hour.            │   │ [ Nothing, I need   ]   │   │ Everything else is  │
│                     │   │ [   a break         ]   │   │ parked for today.   │
│ [Breathe 30s] [Skip]│   │                         │   │ [Back to normal]    │
└─────────────────────┘   └─────────────────────────┘   └─────────────────────┘
```
- Background: a single calm colour, no counts, no clock, and no day strip.
- A "Nothing, I need a break" choice leads to a timed break with a gentle check-in and no guilt copy.

### 30.6 Morning brief

```
┌───────────────────────────────────┐
│ Good morning.                     │
│ 3 things today:                   │
│                                   │
│ 1  10:00 Standup                  │
│    leave by 9:20                  │
│ 2  Electricity bill · 3 min       │
│ 3  Continue: Presentation, sl. 7  │
│                                   │
│ Everything else ▾                 │
│                                   │
│ First: get dressed.               │
│ [ Start morning routine ]         │
│            [ Just show me NOW ]   │
└───────────────────────────────────┘
```

### 30.7 Night handoff (voice-first, about 60 seconds, 4 cards)

```
[1/4] Anything on your mind?   🎙 hold to dump        [Skip]
[2/4] You were on "Presentation". Where did you stop?  🎙   [It's parked ✓]
[3/4] Tomorrow's first thing?  ▸ Pay electricity (suggested)  [✓] [Change]
[4/4] Anything to bring tomorrow?  🎙  → added to leave checklist
      ─────────────────────────────
      Got it. Tomorrow-you is sorted. 🌙
      [Phone on charger → start wind-down]
```

### 30.8 "What I've learned" (YOU tab, basic in MVP)

```
┌───────────────────────────────────┐
│ What I've learned                 │
│ Only on this phone. ⓘ             │
├───────────────────────────────────┤
│ ⏱ You usually leave ~10 min after │
│   the plan (7 of 9 times).        │
│   I add 10 min.  [Keep] [Change]  │
│                  [Forget this]    │
├───────────────────────────────────┤
│ 🔔 You act on home reminders more │
│   around 7pm than 2pm (12 vs 3).  │
│   [Keep] [Forget this]            │
├───────────────────────────────────┤
│ [ Pause all learning ]            │
│ [ Delete everything learned ]     │
└───────────────────────────────────┘
```
Every pattern shows its **evidence count**, uses "you usually…" language, and has a **Forget** button. No pattern ever refers to health, mood or diagnosis.

### 30.9 LATER list (search-first)

```
┌───────────────────────────────────┐
│ 🔎 Search or say something…    🎙 │
├───────────────────────────────────┤
│ Soon (6)                        ▾ │
│ Scheduled (4)                   ▸ │
│ Waiting (2)                     ▸ │
│ Parked (1)                      ▸ │
│ Someday (tucked away)           ▸ │
└───────────────────────────────────┘
```
- There is no "Overdue" group. Items past their date stay in **Soon** with a neutral "was Tue" label.
- Counts appear only here, never on the app icon badge (the badge is **off by default**).

### 30.10 Notification-recovery screen

This appears if the OS reports notifications disabled, or the user has dismissed most cues for 3 days:
> "Looks like reminders have been more noise than help. Want me to cut back? `[Only urgent stuff]` `[Digest only, 3×/day]` `[Keep as is]`"

---

## 31. Data model (MVP)

TypeScript-style sketch. It is stored locally (SQLite) and synced as encrypted change logs when sync is on.

```ts
type ID = string; // UUIDv7 (time-sortable)

interface Item {
  id: ID;
  kind: 'task' | 'reminder' | 'waiting' | 'note' | 'shopping';
  title: string;
  why?: string;                    // "because I'm going to the office"
  rawCapture?: ID;                 // link to Capture for audit/undo
  status: 'open' | 'done' | 'dropped' | 'archived';
  bucket: 'soon' | 'scheduled' | 'waiting' | 'parked' | 'someday';
  due?: DateTimeSpec;              // hard deadline (e.g. bill)
  cue?: Trigger[];                 // when to surface it
  importance: 'low' | 'normal' | 'high' | 'critical'; // inferred, user-editable
  importanceSource: 'inferred' | 'user';
  consequence?: string;            // "late fee £10" (factual only)
  estMinutes?: number;
  estSource?: 'user' | 'ai' | 'calibrated';
  people?: string[];
  place?: PlaceRef;
  checklist?: { text: string; done: boolean }[];
  postponeCount: number;
  lastTouchedAt: string;           // drives self-cleaning (M2)
  createdAt: string;
}

type Trigger =
  | { type: 'time'; at: string; tz: string; flexible?: 'morning'|'afternoon'|'evening' }
  | { type: 'place'; placeId: ID; on: 'arrive' | 'leave' }
  | { type: 'event'; event: 'leave_for' | 'morning_brief' | 'night_handoff'
        | 'car_connect' | 'charger_connect' | 'unlock_after_idle'; ref?: ID }
  | { type: 'person'; name: string }            // next calendar event with them
  | { type: 'relative'; to: ID; offsetMin: number }; // e.g. 2 days before trial ends

interface Session {            // a Start-flow or focus session
  id: ID; itemId?: ID; startedAt: string; endedAt?: string;
  plannedMin: number; actualMin?: number;
  size: 'fine' | 'heavy' | 'cant';
  endReason?: 'stop_here' | 'done' | 'kept_going' | 'interrupted' | 'anchor';
}

interface Park {               // "Where was I?"
  id: ID; itemId: ID; createdAt: string;
  nextAction: string; whereText?: string;
  links?: string[]; attachments?: ID[];
  resumedAt?: string; expiresPromptAt: string; // +7 days "still want this?"
}

interface Anchor {             // things hyperfocus must not eat
  id: ID; kind: 'event' | 'meds' | 'meal' | 'bedtime' | 'custom';
  at: string | Trigger; warnMin: number[]; // e.g. [15, 5]
}

interface CueOutcome {         // learning signal; never leaves device
  itemId: ID; cueStep: 1|2|3|4; firedAt: string;
  context: { hour: number; dow: number; triggerType: Trigger['type']; kind: Item['kind'] };
  result: 'acted' | 'smaller' | 'later' | 'done' | 'dropped' | 'ignored';
  latencySec?: number;
}

interface Pattern {            // "What I've learned"
  id: ID; key: string;         // e.g. 'lateness.event.medical'
  value: number; unit: 'min' | 'ratio' | 'hour';
  evidenceN: number; active: boolean; userOverride?: number;
  updatedAt: string;
}

interface LeaveObservation {
  eventId: ID; eventType: string;
  plannedLeave: string; actualLeave?: string;  // from geofence exit
  plannedArrive: string; actualArrive?: string;
}
```

**Deliberately absent:** mood, energy history (the energy chip is used for one recommendation and then discarded), health inferences, and raw location traces.

---

## 32. Cue engine specification

The cue engine is deterministic, runs on the device, and has no LLM in the loop.

### 32.1 Responsibilities
1. Turn triggers into OS primitives: local notifications, geofences, AlarmKit / `setAlarmClock`, Live Activities, and Bluetooth/charger listeners where the OS allows them.
2. Run the **reminder ladder** state machine per item.
3. Enforce the **interruption budget**, **safe contexts** and **digest batching**.
4. Record every `CueOutcome`.

### 32.2 Ladder state machine

```
            trigger fires
 [IDLE] ───────────────────► [CUE 1] ──acted/done/dropped──► [RESOLVED]
                               │  ignored / later(no time)
                               ▼
               wait until nextGoodMoment() AND importance ≥ normal
                               │
                             [CUE 2: reframe] ──resolved──► [RESOLVED]
                               │ ignored ×1 or deadline − 24h
                               ▼
                             [CUE 3: rescue] ──resolved──► [RESOLVED]
                               │ ignored AND (critical OR deadline − leadTime)
                               ▼
                             [CUE 4: critical]  (only if importance=critical
                               │                 or user-approved escalation)
                               ▼
                       [DIGEST-ONLY until tomorrow's brief]
"later(time)" at any step → reschedule → [IDLE] with postponeCount++
"smaller" at any step → Start flow (Heavy) → [RESOLVED] if session started
```

**Rules**
- At most **3 interruptive touches per item per day** (critical items excepted).
- `postponeCount ≥ 3` → the next cue uses **rescue copy** and suggests *Smaller* first. It never raises urgency on the strength of the postponements alone.
- A resolved item is never re-cued. A dropped item is kept for 30 days so it can be restored, then purged.

### 32.3 nextGoodMoment()

```text
candidates = next 12h in 5-min slots
exclude: calendar busy, OS Driving/Sleep focus, user quiet hours,
         active focus session (unless item is an anchor)
score(slot) =
    + 3 if slot is a transition (calendar block end, arrive home, unlock after ≥20 min idle)
    + learned_response_rate(hour, kind)          // Bayesian mean, prior 0.3, evidenceN-weighted
    − 2 if an interruptive cue already fired in last 30 min
    − proximity penalty if too close to deadline to act (est + buffer)
return argmax; if none before deadline − est − buffer → escalate to next ladder step now
```

**Platform note:** "arrive home" and "unlock after idle" events are best effort. When one isn't available on a device, fall back to the best-scoring time slot.

### 32.4 Interruption budget

```text
budget/day = user setting (default 6), critical & alarms excluded
on cue request:
  if tier == critical → deliver
  elif used < budget and not in quiet context → deliver, used++
  else → append to next digest (midday or evening), mark 'deferred'
digests: morning brief (on alarm dismiss / first unlock after 05:00),
         midday (12:30 default, removable), evening (night handoff)
```

### 32.5 Safe contexts
- **Driving focus:** hold everything except alarms. Leave-now cues are delivered as a *spoken* line only if the user enabled it; otherwise they are held.
- **Calendar busy:** hold non-critical cues until the block ends.
- **Quiet hours:** digest only.
- **Overwhelm mode:** everything except critical is paused for the user's chosen duration (default 60 min).

### 32.6 Reliability requirements
- Every scheduled cue is persisted, then scheduled with the OS. On app launch and on every OS wake-up, the engine **reconciles** what is actually scheduled against what should be.
- Target: **≥99.9% of time-based cues delivered within 60 seconds** of the scheduled time on supported devices. This is measured with privacy-safe counters.
- Android: request exact-alarm permission only for alarms and critical cues. Show an OEM-specific battery-optimisation guide when missed deliveries are detected.

---

## 33. Parser contract

### 33.1 Pipeline
1. Speech-to-text runs on the device, and the raw text is saved as a `Capture` straight away.
2. The **local rule parser** handles common forms: dates and times, "remind me to…", "when I get home", lists split on commas and "and". If its confidence is at least 0.8, its result is accepted.
3. Otherwise, the text goes through the **AI gateway** to an LLM, with structured output validated against the schema below.
4. The confirmation rules (Part 3 §8.1) are applied, and the result is shown on the card (§30.1).

### 33.2 Output schema

```json
{
  "items": [{
    "title": "string (imperative, ≤60 chars)",
    "kind": "task|reminder|waiting|note|shopping",
    "why": "string|null",
    "due": {"date": "YYYY-MM-DD|null", "time": "HH:MM|null", "daypart": "morning|afternoon|evening|null"},
    "trigger": {"type": "time|place|event|person|none", "value": "string|null"},
    "people": ["string"],
    "money": true,
    "est_minutes": 3,
    "importance_hint": "low|normal|high|critical",
    "ambiguities": [{"field": "due.time", "question": "string", "options": ["string", "string"]}],
    "confidence": 0.0
  }]
}
```

### 33.3 Prompt rules (summary)
- Extract only what the user said. **Never invent dates.** If no time was stated, `due` is null.
- Relative dates resolve against the user's local date and timezone, which are passed in.
- "Morning", "after work" and similar are returned as a `daypart` with an ambiguity question, unless the user has a stored preference.
- At most **one ambiguity question per item**, always with 2–3 options.
- Titles are neutral and imperative. Guilt words are not allowed.
- **Never infer health conditions, mood or diagnosis.** Medication is recorded only if the user explicitly says it, and only as a reminder.

### 33.4 Golden test cases (the parser must pass these before any model or prompt change ships)

| Input | Expected |
|---|---|
| "remind me to call mom tomorrow" | reminder, due=tomorrow, time null → ambiguity {morning/afternoon/evening} |
| "pay electricity by the 14th" | task, due=14th (next occurrence), money=true, importance≥high |
| "tomorrow morning remind me to take the documents because I'm going to the office" | reminder, trigger=event leave_for office (fallback daypart morning), why set |
| "when I get home take the chicken out" | reminder, trigger=place arrive home |
| "waiting for refund from Amazon" | waiting, expected-by default +7d |
| "ask Rahul about the car" | task, trigger=person Rahul, people=[Rahul] |
| "next Friday" said on a Thursday | ambiguity: "Tomorrow (Fri 3rd) or Fri 10th?" |
| "milk eggs bread" | 3 × shopping |
| "I'm so behind on everything" | no items; route to Overwhelm suggestion |
| "take meds at 8" | reminder, time 08:00, **meds template offered**, no dosing text |
| "cancel Netflix trial before it charges on the 20th" | reminder due 18th (2 days before), money=true |
| Hindi-English mix: "kal subah bank jaana hai" | reminder, due=tomorrow, daypart morning (V1 localisation) |

Metrics: parse correction rate below 5% and date error rate below 1% on the golden set plus beta samples.

---

## 34. Leave engine: maths and calibration

```text
leave_time   = event_start − travel_eta(mode, live) − arrival_buffer − late_correction(type)
prep_start   = leave_time − prep_minutes(type)
```

- `arrival_buffer`: default 5 min (user-editable).
- `travel_eta`: from the maps API, cached. It is refreshed at prep_start − 10 min and at leave_time − 15 min. If the ETA gets worse by more than 5 min, the state shifts early with the message "Traffic got worse; leave 6 min earlier."
- `prep_minutes(type)`: default 20 (work), 30 (appointment), 45 (social evening). It is learned from `LeaveObservation` as the time from the Get-ready cue to the actual leave.
- `late_correction(type)`:

```text
obs = last 10 observations of (actualLeave − plannedLeave) for this type (fallback: all types)
if count(obs) < 3: correction = 0
else:
  m = median(obs) clamped to [0, 30] min
  shrunk = (n / (n + 3)) × m          // shrink toward 0 with little data
  correction = round_to_5(shrunk)
  if correction changed by ≥5 min → propose to user (never silent)
```

- Only *positive* lateness is corrected. The app never makes the user leave later than the planned time.
- **Privacy:** only geofence *exit timestamps* for the home, work or current place are stored. Nothing is recorded en route.

---

## 35. MVP backlog (epics, stories, acceptance criteria)

**E1: Capture**
- *As a user, I hold one button and speak, and the item is saved even offline.*
  AC: time from the gesture to "saved" haptic is at most 1.5 s. Captures survive app kill and airplane mode. Available from the widget, lock-screen control, Action Button / QS tile, share sheet and Siri/Assistant.
- *As a user, I see what the app understood and fix it with one tap.*
  AC: the confirmation card rules are met (§30.1). Items with dates, money or people are highlighted. Undo works for 6 s on every auto-action.

**E2: Cue engine & reminders**
- *Reminders fire at the right moment and offer Do / Smaller / Later / Done.*
  AC: §32 reliability target met. Every notification has actions. Smart Later offers at least 2 event-anchored options when available.
- *Ignored reminders change approach instead of repeating.*
  AC: the ladder and per-day caps are enforced (§32.2), and the budget and digest behave per §32.4.
- *Place and event triggers.*
  AC: arrive/leave for up to 10 user places. A car Bluetooth trigger works on Android and iOS (via Shortcuts automation where needed, documented).

**E3: Leave engine**
- *Calendar events with locations get a countdown and checklist automatically.*
  AC: the state sequence works, the Live Activity/ongoing notification updates at least every minute, and the "Running late" draft appears.
- *Calibration proposes a correction after 3 observations.*
  AC: the proposal copy uses "I've noticed…" and shows the evidence count. Declining sets the correction to 0 and it is not proposed again for 30 days.

**E4: Start flow**
- *Size check, one first step, and a timer within 2 taps of any item.*
  AC: the timer starts within 300 ms of the tap, and the offline micro-step library covers at least 30 common tasks. "Stop here" celebrates and opens the Park sheet.

**E5: Park/Resume**
- *Save my place in under 10 seconds; resume in 1 tap.*
  AC: a voice next-action is captured. Continue opens the link or file and starts a timer. The resume card appears on NOW and in the morning brief. A 7-day "still want this?" prompt appears.

**E6: NOW screen & What now?**
- AC: at most 3 cards are visible; hierarchy per Part 4 §12.2. The recommendation always shows a reason; swipe gives an alternative; "Rest" is a valid output.

**E7: Recover**
- *Overwhelm mode* (§30.5): AC: pauses non-critical cues and has a manual exit only. Crisis-language detection shows the reviewed resource card.
- *Reset my day*: AC: offered after 2 pm when nothing has started (at most once a day); generates at most 3 items that fit the remaining time.
- *Fresh start*: AC: undated items untouched for 14 days move to Someday. The return after at least 5 days away shows no counts.

**E8: Morning & night**
- AC: the brief shows at most 3 items plus a first action, and no non-critical notification fires before the brief. The night handoff can be completed by voice in under 90 s and is skippable at every card.

**E9: Meds template**
- AC: a "Taken ✓" action records the time, and a lock-screen widget shows the last taken time. The app shows no dosing text anywhere.

**E10: Widgets & controls**
- AC: NOW (medium), Capture (small / lock-screen control), Resume (small), Leave (Live Activity). All pass VoiceOver/TalkBack.

**E11: Privacy & trust**
- AC: permissions are asked in context only. "What I've learned" includes Forget and Pause. Export (JSON + CSV) and full delete are available. No third-party ad or analytics SDKs, and analytics is opt-in.

**E12: Accessibility baseline**
- AC: WCAG 2.2 AA contrast, Dynamic Type to AX5 without clipping the primary action, Reduced Motion honoured, every gesture has a button alternative, and sound cues have haptic and visual equivalents.

**Definition of done (all epics):** copy passes the tone linter, the feature works offline or degrades gracefully, it has been tested by at least 3 ADHD participants, and a privacy review has been completed.

---

## 36. Analytics taxonomy (privacy-preserving, opt-in)

These are event names and counts only. **No item text, titles, locations or people are ever sent.**

| Event | Properties (coarse) |
|---|---|
| `capture_saved` | source (widget/lock/app/share/voice-assistant), items_count, parse_path (local/llm/offline) |
| `capture_corrected` | field (date/time/kind/title), step (card/later) |
| `cue_fired` | step (1–4), trigger_type, tier, deferred (bool) |
| `cue_result` | result (acted/smaller/later/done/dropped/ignored), latency_bucket |
| `start_session` | size, planned_min, entry (notification/NOW/widget/item) |
| `session_end` | reason, actual_min_bucket |
| `park_saved` / `park_resumed` | age_bucket |
| `leave_state` | state, on_time (bool, if opted in) |
| `overwhelm_entered` / `reset_day_used` | — |
| `fresh_start_shown` | days_away_bucket |
| `notif_settings_changed` | direction (more/less) |

The **north-star metric** is *weekly "resolved moments"*: cues resolved by a decision, plus starts, plus resumes, plus on-time leaves, per active user. Time in app is **not** a success metric.

---

## 37. Discovery research kit (Phase 0)

### 37.1 Recruit
- 20 adults aged 18–55 who have been diagnosed with ADHD or strongly self-identify with it. Mix genders, and include at least 5 parents, at least 5 students and at least 5 full-time workers. Include at least 5 people in India if India is a candidate launch market.
- **Screener:** smartphone OS; current tools used or abandoned (list them); how often they are late (never … most days); medication yes/no (optional, not required); accessibility needs.
- Compensate fairly, and offer flexible, rescheduling-friendly slots with reminders. That is a small test of the product thesis in itself.

### 37.2 Interview guide (45 min)
1. "Walk me through yesterday from waking up." Probe for the moments things slipped.
2. "Tell me about the last time you were late. What happened in the 60 minutes before?"
3. "The last thing you forgot that cost you something: how did you find out?"
4. "Show me your phone's home screen and your reminder app. What's in there that you ignore?"
5. "Last time you got interrupted in the middle of something: how did you get back into it, or didn't you?"
6. "What app did you try and stop using? What was the moment you stopped?"
7. "If something could tap you on the shoulder at exactly the right moment, when would you want that?"
8. Concept reactions (show the prototype): NOW screen, Leave countdown, Start flow, Park/Resume. Ask "What would annoy you?" before "What do you like?"

### 37.3 Diary study (10 days, via WhatsApp/SMS for low friction)
- Three 10-second prompts per day: "Anything slip today?", "Were you late or rushed for anything?", "Did you get stuck starting something?" Voice notes are welcome.
- The output is a frequency count per problem (P1–P22 from Part 1 §3) to re-weight the scoring table (Part 5 §18).

### 37.4 Prototype tests (clickable)
Tasks:
- (a) Capture "pay rent Friday and call the dentist".
- (b) You have a 6 pm appointment. What time do you need to start getting ready?
- (c) Start the task you've been avoiding.
- (d) You got interrupted; save your place.
- (e) You feel overwhelmed.

Measure time on task, errors, perceived effort (a single 1–7 rating), and **tone reactions** ("Did anything feel judgy or childish?").

### 37.5 Go / no-go criteria for building the MVP as specified
- At least 60% rate the Leave countdown as "very useful" and at least 50% rate Park/Resume as "very useful". If they don't, revisit the flagship choice.
- At least 80% complete capture in under 10 seconds without help.
- Zero participants describe the tone as judgmental. Anything flagged is rewritten.
- If "what now?" or overwhelm ranks higher than leave-time in the diary data, promote it to the flagship slot. The architecture supports either.
