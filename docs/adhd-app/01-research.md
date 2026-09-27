# Part 1: Executive summary, research findings, ADHD problem map

## 1. Executive summary

**Premise challenged.** The brief lists about 20 capabilities and 50 feature ideas. The research does support most of the *problems* behind them. It does **not** support building most of them at once. A broad "executive-function operating system" would recreate the thing ADHD users say drives them away from productivity apps: a system they have to set up, maintain and feel guilty about (Part 2, §5).

**What the research points at.** Four findings matter most for product design:

1. **Help must arrive at the point of performance.** The most consistent practical principle in ADHD clinical work (Barkley) is that support should appear *where and when* the behaviour needs to happen. Plans made in advance and good intentions are not enough on their own. Cues, time and motivation need to be put *outside* the head [1][58]. Phones are well placed to do this, but only through lock-screen, widget, alarm and notification surfaces. A chat window is the wrong place.
2. **Time-based remembering is the weak link, and cue-based remembering is much less impaired.** In adults with ADHD, *time-based* prospective memory ("at 3 pm, call…") shows a large impairment. *Event-based* prospective memory ("when you see X, do Y") often does not differ from controls [8]. **[I]** A product should turn "remember at a time" into "get cued by an event": arriving somewhere, a leave-time countdown, opening a laptop, getting into the car.
3. **Time perception and estimation are measurably different.** Meta-analyses find medium-sized deficits in time discrimination and small-to-medium increases in time-estimation error [6][7]. The planning fallacy makes things worse for everyone [F1]. Breaking a trip or task into its steps reduces underestimation [F2]. **[I]** Showing time as "leave in 23 min" and splitting preparation into steps are evidence-aligned, not decoration.
4. **Procrastination is largely short-term mood repair.** People delay tasks that feel aversive to feel better now [15][17]. Emotional dysregulation is substantially elevated in adult ADHD (emotional lability g ≈ 1.2) [13]. **[I]** Anything that shames, nags or piles up overdue items makes a task *more* aversive and so *increases* avoidance. The tone of the product is part of how it works.

**Recommended product thesis.** Build a **"cue, start, resume" engine**, not a planner. It has three jobs:

- **Catch** anything instantly (voice or text, no filing).
- **Cue** it at the right *moment*, meaning an event, a place or a leave-time, not just a clock time. Reminders escalate politely and always offer a one-tap way out: *make it smaller, move it to a better time, done*.
- **Get the user moving, and remember where they stopped.** That means a one-tap "just start" timer, a single next action, and a "Where was I?" snapshot for any interrupted task.

These run on a small **personal timing model**: how long *you* really take to get ready, how late *you* tend to run, and which reminders *you* actually act on. That model gets better with use. It is the most defensible part of the product, and it keeps behavioural data **on the device by default**.

**Why this should exist as its own product, and not as Todoist plus reminders plus ChatGPT.** A chatbot cannot tap you on the shoulder at 5:12 pm because *you in particular* need 38 minutes, not 20, to leave for the dentist. A to-do list does not know you were interrupted halfway through slide 7. Neither one changes its approach after its reminders have been ignored three times. The value is in **timing, context and calibration delivered through OS surfaces**, with close to zero setup. General tools are not built for that (§21, Part 5).

**What to build first.** A small team should build five things: capture, smart reminders with event and leave triggers, leave-time countdown, "just start", and "Where was I?". Put them on one "Now" screen with widgets and lock-screen surfaces. Leave out, for now: human body-doubling marketplaces, mission alarms, a stimulation content library, points and badges, deep pattern "insights", and social accountability (§29, Part 5).

---

## 2. Research findings

### 2.1 What ADHD is (and isn't) for product purposes

- **[E]** ADHD is a common neurodevelopmental condition. Estimated prevalence is about 5.9% in youth and about 2.5% in adults under strict persistence criteria [3]. A global meta-analysis puts *persistent* adult ADHD at 2.58% and *symptomatic* adult ADHD at 6.76%, which is roughly 140M and 366M adults respectively (2020) [5]. In the US, about **6.0% of adults (≈15.5M) reported a current ADHD diagnosis** in 2023. About half were diagnosed in adulthood, and about 71.5% of those on stimulants had trouble filling prescriptions because of shortages [4].
- **[E]** Executive-function (EF) difficulties are common but **not universal**. A classic meta-analysis found reliable group differences on EF tasks, but many people with ADHD do *not* show impairment on any given EF test. EF weakness is "neither necessary nor sufficient" to explain ADHD [2]. **[R]** Do not design for one "ADHD brain". Design for a set of difficulties, and let the product learn which ones apply to each person.
- **[E]** Adult ADHD responds to structured skills-based treatment. CBT and meta-cognitive therapy teach calendars, task lists, breaking tasks down, time estimation, and managing distraction and procrastination. They beat active control conditions in randomised trials [20][21]. **[I]** The best-supported *behavioural* content an app can offer is the scaffolding these therapies teach: external calendars and lists, breaking tasks down, if-then plans, and time management. **[R]** Ground features in these skills, but do not claim therapeutic effect. Present the product as a tool, not a therapy.
- **[E]** Evidence for digital ADHD interventions is growing but mostly **low quality**. A 2025 review of 26 systematic reviews (≈34k participants) found some positive effects, but the evidence was generally weak. Adverse effects were reported in about 30% of the reviews [43]. App-quality reviews show most ADHD apps are psychoeducational or trackers with little evaluation [44]. **[R]** Build evaluation in from day one (§26, Part 5) and make no efficacy claims we cannot back.

### 2.2 Executive function

| Area | What's established | Product implication |
|---|---|---|
| **Working memory** | **[E]** Working-memory weaknesses are among the most robust EF findings in ADHD [2][3]. Unfinished goals linger and intrude until acted on or *planned* [22]. | Offload *everything* at the moment it's thought. Capture must take under 3 seconds. Making a concrete plan for a captured item reduces intrusive thoughts [22]. |
| **Inhibition** | **[E]** Central in Barkley's model [1]. If-then plans improved response inhibition in children with ADHD to control levels in a lab task [19]. | Offer pre-committed if-then "rescue plans" for known derailers (§9 M6, Part 3). |
| **Planning & sequencing** | **[E]** Weak planning and organisation are directly targeted by meta-cognitive therapy [21]. | The app does the sequencing ("next single step"). The user should not have to build plans. |
| **Prioritisation / decision fatigue** | **[E]** "Choice overload" is real but conditional. Meta-analyses show effects depend on complexity and uncertainty, not on the number of options alone [F5]. "Ego depletion" (the classic decision-fatigue mechanism) failed a large multi-lab replication [F6]. | Show **one** recommendation, because complexity and uncertainty are high for an overwhelmed user. Do **not** market "decision fatigue" as settled science. |
| **Task initiation** | **[E]** Procrastination is linked to inattention symptoms [16] and to short-term mood repair [15]. Behavioural activation (small, scheduled, rewarding actions) has strong evidence in depression [42]. That is a different population, so transfer to ADHD is **[I]**. | Make the first step *emotionally* small, not just logically small. "Put one thing away", not "Clean room: step 1 of 25". |
| **Task completion** | **[Q]** "The last 10%" is a common complaint (tidy-up, sending, submitting). **[I]** Delay aversion [10] predicts that the unrewarded final steps get dropped. | Detect "almost done" states and turn the finishing step into a visible one-tap item ("Send it now: 1 min"). |

### 2.3 Time

- **[E]** **Time perception:** a meta-analysis of 55 studies found medium effects for time discrimination and small-to-medium increases in estimation error in ADHD [6]. A review of adult studies confirms impairment in adults, though it is not clear which timing domains are most affected [7].
- **[E]** **Planning fallacy:** people underestimate task durations even when they know past tasks overran [F1]. **"Unpacking"** a task into its component steps reduces underestimation [F2]. This is direct support for step-by-step "leaving" plans.
- **[E]** **Delay aversion / temporal discounting:** people with ADHD show steeper discounting and a preference for smaller immediate rewards [10][11]. **[I]** Distant deadlines feel psychologically "not now" until they are suddenly urgent. That is the everyday form of "time blindness".
- **[Q]** Chronic lateness, "waiting mode" (being unable to do anything before an appointment), and underestimating getting-ready time come up constantly in communities. There is little direct research on lateness in ADHD specifically. **[I]** It is a plausible combination of estimation error, planning fallacy and transition difficulty.
- **[R]** Show **time remaining** rather than clock times. Show **preparation as steps**. **Calibrate** estimates against the person's own history. Treat "waiting mode" as a feature target: "You have 40 min before you need to start getting ready. Here's a 15-min thing."

### 2.4 Attention

- **[E]** Distractibility and difficulty *sustaining* attention on low-interest tasks are core symptoms [3].
- **[E]** **Hyperfocus** is widely reported by adults with ADHD. Research is early: self-report scales exist, and hyperfocus is reported more by adults with ADHD symptoms [F7][F8]. It is not a diagnostic criterion, and it is poorly defined.
- **[E]** **Interruptions** raise stress and time pressure even when work gets done faster [25]. **Attention residue** from an unfinished task reduces performance on the next task [26]. After an interruption, **resumption lag** is reduced by cues to where you were and by encoding the goal *before* switching [24].
- **[E]** Phone notifications **increased inattention and hyperactivity symptoms** in a general-population within-subjects experiment [27]. **Batching** notifications three times a day improved well-being and attention. Hourly batching did little, and turning everything off increased anxiety and FoMO [28].
- **[R]** (a) The app's own notifications must be scarce and batched by default. (b) "Where was I?" should capture state *at the moment of interruption*, with one tap or voice. (c) Hyperfocus features should protect **anchors** (meals, meds, appointments, sleep), not police focus length.

### 2.5 Motivation and reward

- **[E]** ADHD is associated with altered reward processing: stronger preference for immediate reward, sensitivity to reinforcement schedules, and reduced anticipatory ventral-striatal response in fMRI meta-analysis [10][11][F9].
- **[E]** Dopamine is implicated (e.g. PET differences in reward-pathway markers [12]; stimulant pharmacology). But "ADHD = low dopamine" is an **oversimplification**. The WFADHD consensus describes multi-factor genetic and environmental causes and small brain differences [3]. **"Dopamine detox" has no scientific basis** as a concept.
- **[Q]** The phrase "interest-based nervous system" (interest, novelty, challenge, urgency) is widely used and matches lived experience. It is **clinical framing, not an established model**.
- **[E]** Expected, tangible rewards can **undermine intrinsic motivation** for interesting activities [F10]. Gamification effects are mostly positive but modest, depend on context, and often fade [F11].
- **[R]** Build motivation into the **task itself**: novelty, immediate feedback, urgency made visible, and social presence. Do not bolt on points. Rewards should be **informational** ("you started despite low energy"), not **controlling** ("streak lost").

### 2.6 Memory

- **[E]** **Time-based prospective memory** is impaired in ADHD, with a large effect in one direct comparison. **Event-based** PM was not impaired in that sample [8]. Adults with ADHD also struggle in complex, multi-task PM simulations [9].
- **[Q]** Everyday forms: "I knew I had to do something but forgot what", "out of sight, out of mind" (often called "object permanence", which is **not** the Piagetian concept but a useful user phrase), forgotten ideas, walking into rooms and forgetting why.
- **[R]** Core design rule: **wherever possible, attach reminders to events** (arriving, leaving, connecting to car Bluetooth, unlocking the laptop, the leave-countdown, the morning brief) rather than to bare times. Keep things "in sight" with widgets and lock-screen live activities.

### 2.7 Emotion and behaviour

- **[E]** **Emotional dysregulation** is strongly elevated in adult ADHD (13 studies, N = 2,535; emotional lability g ≈ 1.20) and correlates with symptom severity (r ≈ .54) [13].
- **[E]/[Q]** **"Rejection-sensitive dysphoria" (RSD)** is **not** a recognised diagnosis. *Rejection sensitivity* is an established construct (Downey & Feldman, 1996), and qualitative work describes intense experiences of it in ADHD [14]. The quantitative evidence specific to "RSD" is thin and partly derived from clinicians' observations. **[R]** Do not name or "treat" RSD. Do design a UI that never implies failure or disapproval.
- **[E]** **Procrastination** relates to emotion regulation. It prioritises short-term mood over the future self [15].
- **[Q]** Shame and guilt cycles ("the red overdue list") are among the most common reasons given for abandoning apps (Part 2).
- **[R]** Default to forgiveness. Offer no "overdue" red counts, no streak loss, and automatic "fresh start" moments. *Fresh starts* (temporal landmarks) increase goal-directed behaviour [F12].

### 2.8 Transitions

- **[E]** Task switching carries costs, and unfinished tasks leave residue [26]. Being interrupted while engaged causes stress [25].
- **[I]** Stopping something rewarding (games, scrolling) to start something unrewarding is hardest when delay aversion is present [10]. The *reward gradient* runs against the switch.
- **[I]** Transitions involve several EF demands at once: inhibiting the current activity, holding the new goal in mind, starting a new sequence, and estimating the time needed. Each is a known weak point, so the combination is hard.
- **[Q]** Everyday "stuck" states: in bed, on the couch before leaving, in the car before going inside, at the desk before starting.
- **[R]** Transitions should be **short sequences of physical micro-steps**: stand up, water, shoes. The *first* step should be something the body can do before the mind agrees. Transition warnings (10 min, then 2 min) help people get ready to disengage. This comes from child and autism practice **[I]**, and adults request it widely **[Q]**.

### 2.9 Environment

- **[E]** External, visible cues at the point of performance are the core Barkley recommendation [1][58].
- **[E]** **Body doubling** has emerging HCI research. A survey of 193 neurodivergent people found it used mainly for **initiating, staying motivated and completing** tasks, especially tedious or multi-step ones. The authors propose two dimensions: same/different time-space, and ambient-vs-accountability mutuality [34]. EEG work is exploratory [34]. There are **no RCTs**. Social facilitation (the effect of others' presence on simple tasks) is a long-established effect [35].
- **[E]** White/pink noise gave a **small** benefit (g ≈ 0.25) on lab attention tasks for youth with ADHD, and slightly *hurt* controls [37]. This finding is in youth and in lab tasks.
- **[R]** Offer ambient presence and optional noise as *light* features. Do not claim they "boost focus".

### 2.10 Sleep and mornings

- **[E]** Adults with ADHD *report* more sleep problems than controls. In a 2018 meta-analysis they differed on 7 of 9 self-reported measures, including sleep-onset latency, night awakenings, daytime sleepiness and sleep quality. **Objective** studies found few differences [33]. **[I]** The experience of poor sleep is real, but the mechanism is unsettled, so the app should support routines and not make sleep claims. A systematic review of circadian studies finds **later chronotype and delayed circadian phase** (e.g. later melatonin onset) associated with ADHD [32].
- **[E]** **Snoozing isn't necessarily bad.** In habitual snoozers, 30 minutes of snoozing did not harm, and in some tests slightly improved, cognition on waking compared with waking at once [30].
- **[E]** Melodic alarm sounds are *associated* with lower self-reported sleep inertia (survey, N = 50, correlational) [31].
- **[E]** Writing a specific **to-do list for tomorrow** before bed helped people fall asleep about 9 minutes faster than writing about completed tasks (polysomnography, N = 57) [23].
- **[I]/[R]** If phase is delayed, mornings are not only a "willpower" problem. Aggressive alarm tricks work against biology and can cause sleep loss. Better levers: **evening wind-down and the next-day handoff** (supported by [23]), gradual or melodic waking, and a guided post-alarm routine. "Mission" alarms are **speculative** (§8.6, Part 3).

---

## 3. ADHD everyday problem map

This map is the backbone for the feature decisions. **Frequency** and **impact** are product judgements from the research and community signal. They are **[I]** estimates, not measurements.

| # | Everyday problem | Underlying mechanism(s) | Freq. | Impact | Current tools solve it? | Our lever |
|---|---|---|---|---|---|---|
| P1 | "I forgot to do X" (bill, reply, pickup) | Time-based PM [8], out of sight | Daily | High ($, relationships) | Partly (reminders fire once, get swiped) | Event triggers, adaptive follow-up, one-tap actions |
| P2 | Can't start / "wall of awful" | Mood repair [15], delay aversion [10] | Daily | High | Poorly (lists show the whole task) | Micro-first-step, just-start timer, body double |
| P3 | Running late, underestimated getting ready | Time estimation [6], planning fallacy [F1] | Several/week | High | Rarely (Maps "time to leave" ignores prep) | Leave-time engine with personal prep calibration |
| P4 | Lost place after interruption | Resumption lag [24], residue [26], WM | Daily | Med–High | No | "Where was I?" snapshot + resume |
| P5 | Head full of loose thoughts | WM, open loops [22] | Daily | Med | Partly (capture exists; filing is manual) | Zero-sort brain dump + plan-making |
| P6 | Stuck in "waiting mode" before an event | Time perception, anticipatory anxiety **[Q]** | Several/week | Med | No | "You have 40 free min" suggestions |
| P7 | Hyperfocus through meals, meds, appointments, sleep | Hyperfocus [F7] | Weekly | Med–High | Poorly (timers interrupt everything) | Anchor-protection nudges only |
| P8 | Can't stop scrolling or gaming to switch | Reward gradient, inhibition | Daily | Med | Partly (blockers are punitive) | Transition sequences, return ramps |
| P9 | Overwhelm from the list itself | Choice complexity [F5], emotion [13] | Weekly | High (leads to app abandonment) | Makes it worse | One-thing mode, hide-all, fresh start |
| P10 | Day "ruined", so give up | All-or-nothing thinking **[Q]**, shame | Weekly | High | No | Reset my day |
| P11 | Waiting on others (refunds, replies) forgotten or obsessively checked | PM, anxiety | Weekly | Med | No dedicated tool | Waiting Room with scheduled follow-ups |
| P12 | Mornings: can't get up, routine derails | Circadian delay [32], sleep inertia | Daily | High | Partly (Alarmy, Routinery) | Night handoff, gentle wake, adaptive routine |
| P13 | Bedtime drift / "revenge bedtime procrastination" | Delay aversion, circadian | Daily | High | Rarely | Evening transition, next-day handoff [23] |
| P14 | Boring admin avoided until penalties ("ADHD tax") | Aversiveness, PM | Monthly+ | High ($) | No | Admin sessions, deadline radar, trial and return windows |
| P15 | Messages and emails unanswered (communication debt) | Aversiveness, emotion | Daily | High (social) | No | Reply queue + draft help |
| P16 | Meds: "did I take it?" | PM, WM | Daily (for about 1/3 on meds [4]) | High | Partly (med apps) | One-tap taken-log with time |
| P17 | Losing objects (keys, wallet) | WM, attention | Daily | Med | No (AirTag etc. help partly) | Leave checklist, "I put X in Y" log |
| P18 | Over-committing the day | Planning fallacy | Daily | Med | Partly (Structured timeline) | Capacity check |
| P19 | Returning to the app after weeks away and facing a guilt pile | Shame, avoidance | Monthly | High (leads to churn) | Makes it worse | Automatic fresh start |
| P20 | Emotional flooding when criticised or stuck | Emotional dysregulation [13] | Varies | High | Not in scope for productivity apps | Gentle pause, never shame; signpost help |
| P21 | Household friction ("nagging partner") | PM and relationship stress **[Q]** | Weekly | High | No | Delegated reminders delivered in the app's voice |
| P22 | Estimating task length | Time estimation [6] | Daily | Med | No | Estimate-vs-actual calibration |

**P14–P22 were not in the original brief.** They lead to "Features we missed" (§9, Part 3).
