# Part 3: Product thesis, principles, feature set, features we missed, specifications

## 7. Product thesis and core principles

### 7.1 Thesis

> **Waypoint remembers what you meant to do, tells you when it's *actually* time, gets you started, and remembers where you stopped. You don't have to manage it.**

Operating loop: **Catch, then Cue, then Start, then Resume**, with **Recover** as a safety net and a **personal timing model** underneath.

```
   CATCH ──────► CUE ──────► START ──────► RESUME
 (voice/text,   (event, place,  (one step,    (snapshot of
  no filing)     leave-time,     just-start    where you
                 adaptive)       timer, body   stopped)
                                 double)
      ▲                                           │
      └──────────── RECOVER (overwhelm, reset, ◄──┘
                    fresh start, night handoff)
            ── personal timing model (on-device) ──
```

### 7.2 Principles (each one is a design constraint)

| # | Principle | Test we apply to every feature |
|---|---|---|
| 1 | **Point of performance** [1][58] | Does this help appear *where and when* the behaviour happens (lock screen, widget, alarm, notification action)? |
| 2 | **Cognitive cost budget** | Tap > voice > type > configure. Does it work with **zero configuration** and sensible defaults? Can it be turned on in-context later ("Want me to do this every time?")? |
| 3 | **One next thing** | Does the screen show a single primary action? Everything else is behind "more". |
| 4 | **Cue by event, not only by clock** [8] | Can this reminder be tied to something that happens? |
| 5 | **Every nudge ends in a decision** | Each notification offers *Do / Smaller / Later (smart) / Drop*, never only "OK". |
| 6 | **No shame, ever** [13][15] | No red overdue counts, no streak loss, no "you failed". Unfinished work is treated as information. |
| 7 | **Self-cleaning** | Does the user ever need to tidy the app? If yes, redesign. Old items decay automatically. |
| 8 | **Suggest, then confirm** | AI proposes; the user confirms when the stakes are high or the input is ambiguous. Low-stakes actions happen automatically and can be undone. |
| 9 | **Interrupt rarely** [27][28] | Is this worth an interruption *now*, or can it go in the next digest? |
| 10 | **Works when ignored** | If the user vanishes for 10 days, does the app welcome them back gracefully? |
| 11 | **Private by default** | Can this run on the device? Is it needed at all? |
| 12 | **Adult, warm, lightly playful** | Would a busy 34-year-old feel respected by this copy? |

---

## 8. The feature set: every original idea, challenged

For each feature: **Verdict**, **why** (with evidence tags), the **spec**, and the **cognitive cost**.
Verdicts: ✅ core / 🟡 keep but reshape / 🔻 defer / ❌ drop or don't build as proposed.

### 8.1 Capture: "Get it out" + "Don't let me forget" + voice (brief §12, §13, §30). ✅ Core

**Why.** Unfinished goals intrude on thought until they are completed *or planned* [22]. Working-memory limits make "I'll remember" unreliable [2]. Voice cuts the typing cost. **[Q]** Users already keep voice memos but never act on them. **[R]** Voice matters only if it is **transcribed and turned into actions**.

**Challenge to the brief.** Auto-sorting into TODAY/TOMORROW/WAITING/LATER sounds good but carries a real risk. **Wrong auto-scheduling is worse than no scheduling**: one missed bill because the AI filed it under "Later" destroys trust. There is also no evidence that forced triage helps. **[R]** Only put a date on an item when the user *said* a time or a deadline was detected. Everything else goes to **"Soon"** (an unordered, self-decaying pool) with an optional suggested slot. Fewer buckets means less to scan.

**Spec.**
- Entry points: a big 🎙 button on the home screen, a widget, a lock-screen control (iOS Control Center / Lock Screen controls; Android Quick Settings tile), share sheet, the Action Button (iPhone) or a double-press, Siri/Assistant shortcuts, and a watch complication.
- **Hold to talk, release to save.** The item is saved *before* parsing (offline-safe). Parsing happens after.
- Parser output per item: `{title, type: task|reminder|waiting|event|note|idea, when?, deadline?, trigger?: time|place|event|leave, context/why?, people[], est_minutes?, confidence}`.
- **Confirmation rule:** show a compact "Here's what I got" card. Items with a **date, money, a person, or low confidence** are highlighted for a glance. Anything else is auto-accepted after 5 seconds, with one tap to undo.
- **Ambiguity questions (max 1 per item):** "Tomorrow *morning* = before you leave (8:40)? or 9:00?". Choices are buttons, not free-text.
- Example: *"Tomorrow morning remind me to take the documents because I'm going to the office."* The app parses it as a reminder with trigger **"leave-for-office tomorrow"** (event), fallback time 8:30, a *why* ("going to office"), and an item ("documents"). It is shown as: *"📄 Take the documents, when you leave for the office tomorrow."* Buttons: **Right / Change**.
- Multi-item dumps are split automatically. People mentioned ("ask Rahul about car") become **Waiting/People** items that surface the next time that person appears (a calendar event with Rahul, or a message thread if integrated later).

**Cost:** 1 hold + speech. There is nothing to file.

### 8.2 Smart reminders with adaptive escalation (brief §5). ✅ Core, reshaped

**Why.** Time-based remembering is weak [8], so reminders are the core prosthetic. But notifications themselves raise inattention [27], and repeating the same nag teaches people to ignore it **[Q]**. People can only respond to a notification at certain moments, depending on context [F13]. Escalation should change *strategy*, as the brief suggests, and it should also change *timing* and *channel*.

**Challenge.** A six-step ladder per task means six interruptions per task. Multiply that by 15 tasks and it becomes spam. **[R]** Limit it to **three active touches per item per day**, with the rest held for the digest. Escalate *only* when a **consequence** or **deadline** exists. And *every* touch must offer a way out.

**Spec: the Reminder Ladder.** It is per item and adapts to importance.

| Step | When | Message pattern | Actions |
|---|---|---|---|
| 1. Cue | At the trigger (event, place, time) | "💡 Electricity bill: due tomorrow. ~3 min." | **Do it now** (opens the pay link or starts a 3-min timer) · **Later** (smart options) · **Done** |
| 2. Reframe | Next good moment (see below), if the item is important | "Paying now means no late fee. Want the link?" (**consequence, stated plainly**) | Do · **Make it smaller** · Later |
| 3. Rescue | Near the deadline, or after 2 ignores | "This one keeps slipping. Pick one: 2-min start now, move to tonight 8pm, or ask someone?" | 2-min start · Pick time · Drop · Delegate |
| 4. Critical (only if marked or inferred critical: money, legal, health, travel) | Deadline − lead time | A time-sensitive or critical-style alert (with user permission) | Same, plus "I'll do it at…" (a commitment) |

- **"Later" is smart, never just "+10 min".** It offers: *after this meeting*, *when I get home*, *tonight 8pm*, *tomorrow morning brief*. These are event-anchored options first.
- **"Next good moment"** means: not during calendar events, not while driving (OS driving focus), not in quiet hours. Prefer transition points (end of a calendar block, arriving home, unlocking the phone after a long idle period). **[H]** Messages at transition points get more action.
- **Consequence framing** is factual, never catastrophic ("late fee £10", not "You'll get in trouble!").
- **Learning:** track acted, snoozed, and ignored by hour, type and trigger. After about 2 weeks, shift default cue times toward the windows where the user tends to act (§8.17).

**Cost:** 1 tap per touch. Nothing to configure. Importance is inferred (money, deadline, person) and can be corrected with one tap.

### 8.3 Time visibility + "Leaving soon" (brief §10, §11). ✅ Core, the flagship

**Why.** Time estimation and discrimination are impaired [6][7]. People underestimate durations [F1]. **Unpacking the steps reduces underestimation** [F2]. Map apps give travel time but no getting-ready time. **[Q]** "Leave in 23 minutes" framing is exactly what users say works (visual timers, Tiimo).

**Challenge.** A per-minute prep plan (5:15 dressed, 5:25 wallet…) is fragile. Once the user is 4 minutes behind, every later time is wrong and the plan becomes a source of stress. **[R]** Use a **single countdown to "leave" plus an ordered checklist with elastic timing**. If the user is behind, the plan re-flows and offers what to cut ("Skip changing shoes? You're 4 min behind.").

**Spec.**
- The **Leave engine** runs for any calendar event with a location, or any "I need to leave at…" statement.
  - `leave_time = event_start − travel(live traffic, mode) − arrival_buffer(default 5 min) − personal_late_correction`
  - `prep_start = leave_time − prep_duration(user's learned or default, by event type)`
- **States** (a colour *plus* a shape *plus* text, so it is never colour alone):
  - 🟢 **Free**: "Dentist in 2h 10m. You're free until 4:50."
  - 🟡 **Get ready**: "Start getting ready: leave in 30 min." The checklist appears.
  - 🟠 **Leave soon**: "Leave in 8 min: shoes, keys, phone."
  - 🔴 **Leave now**: "Leave now to arrive 5:55."
  - ⚫ **Late mode**: "You'll arrive ~6:07. Send 'running 7 min late' to the clinic?" (drafts a message, never sends automatically)
- **Surfaces:** a Live Activity / Dynamic Island (iOS) or an ongoing notification (Android) during prep, a home-screen countdown widget, and a watch.
- **Visualisation:** a shrinking **time ring** (like the Time Timer) around the countdown, plus a thin day **timeline strip** on the home screen showing *now* and the next anchors. Research on which representation is best is thin **[I]**. We'll A/B test ring vs bar vs text.
- **Leave checklist** (M4): defaults to phone, keys, wallet, plus event-specific items captured earlier ("documents").
- **Calibration:** after each event, the app infers the actual leave time (geofence exit) and arrival. It keeps a per-user median offset by event type. Correction is applied **only after 3+ observations** and is **shown**: "I've been adding 10 min because you've usually left later than planned. Keep doing that?"

**Privacy:** calibration uses on-device geofence events. Raw location traces are not stored (§23, Part 5).

**Cost:** zero setup when the calendar is connected. Otherwise it takes one voice statement.

### 8.4 Starting: "Just start" + "I don't feel like it" + task decomposition (brief §7, §8, §22). ✅ Core, merged into one flow

**Why.** Procrastination is short-term mood repair [15]. The fix is to shrink *aversiveness*, not only task size. Behavioural activation uses small, graded, scheduled actions [42]. **Implementation intentions** (if-then plans) have a medium-to-large effect on goal attainment across 94 studies (d ≈ 0.65) [18], and they help inhibition in ADHD [19]. Goblin Tools shows breakdown is valued **[Q]**. Systematic short work blocks with breaks gave better mood and efficiency than self-regulated breaks in students [36].

**Challenge.** Three separate features ("I don't feel like it", "5-minute start", "Decomposition AI") would mean three entry points and three things to learn. **[R]** Merge them into one **Start** flow with progressive depth. Also, "Good. One more?" can become an infinite loop that feels like being manipulated. Offer a clear finish line and let stopping be a success.

**Spec: the Start flow** (from a task, a notification, a widget, or "I can't start X").
1. **Size check (one tap):** "How does it feel?" 😐 *Fine* · 😬 *Heavy* · 🧱 *Can't even*. The default is *Heavy* if the task has been postponed 2+ times.
2. **First step** (AI-generated, **physical and under 2 minutes**, always *one* step):
   - Fine → "Open the tax folder." + **Start 10 min**
   - Heavy → "Just open the tax folder. That's it." + **Start 5 min**
   - Can't even → "Put the laptop on the table. Don't open anything yet." + **Start 2 min**
3. **Timer** starts immediately (the default duration comes from the size check; the chips **2 / 5 / 10 / 15 / 25** are always visible). Suggested durations are **[H]** and learned per user over time.
4. **At the end:** "Nice, you started. **Stop here** ✓ (counts as a win) · **Keep going** (timer continues, count-up) · **Next step →**"
5. **Next step** is generated *only on request*, using what the user says is done ("I found the income statement"). The full plan is behind "see all steps" and collapsed by default. **Key rule: the next action matters more than the whole plan.**
6. **Optional "spiciness"** (a nod to Goblin Tools): the user can set how granular steps are, per user or per task.
7. **Questions:** decomposition asks **at most 2** clarifying questions, as buttons ("Filing yourself or with an accountant?").
8. On stop, the app auto-creates a **"Where was I?" snapshot** (§8.5).

**Micro-step library for common "wall" tasks** (cleaning, email inbox, laundry, taxes, applications). These are pre-written, so they work offline and in the free tier.

**Cost:** 1–2 taps to be working.

### 8.5 "Where was I?" context restoration (brief §9). ✅ Core, the most differentiated feature

**Why.** Resumption after an interruption is faster with **cues to the suspended goal** and when the goal is **encoded before switching** [24]. Attention residue from unfinished work hurts the next task [26], and writing a plan for an unfinished goal reduces its intrusion [22]. **No mainstream consumer tool does this for everyday life** (Part 2).

**Challenge.** Automatic capture of "what you were doing" (screen contents, open files) is technically limited on mobile and **invasive**. **[R]** Use a **one-tap/voice "park it"** at interruption plus **prompted parking** at natural stop points (a timer ending, a leave-countdown starting, the night reset). Desktop companion auto-context (open documents and tabs) is V2, opt-in.

**Spec.**
- **Park** (1 tap, or voice "park this"): asks one thing, *"What's the very next thing you'd do?"* (voice). It optionally adds a photo or screenshot (a whiteboard, the page you were on), a link, and a *why*.
- **Auto-park prompts:** when a Just-start timer ends with *Stop here*, when a Leave countdown starts while a focus session is running, and at night reset.
- **Resume card** (on home, widget, and in the morning brief):
  ```
  ⟲ Presentation (Tue, 42 min in)
  You stopped at: Slide 7, competitor analysis
  Next: Find Company X 2025 revenue
  📎 deck link · 📝 1 note
  [ CONTINUE → 10-min timer ]
  ```
- **Continue** opens the link or file and starts a timer, so the transition into the task is scaffolded too.
- Parked items **age gracefully**. After 7 days: "Still want this one?" **Keep · Archive · Make it smaller**.

**Cost:** 1 tap + 1 sentence to save; 1 tap to resume.

### 8.6 Smart alarm (brief §6). 🟡 Reshape. Mission alarms: 🔻 defer / opt-in only

**Evidence check by mode:**

| Mode | Evidence | Verdict |
|---|---|---|
| **Normal** | n/a | ✅ Needed as a base. iOS 26 **AlarmKit** now lets third-party apps ring through Silent and Focus with system alarm UI [53]. On Android, use `setAlarmClock` (exact-alarm rules apply). |
| **Gradual / melodic wake** | **[E]** Melodic sounds are associated with less self-reported sleep inertia (correlational) [31]. Dawn-simulation studies show modest benefits on sleep-inertia measures in small samples [F14]. | ✅ Default: melodic, rising volume. Light requires hardware (smart bulbs). V2 via HomeKit/Matter. |
| **Snooze** | **[E]** 30 min of snoozing did not harm, and slightly helped, habitual snoozers [30]. | ✅ Keep snooze, but make it **intentional**: "Snooze plan: 2 × 9 min then up." The first snooze counts as part of the plan, not a failure. |
| **Mission (QR in bathroom, photo, puzzle)** | **[Q]** Anecdotally effective for some, harsh for others. **No controlled studies found.** Risks: stress on waking, disturbing partners, being unable to stop an alarm in an emergency, and accessibility (motor or visual impairment). | 🔻 Opt-in V1 feature with a **hard stop** always available (a long-press to fully disable plus a 3-second confirm). Never the default. |
| **Movement** (steps until off) | **[I]** Getting upright helps a person get out of bed, but no evidence was found for the mechanism. Excludes some disabled users. | 🔻 Opt-in, same safeguards. |
| **Accountability** (notify a person if not up) | **[Q]** Some want it. Risks: shame, relationship strain, and privacy leaks about sleep. | 🔻 V2, only as a *user-initiated* "text my buddy if I'm not up by 8" with a preview of the message. Never automatic. |
| **Routine alarm** (wake, then sit up, then bathroom…) | **[E]** Unpacking steps helps estimation [F2]. **[I]** Sequenced cues help the transition. | ✅ But **elastic**: a step-by-step guided routine with a single "leave by" target and re-flow when behind. |

**Bigger lever [I]:** with delayed circadian phase common [32], **evenings** decide mornings. The alarm is paired with the **Night handoff** (§8.7) and an optional wind-down cue.

### 8.7 Morning brief + Night handoff (brief §27, §28). ✅ Core (light versions in MVP)

**Why.** Writing a specific to-do list for tomorrow before bed sped sleep onset [23]. Plan-making closes open loops [22]. The morning brief puts what matters in front of the user at the right time and shows it gradually.

**Night handoff (≈60 seconds, voice-first):** triggered by a chosen bedtime, or by the wind-down cue from M13.
1. "Anything on your mind? Dump it." (voice capture, auto-parsed)
2. "Where did you stop today?" (auto-lists sessions that are not parked)
3. "Tomorrow's first thing?" (the app proposes one; the user taps to accept)
4. "Anything to bring?" (added to tomorrow's leave checklist)
5. Closing message: "Got it. Tomorrow-you is sorted. 🌙" Then optionally a nudge to put the phone away, with the phone charging-dock position suggested once.

**Morning brief:** triggered when the alarm is dismissed, or on first unlock after 5 am.
```
Good morning. 3 things today:
1. 10:00 Standup (leave by 9:20: I've added your usual 10 min)
2. Electricity bill due (3 min)
3. Continue: Presentation, slide 7
First: get dressed. [Start morning routine]
```
- **Progressive disclosure:** at most 3 items. "Everything else" is a single collapsed row.
- **No notifications before the brief** (all non-critical ones are held).

### 8.8 "What now?" + energy (brief §20, §21). ✅ Core (simplified energy)

**Why.** Complexity and uncertainty drive choice overload [F5]. An overwhelmed user benefits from a *single* recommendation. **[Q]** "Just tell me what to do" is a top request.

**Challenge.**
1. A recommender that is wrong 3 times gets abandoned. **[R]** Always show **why** ("due tomorrow, 3 min, you have 18 min") and give one alternative on swipe.
2. **Energy:** the 4-state picker including "🔥 hyperfocused" is flawed. Hyperfocus isn't something one reports mid-flow, and extra choices add cost. There is no evidence for an ADHD-specific "energy cycle". **[R]** Use an optional **3-state** chip (🪫 Low · 🙂 OK · ⚡ Good), asked **only inside "What now?"**. Weight *available time* and *deadlines* more than energy.

**Algorithm (transparent heuristic first, learned later):**
```
candidates = open tasks fitting (time_until_next_anchor − buffer)
score = urgency(deadline proximity, consequence)
      + fit(est_minutes vs available, energy match)
      + momentum(parked/in-progress bonus)
      + avoidance_care(postponed ≥3 → smaller first step, not higher priority)
      − recent_rejection(swiped away today)
return top1 with reason; swipe = top2; "none of these" = Just-start a 2-min tidy or rest
```
- "Rest" is a **valid answer**: "You have 18 min and nothing urgent. Take a break; I'll ping you at 5:10 to get ready."

### 8.9 Overwhelm mode + Reset my day (brief §25, §26). ✅ Core

**Why.** Emotional lability is high in adult ADHD [13]. Overwhelm leads to avoidance [15]. Fresh-start framing helps re-engagement [F12].

**Challenge.** Grounding and breathing scripts border on mental-health intervention. **[R]** Keep them *brief, optional and non-clinical*. Detect crisis language and signpost help (§23, Part 5). Never position this as therapy.

**Overwhelm mode** (a button on the home screen, a lock-screen control, or voice "I'm overwhelmed"):
1. The screen empties. The UI goes to a single colour, and all notifications except critical ones are paused for 60 min (the user can change this).
2. "Pause. You don't have to fix everything." Optional: a 30-second breathing circle or "look at 3 things around you". **Skip** is prominent.
3. "What's the ONE thing that actually matters in the next hour?" The app offers 3 candidates from deadlines, plus "something else" (voice) and "nothing, I need a break".
4. Only that one thing is shown, with the Start flow. Everything else is "parked for today" in one collapsed row.
5. Exit: "Back to normal" whenever the user wants. It never exits automatically.

**Reset my day** (offered automatically after 2 pm if nothing has been started, or on request):
- "It's 4:20. The day isn't over. What would make today feel okay?" Chips: *One important thing* · *Clear small stuff* · *Just rest and reset tomorrow*.
- Generates **≤3 items** that fit the remaining time. Unfinished morning items move automatically to "tomorrow candidates" without a count.

### 8.10 Hyperfocus protection (brief §16). 🟡 Reshape around anchors

**Why.** Hyperfocus is reported and valued. It is not simply a problem [F7][F8]. **[I]** The harm is in *missed anchors* (meals, meds, appointments, sleep, pickups), not in duration.

**Challenge.** The app cannot reliably detect hyperfocus. iOS gives third parties very limited Screen Time data, and Android usage access is a sensitive permission. A "you've been focused 2h 47m" prompt only works if a timer is running. **[R]** Base it on **anchors**: protect *upcoming commitments* whatever the user is doing, and offer a *focus session* that knows about them.

**Spec.**
- **Anchors** (auto-detected: calendar events, meds times, meals if opted in, bedtime). The user can add "don't let me miss…".
- During a focus session: **no interruptions** except anchor warnings, which use a **transition warning**: T−15 "Heads up: pickup in 15. Park your place now?" (one-tap park) and T−5 "Time to switch."
- Long-session check (only if a session is running and there is no anchor for 2h+): "🔥 2h 47m in. Water/food? · Keep going · 3-min reset · I'm done". Shown **at most once per session** by default.
- Learned: "You've kept going past lunch 4 times this week. Want a lunch anchor?" (a suggestion that needs the user's yes).

### 8.11 Transition assistant (brief §17). ✅ V1 (a lightweight built-in version in MVP via Leave and Night)

**Why.** Switching costs [26] and the reward gradient against switching [10]. Unpacking steps [F2]. Physical first steps start movement without needing the mind's agreement **[I]**.

**Spec.** "Switch to ___" (voice/tap) creates a **≤5-step** sequence. The first step is physical, and the last step starts a timer:
- *Game → Work:* Save & quit (2 min warning) → Stand up + water → Open laptop → [auto-opens the parked Resume card] → Start 5 min.
- *Work → Sleep:* Park your place → Tomorrow's first thing → Phone on the charger → Start wind-down.
- Pre-built templates for common switches, plus AI-generated ones for others. The user never *has* to edit them. Editing is available but hidden.
- **Transition warnings** can be scheduled: "10-min warning before I need to stop gaming at 9."

### 8.12 Waiting Room (brief §18). ✅ V1 (capture in MVP)

**Why.** Things you are waiting on are prospective-memory items with no natural cue. **[Q]** Users either forget refunds and replies or check compulsively. Compulsive checking is a known pattern with notifications [27].

**Spec.**
- Created by capture ("waiting for refund from Amazon", "Rahul will send the car docs").
- Each has an **expected-by** date, from the parser or a default of 7 days, and a **follow-up plan**: on the expected date, "Refund from Amazon hasn't been ticked off. Nudge them? [Draft message] · Still waiting (+3 days) · Got it ✓".
- **No live count badge.** Waiting items appear only in the **weekly loose-ends sweep** (M20) or on their follow-up date, to avoid a checking loop.
- V2: opt-in email parsing for delivery and refund confirmation (privacy-heavy, so opt-in only).

### 8.13 Body doubling (brief §15). 🟡 Reshape: AI presence first; human rooms V2; integrate rather than build a marketplace

**Evidence.** Qualitative and survey evidence: 193 neurodivergent respondents used body doubling mainly to initiate, stay motivated and complete tasks. It spans ambient to accountability modes [34]. Social facilitation is established for simple tasks [35]. There are no RCTs. Focusmate proves demand [47].

**Challenge.**
- **Anonymous human rooms** mean trust and safety moderation, no-shows, and cold-start liquidity. This is **expensive** and is a separate business (Focusmate already does it well).
- **An AI companion** is not proven to deliver the *social* effect. **[H]** A mild "someone's here" effect may come from presence cues and check-ins.
- **[R]** MVP/V1 builds **"Stay with me"**: a calm ambient session with a presence avatar, a soft room sound (optional white/pink noise, with its small, youth-only evidence noted [37]), a gentle voice or text check-in *only at the user's chosen interval*, and a spoken "what I'm doing now" that the companion repeats back at the end. V2 adds **small scheduled rooms with friends** (invite-only, no strangers) and possibly a Focusmate integration/deeplink.

### 8.14 Stimulation menu (brief §14). 🔻 V1, user-authored. Not a content library

**Why it's plausible.** The "dopamine menu" is a popular community idea **[Q]**. Reward sensitivity and delay aversion are real [10][11]. Offering a *chosen* alternative to default scrolling is a reasonable if-then substitution [18].

**Challenge.**
1. Building an in-app content feed (facts, puzzles, games) turns us into an **attention product competing with TikTok**. That is a losing and ethically awkward position.
2. "Dopamine" branding invites pseudoscience. **[R]** Call it **"Better breaks"**. The user seeds it by voice ("things I enjoy that don't eat my evening"). The app suggests additions (walk, stretch, a song, a text to a friend) and **time-boxes** each break with a **return ramp** ("Break ends in 2; your Resume card is ready").
3. No evidence was found that a stimulation menu improves outcomes. It is **[H]**, so test it.

### 8.15 Accountability (brief §23). 🟡 Private + AI in MVP; human V2; consequences ❌

- **Private:** a record of what you *started*, not what you failed.
- **AI check-in:** "You said you'd start the application after lunch. Still on?" (only when the user set a commitment).
- **Human (V2):** "Share this commitment with Sam" sends a *single* message the user writes and previews. Sam gets a done/not-done ping only if the user opts in.
- **Self-imposed consequences (e.g. money to charity):** ❌ **Not building.** Loss-framed commitment devices can work for some people, but they risk financial harm and shame for users with high emotional lability [13] and are a poor fit with our no-shame principle.

### 8.16 Rewards (brief §24). 🟡 Informational, no points economy

**Evidence.** Expected tangible rewards can undermine intrinsic motivation [F10]. Gamification effects are modest and fade [F11]. Streaks create loss aversion and shame when broken **[Q]**.

**[R]**
- **Immediate, informational feedback**: a satisfying haptic and a short line on *start*, *return after interruption*, *did it despite low energy*, and *finished an old one*.
- **"Comebacks"** celebrated more than streaks: "Back on the presentation after 4 days. That's the hard part."
- A **weekly "you did more than you think"** recap (a short list of starts and finishes, never a score or comparison).
- **No** points, levels, leaderboards, or loss mechanics. An optional **"quiet mode"** removes all celebration.

### 8.17 Personal pattern model + insights (brief §19, §34). 🟡 Engine yes (quietly, MVP); "insights" UI V2

**Why.** Personal calibration is our moat (§21, Part 5). Personalisation also carries high privacy risk, and inferring health states can bring data into health-data law (GDPR Art. 9; WA My Health My Data Act, which covers *inferences* [56]).

**What we learn (observed behaviour only):** prep time by event type, lateness offset, reminder response by hour/type/trigger, typical actual vs estimated durations, tasks postponed ≥3 times, the time of day with the most starts, and which strategies led to action (the smaller-step prompt vs moving it to later).

**Language rules:** "I've noticed…" + the evidence + a choice. *"I've noticed you usually leave ~10 min after the plan. I've been adding 10 min. Keep it? · Change · Stop learning this."* **Never:** "because of your ADHD", or any mood, health, medication or diagnosis inference.

**Controls:** "What I've learned" page. Each pattern shows its evidence count and has **Forget this** and a **Pause learning** master switch. Stored **on the device**; sync is end-to-end encrypted (§23).

### 8.18 Notification system (brief §29). ✅ Core, the product's nervous system

**Evidence.** Notifications increase inattention [27]. **3×/day batching** improved well-being, while turning everything off increased anxiety [28]. Receptivity depends on context [F13].

**Tiers (user-visible, user-controlled):**

| Tier | Examples | Delivery |
|---|---|---|
| **Critical** | Leave now, medication (if the user marks it critical), bill due today with a fee, alarm | Time-sensitive / critical-style alert (with permission), sound, can break Focus if the user allowed it |
| **Cue** | Event/place-triggered reminders, anchor warnings | Normal, at the trigger |
| **Gentle** | Ladder step 2, Waiting follow-ups, suggestions | Delivered at the "next good moment", or goes to the digest |
| **Digest** | Everything else | **Morning brief + optional midday + evening handoff** (3×/day, matching [28]) |

- **Budget:** default max **6 interruptive notifications/day** (excluding critical and alarms). If the budget is exceeded, items are merged into the next digest.
- **Notification manager AI** proposes tier changes ("You never act on midday digests. Remove it?"). Changes **always** need the user's yes.
- **Every notification carries actions** (Do / Smaller / Later▸ / Done). Nothing is informational-only unless it is a digest.

### 8.19 Widgets & lock screen (brief §31, §32). ✅ Core surfaces

Evidence basis: point of performance [1][58] and "out of sight, out of mind" **[Q]**.

| Widget / control | Content | Priority |
|---|---|---|
| **NOW** (medium) | One next thing + Start button; or the Leave countdown when active; or the Resume card | MVP |
| **Capture** (small / lock-screen control / Action Button / Android QS tile) | Hold-to-speak | MVP |
| **Leave countdown** (Live Activity / ongoing notification) | Ring + "leave in 23m" + checklist | MVP |
| **Resume** (small) | Last parked task + Continue | MVP |
| **Today 3** (medium) | ≤3 items | V1 |
| **Lock-screen controls** | Remind me · Just start 5 · What now? · Overwhelmed | MVP (Remind, Start); V1 (rest) |

"Where was I?" and "What now?" are also exposed as Siri/App Intents and Android shortcuts for voice use.

---

## 9. Features we originally missed

Selection rule: include a feature only if the research points to a real problem (Part 1 §3) and it passes the cognitive-cost test. Difficulty: L/M/H.

**M1. Event & place triggers ("When I…").** ✅ MVP
- *Problem:* Time-based reminders fail. Event-based remembering is much less impaired in ADHD [8].
- *Feature:* "When I get home / leave work / get in the car (Bluetooth) / plug in my laptop / open [app] / arrive at the pharmacy, remind me…". Parsed from speech.
- *Evidence:* [8]; the if-then plan structure [18].
- *Benefit:* reminders fire when they can be acted on.
- *Downside:* location permission; geofence battery and precision; OS limits on the number of geofences (iOS ~20 regions per app).
- *Difficulty:* M.

**M2. Fresh start / self-cleaning lists.** ✅ MVP
- *Problem:* Overdue piles cause shame and app abandonment **[Q]**.
- *Feature:* Undated items fade to "Someday" after 14 days untouched. After ≥5 days away, the app greets with "Welcome back. I tucked older stuff away. Here's what's actually due." No counts.
- *Evidence:* the fresh-start effect [F12]; the shame and avoidance link [15].
- *Benefit:* re-entry instead of churn.
- *Downside:* the user might lose track of an item, so everything stays searchable and there is a one-tap "show everything".
- *Difficulty:* L.

**M3. Medication "taken" log.** ✅ MVP (as a reminder template)
- *Problem:* "Did I take it?" Double dosing and missed doses. About 1/3 of US adults with ADHD take stimulants [4].
- *Feature:* A reminder with a **Taken ✓** action that records the time. The lock-screen widget shows "Taken 8:12 ✓".
- *Evidence:* prospective memory weakness [8].
- *Benefit:* safety and peace of mind.
- *Downside:* this is health data (more privacy obligations). **No dosing advice ever.** It must not drift into a medical-device claim [55].
- *Difficulty:* L.

**M4. Leave checklist + "I put it…" object log.** ✅ MVP (checklist) / V1 (object log)
- *Problem:* Forgotten keys, documents, chargers. Lost objects.
- *Feature:* A default leave checklist plus items captured earlier. Voice "I put the passport in the blue drawer" → searchable "Where's my passport?" Optional NFC sticker at the door starts the checklist.
- *Evidence:* external cues at the point of performance [1].
- *Benefit:* fewer U-turns.
- *Downside:* the object log only works if used. Low cost to try.
- *Difficulty:* L.

**M5. Estimate-vs-actual calibration.** ✅ V1
- *Problem:* Duration misestimation [6][F1].
- *Feature:* When a timer-backed task ends, the app records actual vs estimated time. Future estimates say "You guessed 20, it usually takes you ~35." Optional one-tap guess before starting.
- *Evidence:* [6][F1]. Whether feedback improves estimation is **[H]**.
- *Benefit:* more realistic days.
- *Downside:* it can feel like judgement, so frame it as "your real numbers".
- *Difficulty:* L.

**M6. If-then rescue plans.** ✅ V1
- *Problem:* Known derailers ("open YouTube at 11pm", "freeze when an email looks scary").
- *Feature:* 2–3 personal if-then plans. The app fires them on events it can detect (time, place, a Screen Time threshold where the OS allows, a manual "I'm doing the thing" button).
- *Evidence:* implementation intentions d ≈ 0.65 [18]; ADHD inhibition [19]; mental contrasting with implementation intentions helps children at risk for ADHD [19].
- *Benefit:* the strongest evidence base of any behavioural technique here.
- *Downside:* needs a short setup, so offer it only after the user shows a pattern ("You've postponed email 4× this week. Want an if-then plan for it?").
- *Difficulty:* M.

**M7. Day capacity check.** ✅ V1
- *Problem:* Over-committing because of the planning fallacy [F1].
- *Feature:* "Today has ~3h free and 6h of stuff. Pick what can move?" (a one-screen drag, or "you choose for me").
- *Evidence:* [F1][F2].
- *Benefit:* fewer failed days.
- *Downside:* requires estimates, so use calibrated defaults.
- *Difficulty:* M.

**M8. Reply queue (communication debt).** 🔻 V1
- *Problem:* Avoided replies and emails hurt relationships and work **[Q]**. Emotional aversiveness [15].
- *Feature:* Capture "reply to landlord". The Start flow's first step is an **AI draft** ("Here's a 3-line reply; edit or send from your mail app"). Tone softening, like Goblin Tools' Formalizer.
- *Evidence:* mood repair [15].
- *Benefit:* shrinks the scariest tasks.
- *Downside:* the AI should not send anything; there is a hallucination risk in drafts.
- *Difficulty:* M.

**M9. Admin radar (the "ADHD tax" guard).** 🔻 V1
- *Problem:* Late fees, missed renewals, free-trial charges, missed return windows **[Q]**.
- *Feature:* Capture-aware deadline types with sensible lead times: "free trial ends" → reminder 2 days before; "return by" → 3 days before; document expiry (passport → 6 months before).
- *Evidence:* prospective memory [8].
- *Benefit:* real money saved, which makes a clear value story.
- *Downside:* scope creep into finance. Keep it reminder-only.
- *Difficulty:* L.

**M10. Waiting-mode filler.** ✅ V1
- *Problem:* Being unable to do anything before an appointment **[Q]**.
- *Feature:* "You have 40 min before you need to start getting ready. Here's a 15-min thing, and I'll ping you." Built into What now? plus the Leave engine.
- *Evidence:* time perception [6]. The feature itself is **[H]**.
- *Benefit:* reclaims lost hours and reduces anxiety.
- *Downside:* the user may not want suggestions, so it must be easy to turn off.
- *Difficulty:* L.

**M11. Delegated / household reminders.** 🔻 V2
- *Problem:* Partners and parents become "the reminder", which strains relationships **[Q]**.
- *Feature:* A trusted person can *send* a reminder into the user's Waypoint. It is delivered in Waypoint's calm voice and cued by event, and the user accepts, declines or reschedules it. Shared lists.
- *Evidence:* **[I]** from relationship-strain reports.
- *Benefit:* removes nagging dynamics.
- *Downside:* it could become surveillance. The **user controls** everything, the sender sees only accepted/done if permitted, and it can be revoked instantly.
- *Difficulty:* M.

**M12. Finish-line detection.** 🔻 V1
- *Problem:* Tasks stall at 90% (not sent, not submitted, laundry not folded) **[Q]**.
- *Feature:* When the user parks or stops with "almost done" language, or a task has ≥80% of its steps complete, the next cue is framed as "One step from done: send it (1 min)".
- *Evidence:* delay aversion [10].
- *Benefit:* converts almost-done into done.
- *Downside:* none significant.
- *Difficulty:* L.

**M13. Bedtime drift guard.** 🔻 V1
- *Problem:* Evening drift and circadian delay [32]. "Revenge bedtime procrastination" **[Q]**.
- *Feature:* A wind-down transition at a user-set time: a 10-min warning, "last episode" framing, and the night handoff. Optional "Tomorrow starts at 7:30. Sleeping by 12 gives you 7.5h."
- *Evidence:* [23][32]. The circadian framing is general sleep-hygiene advice, not treatment.
- *Benefit:* better mornings.
- *Downside:* could feel parental, so it is opt-in with a tone choice.
- *Difficulty:* L.

**M14. Phone-call / booking helper.** 🔻 V1 script; Future agent
- *Problem:* Avoided phone calls and bookings (dentist, GP, repairs) **[Q]**.
- *Feature:* V1: a call script plus the "one fact to have ready" and a 2-min Start. Future: an AI agent that books by phone or web **with explicit per-action approval**.
- *Evidence:* aversiveness [15].
- *Benefit:* unblocks a high-avoidance category.
- *Downside:* the future agent carries big trust and legal risk.
- *Difficulty:* L (script) / H (agent).

**M15. Safe-context rules.** ✅ MVP
- *Problem:* Escalations while driving, in meetings or at night are dangerous or rude.
- *Feature:* Respect the OS Driving Focus, calendar busy status and quiet hours. Nothing escalates while driving. Critical alerts are held until parked, unless the user set otherwise.
- *Evidence:* safety.
- *Benefit:* trust.
- *Downside:* some missed timings.
- *Difficulty:* L.

**M16. Clinician/coach summary export.** 🔻 V2
- *Problem:* Users struggle to report their week to a coach or clinician **[Q]**.
- *Feature:* A user-generated, user-edited 1-page summary: what helped, which patterns showed up. It is **never sent automatically**.
- *Evidence:* skills-based therapy uses homework and review [20][21].
- *Benefit:* bridges to professional care.
- *Downside:* the health-data framing raises the compliance bar.
- *Difficulty:* M.

**M17. Impulse pause.** Future
- *Problem:* Impulse purchases **[Q]**.
- *Feature:* A "Want list" with a 48h cool-off reminder.
- *Evidence:* inhibition [1].
- *Benefit:* money.
- *Downside:* scope creep.
- *Difficulty:* L.

**M18. Reliable offline core.** ✅ MVP
- *Problem:* If the AI or network fails, reminders must not fail.
- *Feature:* All reminders and alarms are scheduled locally. Capture saves locally first, then parses. There is a rule-based fallback parser.
- *Evidence:* trust is everything for a prosthetic memory.
- *Benefit:* reliability.
- *Downside:* engineering effort.
- *Difficulty:* M.

**M19. Talk-through onboarding.** ✅ MVP
- *Problem:* Setup fatigue **[Q]**.
- *Feature:* Onboarding = "What's on your mind for tomorrow?" (voice). The app turns that into the first items, then asks for permissions *in context*, when each one is first useful ("To tell you when to leave, can I see your calendar?").
- *Evidence:* the cognitive-cost principle.
- *Benefit:* value in under 60 seconds.
- *Downside:* none.
- *Difficulty:* L.

**M20. Weekly loose-ends sweep (2 min).** ✅ V1
- *Problem:* Weekly reviews are a classic habit that ADHD users drop **[Q]**.
- *Feature:* A pre-built sweep on the user's chosen day: "5 things are hanging: 2 waiting, 2 parked, 1 old. Keep / archive / smaller?" Swipe cards.
- *Evidence:* open loops [22].
- *Benefit:* keeps the system clean without a review ritual.
- *Downside:* if skipped, nothing breaks (by design).
- *Difficulty:* L.
