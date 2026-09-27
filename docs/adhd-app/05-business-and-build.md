# Part 5: Prioritisation, monetisation, market, differentiation, architecture, privacy, accessibility, roadmap, risks, final answer

## 18. Prioritisation

### 18.1 Scoring (internal planning aid, not a measurement)

Scale 1–5. **Complexity, Cognitive burden and Privacy risk are inverted** (5 = easy / light / safe). Scores are judgement calls informed by Parts 1–3. The reasoning matters more than the totals.

| Feature | Value | Freq | ADHD rel. | Evidence | Differ. | Complexity⁻¹ | Burden⁻¹ | Privacy⁻¹ | **Total /40** | Phase |
|---|---|---|---|---|---|---|---|---|---|---|
| Capture (voice/text, parse) | 5 | 5 | 5 | 4 | 3 | 3 | 5 | 3 | **33** | MVP |
| Smart reminders + ladder | 5 | 5 | 5 | 4 | 4 | 3 | 5 | 4 | **35** | MVP |
| Event/place triggers (M1) | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 2 | **32** | MVP |
| Leave engine + countdown | 5 | 4 | 5 | 4 | 5 | 3 | 5 | 2 | **33** | MVP |
| Start flow (just start + micro-step) | 5 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | **36** | MVP |
| Where was I? (park/resume) | 4 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | **35** | MVP |
| Fresh start / self-cleaning (M2) | 4 | 3 | 5 | 3 | 4 | 5 | 5 | 5 | **34** | MVP |
| Morning brief / night handoff (light) | 4 | 5 | 4 | 4 | 3 | 4 | 4 | 5 | **33** | MVP |
| What now? (heuristic) | 4 | 4 | 4 | 3 | 3 | 4 | 5 | 4 | **31** | MVP |
| Overwhelm + Reset day | 4 | 3 | 5 | 3 | 4 | 5 | 5 | 4 | **33** | MVP |
| Meds taken log (M3) | 4 | 5 | 4 | 3 | 2 | 5 | 5 | 2 | **30** | MVP |
| Notification tiers + budget + digest | 5 | 5 | 5 | 4 | 3 | 3 | 4 | 5 | **34** | MVP |
| Widgets / lock-screen controls | 5 | 5 | 5 | 4 | 3 | 3 | 5 | 5 | **35** | MVP |
| Waiting Room follow-ups | 4 | 3 | 4 | 2 | 5 | 4 | 4 | 4 | **30** | V1 |
| Transition assistant | 3 | 4 | 5 | 3 | 4 | 4 | 4 | 5 | **32** | V1 |
| Stay with me (AI presence) | 3 | 3 | 4 | 2 | 3 | 4 | 4 | 4 | **27** | V1 |
| If-then rescue plans (M6) | 4 | 3 | 4 | 5 | 4 | 3 | 3 | 4 | **30** | V1 |
| Estimate calibration (M5) / capacity (M7) | 3 | 4 | 4 | 3 | 4 | 4 | 4 | 5 | **31** | V1 |
| Reply drafts (M8) / admin radar (M9) | 4 | 4 | 3 | 2 | 3 | 3 | 5 | 3 | **27** | V1 |
| Hyperfocus anchors | 3 | 3 | 5 | 2 | 4 | 4 | 5 | 4 | **30** | V1 |
| Alarm: melodic + snooze plan + routine | 4 | 5 | 4 | 3 | 2 | 3 | 4 | 5 | **30** | V1 |
| Better breaks menu | 2 | 3 | 3 | 1 | 2 | 4 | 4 | 5 | **24** | V1 (test) |
| Mission / movement alarms | 2 | 3 | 3 | 1 | 1 | 3 | 3 | 5 | **21** | V1 opt-in, maybe never |
| Pattern "insights" UI | 3 | 2 | 4 | 2 | 4 | 3 | 4 | 1 | **23** | V2 |
| Human accountability / buddy | 3 | 2 | 3 | 2 | 2 | 3 | 3 | 2 | **20** | V2 |
| Friend rooms (body doubling) | 3 | 2 | 4 | 2 | 2 | 2 | 3 | 2 | **20** | V2 |
| Delegated household reminders (M11) | 4 | 3 | 3 | 1 | 4 | 3 | 4 | 2 | **24** | V2 |
| Desktop auto-context | 4 | 3 | 4 | 3 | 5 | 1 | 5 | 1 | **26** | V2 |
| Email/receipt parsing (Waiting) | 3 | 3 | 3 | 2 | 3 | 2 | 5 | 1 | **22** | V2 |
| AI booking agent | 4 | 2 | 3 | 1 | 4 | 1 | 5 | 1 | **21** | Future |
| Anonymous stranger rooms | 2 | 2 | 3 | 2 | 1 | 1 | 3 | 1 | **15** | Don't build (integrate) |
| Money-based commitment devices | 1 | 1 | 2 | 2 | 1 | 3 | 3 | 2 | **15** | Don't build |
| Points / streaks / leaderboards | 1 | 3 | 2 | 1 | 1 | 4 | 2 | 5 | **19** | Don't build |

### 18.2 Phases

**MVP ("Catch, Cue, Start, Resume"), ≈4–5 months with a small team.**
Capture (voice + text + parse + confirm) · Smart reminders with a 3-step ladder + smart Later · Event/place triggers (arrive/leave/car-connect) · Leave engine with countdown, checklist and Live Activity · Start flow (size check, first step, timer 2/5/10/15/25, stop-here) · Park/Resume · Morning brief + night handoff (light) · What now? (heuristic) · Overwhelm + Reset day · Meds taken template · Notification tiers, budget, 3× digest, safe contexts · NOW widget, Capture control, Resume widget · Fresh start · Offline core · Talk-through onboarding · Privacy dashboard (basic).

*Deliberately not in MVP:* body doubling, mission alarms, a stimulation library, social features, an insights UI, desktop, email parsing, gamification.

**V1 (months 6–10).** Waiting Room with follow-ups + drafts · Transition assistant · Stay with me · Guided alarm (melodic, snooze plan, elastic routine) · Estimate calibration + capacity check · If-then rescue plans · Reply drafts · Admin radar · Hyperfocus anchors · Weekly sweep · Better breaks (A/B tested) · Opt-in mission alarm (with a hard stop) · Wear OS/watchOS · Localisation (Hindi, Spanish, German).

**V2 (months 11–18).** "What I've learned" insights UI · Friend rooms · Buddy commitments · Household/delegated reminders + family plan · Desktop companion (auto-context parking) · Opt-in email parsing · Clinician/coach export · Smart-light wake (HomeKit/Matter) · Learned recommender weights.

**Future experiments.** Booking agent (with per-action approval) · AR/phone-camera "where did I put it" · Smart-glasses cues · Car integration (CarPlay/Android Auto leave checklists) · Research partnerships for an RCT.

---

## 19. Monetisation

### 19.1 Competitor price anchors (Sept 2026, USD)

Tiimo $54/yr or $12/mo [45] · Finch Plus ≈ $70/yr [46] · Structured Pro $9.99/yr–$29.99 lifetime [49] · Llama Life $39/yr [51] · Goblin Tools app ≈ $4 one-time [50] · Focusmate Plus $8–12/mo [47] · Sunsama $20–25/mo, Motion $19–49/mo [48].
**[I]** The consumer ADHD segment clusters at **$40–70/yr**. Premium AI planners charge 3–10× that, but target knowledge workers.

### 19.2 Recommended model

**Freemium subscription with an ethical charter.**

| Free (forever, genuinely useful) | Plus ($6.99/mo · $49.99/yr) |
|---|---|
| Unlimited capture (on-device parsing; ~40 AI-parsed dumps/mo) | Unlimited AI parsing, decomposition, drafts |
| Unlimited reminders, event/place triggers, alarms | Adaptive ladder learning + timing personalisation |
| Leave countdown (default prep times) | Leave calibration (personal prep + lateness correction) |
| Start flow with offline micro-step library | AI next-step generation for any task |
| Park/Resume (up to 5 active) | Unlimited Resume, attachments |
| Morning brief & night handoff | Waiting Room follow-ups, Transition assistant, Stay with me |
| Overwhelm, Reset day, Fresh start | Calibration, capacity, if-then plans, weekly sweep |
| All widgets and lock-screen controls | Themes, fonts, custom sounds |

- **Student:** $29.99/yr. **Regional pricing** (e.g. India ≈ ₹149/mo or ₹999/yr; this is an assumption to be tested).
- **Family (V2):** $79.99/yr for up to 5, with household reminders.
- **Lifetime:** avoid at launch, because ongoing AI costs make it risky. Possibly a capped "founder" lifetime offer.

### 19.3 Ethical monetisation rules (non-negotiable)

1. **Never paywall safety or core memory:** reminders, alarms, meds log, leave countdown, and data export stay free.
2. **Free-trial kindness:** a push *and* email reminder **3 days before** a trial converts, and one-tap cancel. The ADHD community is particularly hurt by trial traps (M9 exists for the same reason).
3. **No downgrade hostage-taking:** when a subscription lapses, the user's items and routines stay; only the Plus behaviours stop.
4. **No manipulative paywalls:** no countdown offers, no guilt copy, no paywall on first launch.
5. **No selling or sharing behavioural data, and no advertising.** Ever.
6. **Pause subscription** option (1–3 months) instead of cancel-or-nothing.

### 19.4 Unit economics (rough, [I])

- LLM cost: small models (Haiku-class) for parse/decompose ≈ a few cents per heavy user per month at current pricing. On-device models (Apple Foundation Models on iOS 26+, Gemini Nano on supported Android) reduce this further.
- Maps ETA calls are the likelier cost driver; cache them and compute only for events with locations.
- Target gross margin >80%.

---

## 20. Market opportunity (grounded, not inflated)

**Evidence base.**
- US: ≈15.5M adults with a current ADHD diagnosis (6.0%). About half were diagnosed as adults, and about half have used telehealth for ADHD care [4].
- Global: ≈140M adults with persistent ADHD and ≈366M with symptomatic ADHD (2020 estimates) [5].
- Self-identifying and undiagnosed users are a further large group; the brand should welcome them ("for brains with a lot of tabs open"). **No diagnosis is required.**
- The market *validated willingness to pay* in 2025: Tiimo was iPhone App of the Year [45]; Finch, Structured and Focusmate have large paying bases.

**Sizing (explicit assumptions, not data).**
- **TAM** (addressable adults with ADHD or ADHD traits, smartphone-owning, in markets with app spending): take ~140M persistent-ADHD adults globally as a conservative anchor.
- **SAM** (launch markets US, UK, CA, AU + English-speaking India urban; diagnosed or self-identified adults actively seeking tools): **≈20–30M** *(assumption: US 15.5M diagnosed + other markets + self-identified, minus low-engagement)*.
- **SOM (3 years):** 0.5–1% of SAM as monthly active users ≈ **100k–300k MAU**; 15–25% paying ≈ **15k–75k subscribers** × ~$40 net ARPU ≈ **$0.6M–3M ARR**.

**Honest read:** this is a strong **small-to-mid-size consumer business**, and potentially more with family, education (universities' disability services) or employer-benefit channels. Generic "productivity app market is worth $X billion" figures come from low-quality market reports and should not be used in any pitch.

**Channels.** ADHD creator communities (YouTube, TikTok, podcasts), university disability services, ADHD coaches (the export feature helps), App Store editorial (accessibility and design quality help), and word of mouth from "it told me when to leave" moments.

**Growth mechanics that aren't exploitative.** Shareable "leave-time" wins aren't needed. The strongest organic loop is **household reminders** (V2): a partner installs to *send* calm reminders, and may become a user themselves.

---

## 21. Competitive differentiation: why this should exist

**The question:** why not Todoist + reminders + ChatGPT?

| Capability | Todoist + OS reminders + ChatGPT | Waypoint |
|---|---|---|
| Captures a messy voice dump into items with triggers | Partly (Todoist NL is good; ChatGPT can structure but doesn't schedule into the OS) | ✅ One hold |
| Knows *when* to cue based on **your** real prep time and lateness | ❌ | ✅ Calibrated Leave engine |
| Cues on events ("when I get in the car") | Partly (Apple location reminders only) | ✅ Arrive/leave/Bluetooth/device events |
| Changes *strategy* when ignored, ending in a decision | ❌ (fire-once or dumb nag) | ✅ Ladder with Smaller/Later/Drop |
| Starts you with one physical step + timer from the lock screen | ❌ (ChatGPT gives a whole list; no timer, no OS presence) | ✅ |
| Knows where you stopped and reopens it | ❌ | ✅ Park/Resume |
| Cleans up after you, no guilt pile | ❌ | ✅ Fresh start |
| Protects anchors during hyperfocus without policing | ❌ | ✅ |
| Private-by-default behavioural model | n/a | ✅ On-device |

**Evaluating the candidate directions from the brief:**

| Direction | Verdict | Reason |
|---|---|---|
| Executive-function OS | ❌ as a *product position* | Too broad; invites feature bloat and setup burden; hard to explain |
| AI external brain | 🟡 | A good *tagline*; weak moat (every AI assistant claims memory) |
| Context restoration engine | 🟡 strong wedge, too narrow alone | Unique and evidence-aligned [24][26], but used only a few times a day |
| Adaptive reminder engine | ✅ core | Highest frequency; directly targets the best-evidenced deficit (time-based PM [8]) |
| Transition-management system | ✅ core | Leave-time is the most "magical" and measurable moment; evidence-aligned [6][F2] |
| ADHD-aware personal agent | 🔻 later | Autonomy raises trust and regulatory risk; value comes after reliability is proven |

**Chosen position:** **"The point-of-performance assistant."** An adaptive cue engine plus a transition and leave engine plus context restoration, **sharing one personal timing model**.

**Moat (defensibility).**
1. **Personal calibration data** that improves with use (prep, lateness, response windows). It is valuable, private, and not portable to a chatbot.
2. **Deep OS integration** (AlarmKit, Live Activities, App Intents, widgets, geofences, Android equivalents). General assistants and list apps rarely do this well for *timing*.
3. **A trust brand** in a community that is wary of shame and exploitation: no-shame design plus an ethical monetisation charter.
4. **Reliability**: a prosthetic memory that never fails silently (local scheduling, offline core).

**The biggest threat:** Apple, Google and the AI assistants adding proactive, personal timing ("Siri, tell me when to leave"). **Mitigation:** move faster on ADHD-specific behaviour (the ladder, start flow, resume, no-shame design, fresh start). Platforms optimise for everyone; we optimise for the person whose reminders don't work.

---

## 22. Technical architecture (lean, realistic)

```
┌──────────────────────── Device (iOS / Android) ────────────────────────┐
│  UI (React Native/Expo)  ←→  Native modules (Swift/Kotlin):            │
│    NOW · LATER · YOU · Modes    WidgetKit/Glance widgets · Live         │
│                                 Activities/ongoing notif · AlarmKit /   │
│                                 AlarmManager.setAlarmClock · App Intents│
│                                 / Shortcuts · Geofencing · BT events ·  │
│                                 on-device speech · EventKit/Calendar    │
│                                                                          │
│  Local-first store (SQLite + CRDT/change log)                           │
│  ├ Items · Sessions · Anchors · Outcomes · Patterns (never leave device │
│  │  unless E2EE sync on)                                                 │
│  Cue Engine (deterministic, on device)                                  │
│  ├ triggers: time | place | event | leave | device-state               │
│  ├ ladder state machine · notification budget · safe contexts          │
│  ├ schedules LOCAL notifications/alarms (works offline)                 │
│  Leave Engine: ETA cache + personal offsets                             │
│  Recommender (heuristic → learned weights on device)                    │
│  On-device AI: rule parser; Apple Foundation Models / Gemini Nano where │
│  available for parse/summarise                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ TLS; minimal payloads
┌──────────────────────────────▼───────────────────────────────────────────┐
│ Backend (small): Auth · E2EE sync relay (encrypted blobs) · AI gateway   │
│ (stateless; strips identifiers; zero-retention LLM contracts; rate      │
│ limits; schema validation) · Maps ETA proxy (cache) · Subscriptions     │
│ (RevenueCat or StoreKit/Play Billing) · Privacy-preserving analytics     │
│ (event counts, no content; opt-in) · Crash reporting (scrubbed)         │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key choices and why.**
- **Cross-platform UI + native modules.** A small team cannot build two full native apps. But widgets, alarms, Live Activities and intents *must* be native anyway. React Native/Expo (or Flutter) with a thin native layer is pragmatic. If the team is strongest in Swift, launch iOS-only first (AlarmKit and Live Activities are the best surfaces) and follow with Android.
- **Local-first.** Reminders must fire without a network. Privacy improves, and so does latency.
- **Deterministic cue engine.** LLMs never decide *when* to interrupt; auditable rules do.
- **AI gateway.** One place to enforce zero-retention, redaction, cost caps, and fallbacks. The model provider is swappable. Small, fast models handle parse and decompose; larger models are used only for rare complex requests.
- **Voice:** on-device speech-to-text by default (iOS Speech on-device / Android on-device recognition). **Raw audio is never uploaded by default.** Cloud transcription is opt-in for accuracy.
- **Calendar:** read-only by default (EventKit / CalendarContract; Google/Microsoft APIs later). The app writes only on explicit action.
- **Location:** region monitoring only (iOS ~20 monitored regions per app; Android ~100 geofences), and **no continuous tracking**. Store *event timestamps*, not traces.
- **Platform realities to plan for:** iOS background execution limits (prefer scheduled local notifications, not background timers); Android exact-alarm permission rules and OEM battery killers (need onboarding guidance per OEM); notification permission prompts (ask in context); critical alerts need Apple entitlement approval (use Time-Sensitive + AlarmKit instead).

**Team for MVP (≈5–6 people):** 1 product/design lead, 1 product designer (with accessibility depth), 2 mobile engineers (1 with native iOS/Android depth), 1 backend/AI engineer, and a part-time ADHD clinical/research advisor plus a part-time privacy counsel.

---

## 23. Privacy and safety

### 23.1 Data inventory and handling

| Data | Sensitivity | Default handling |
|---|---|---|
| Tasks/notes/voice | High (can reveal health, finances, relationships) | Local; E2EE sync opt-in; AI calls send minimal text, zero retention |
| Voice audio | High | On-device transcription; audio discarded after transcription unless the user saves it |
| Calendar | High | Read locally; only event times, titles and locations are used |
| Location | Very high | Geofence events only; no traces; opt-in |
| Behavioural patterns | High (can be *inferred health data*) | **On-device only**; viewable and deletable; pause switch |
| Meds log | Health data | Local + E2EE; never in analytics |
| Analytics | Medium | Opt-in, aggregate, no content; no third-party ad SDKs |

### 23.2 Regulatory map (not legal advice; get counsel before launch)

- **EU (GDPR):** tasks, meds logs and inferences about attention or health can be **special-category (Art. 9) health data**. That requires explicit consent, a DPIA, data minimisation, and data-subject rights (access, deletion, portability). The **EU AI Act**'s transparency obligations (e.g. telling users they're interacting with AI; Art. 50) apply from August 2026. A consumer productivity assistant is otherwise likely *not* high-risk, but avoid any emotion-recognition or health-inference features.
- **UK:** UK GDPR + Data Protection Act 2018 (as amended by the Data (Use and Access) Act 2025); ICO guidance. The Age Appropriate Design Code applies if under-18s are likely to use the app. **[R]** Set 18+ for launch, or build a teen mode separately.
- **India:** Digital Personal Data Protection Act 2023, with **DPDP Rules notified 13 Nov 2025** and phased in: Consent Manager provisions from Nov 2026, most obligations by **13 May 2027** [54]. It requires notice + consent, purpose limitation, deletion, breach notification, and verifiable parental consent for children's data.
- **US:** no federal privacy law, but **FTC Act §5** (deceptive or unfair practices; the FTC has taken enforcement action against health apps sharing sensitive data with advertisers) and the **FTC Health Breach Notification Rule** (covers health apps; amended 2024). State laws include **Washington My Health My Data Act** (broad: covers *inferences* about health from non-health data; requires separate consent and prohibits geofencing near health facilities for certain purposes) [56], CCPA/CPRA "sensitive personal information", and others. COPPA applies if under-13s use it.
- **Medical-device boundary:** the FDA's **General Wellness guidance (updated January 2026)** keeps low-risk wellness products outside device regulation *if claims stay wellness-only* [55]. **[R]** Never claim to "treat", "reduce symptoms of", or "manage" ADHD. Use "helps you remember, start and get places on time". The EU MDR and UK MHRA have similar intended-use logic.
- **Platform policies:** Apple and Google health-data rules (no ads use, clear purpose strings), and the Google Play exact-alarm policy.

### 23.3 Safety design

| Risk | Mitigation |
|---|---|
| **Crisis situations** (self-harm language in Overwhelm or chat) | Classifier + a fixed, reviewed response with localised helplines. No AI counselling. Log nothing beyond the event count. |
| **Dangerous alarms** | Every alarm has a guaranteed stop path (long-press). Mission and movement modes are opt-in, never while a Driving Focus is on, and auto-stop after a max duration. Volume ramps (avoid startling). |
| **Wrong AI parse causes a missed obligation** | Confirmation for dates, money and people; conservative defaults; items never silently dropped. |
| **Notification overload** | Budget, digest, "next good moment", user tiers. |
| **Overdependence** | **[H]** Scaffolding may reduce practice of internal skills. **[I]** But external aids are the *recommended* compensatory strategy in ADHD skills programmes [20][21]. Mitigate with transparency, export, and suggestions that encourage physical-world cues (a door checklist, a tray for keys). Monitor for anxiety when the app is unavailable. |
| **Shame from data** | No failure metrics; no comparisons; the insights language is audited. |
| **Relationship misuse** (partner monitoring) | Delegated features are user-controlled and revocable, show nothing by default, and never expose location. |
| **Comorbidity** (anxiety, depression, autism, dyslexia, OCD) | No clinical claims; overwhelm copy reviewed by a clinician; sensory controls (§24). |
| **Positioning** | Onboarding + About: "Waypoint is a planning and reminder tool. It doesn't diagnose or treat ADHD and isn't a replacement for professional care, medication, or therapy." Plain, once, not scary. |

---

## 24. Accessibility

Target **WCAG 2.2 AA** plus the W3C **COGA** guidance ("Making Content Usable for People with Cognitive and Learning Disabilities").

| Group | Design responses |
|---|---|
| **ADHD / cognitive** | One primary action; ≤3 cards; plain language (≈grade 6–8 reading level); consistent placement; undo everywhere; no timeouts on decisions; no infinite scroll; progress saved automatically |
| **Dyslexia** | Optional Atkinson Hyperlegible/Lexend; ≥17pt; line height ≥1.4; left-aligned; no italics blocks; icons with labels; text-to-speech for all cards |
| **Autism / sensory** | Predictable flows; sensory settings (no confetti, no sounds, low haptics); literal copy option (turns off humour); advance notice of changes ("Reminder style will change tomorrow") |
| **Visual impairment** | Full VoiceOver/TalkBack labels; state never by colour alone (icon + text); contrast ≥4.5:1 (7:1 option); Dynamic Type up to accessibility sizes without truncating the primary action |
| **Motor impairment** | Targets ≥44×44pt; no required gestures (swipe has button alternatives); Switch Control/Voice Control support; mission/movement alarms never mandatory |
| **Hearing impairment** | Every sound cue has a haptic + visual equivalent; flash-on-alarm option; captions for any audio content |
| **Low literacy / non-native speakers** | Voice-first; icons; localisation with native review, not machine translation alone |
| **Reduced motion / vestibular** | Honour the OS setting; static alternatives for the ring and transitions |

Test with ADHD, dyslexic, autistic, and screen-reader users in every design round.

---

## 25. Product roadmap

| Phase | Months | Goals | Exit criteria |
|---|---|---|---|
| **0. Discovery** | 0–1 | 20 interviews (ADHD adults, mixed ages and genders, including India/UK/US); a diary study of lateness, forgetting and restart moments; test clickable prototypes of NOW, Leave and Start | Top-3 moments confirmed; the leave-time concept rated highly useful by ≥60% |
| **1. Alpha** | 2–4 | Build the MVP core; 50 users via TestFlight/Play testing | Reminders fire reliably at 99.9%+; capture takes under 3s; week-2 retention ≥35% |
| **2. Beta** | 4–6 | 500 users; tune the ladder, budget and parse accuracy; accessibility audit | ≥40% of reminders acted on; <5% parse corrections; NPS ≥40 |
| **3. Launch (MVP)** | 6 | US/UK/CA/AU App Store + Play; freemium | Day-30 retention ≥20% (strong for the category) |
| **4. V1** | 6–10 | Waiting, Transition, Stay with me, alarm, calibration, if-then plans | Conversion 4–6% of MAU; Plus churn <6%/mo |
| **5. V2** | 11–18 | Insights UI, friend rooms, household, desktop, India localisation + pricing | Family plan adoption; the India cohort's retention matches the core markets |

---

## 26. Evaluation (measure outcomes, not engagement)

| Outcome | Metric | Note |
|---|---|---|
| Remembering | % of reminders resolved (done/moved/dropped) vs ignored | "Resolved" counts a *decision*, not only done |
| Starting | Starts per week; time from cue to start | |
| On time | % of located events where the user left by the computed leave time (opt-in) | The flagship metric |
| Resuming | % of parked items resumed within 7 days | |
| Burden | Interruptive notifications/day; time in app per day (**lower** can be better) | Guard against engagement-maximising |
| Wellbeing | Optional monthly 3-item check ("felt in control", "less stressed about forgetting") | Never mandatory; never health scales |
| Harm signals | Notification disables, uninstalls after a notification spike, overwhelm-mode frequency trend | |

**[R]** After product-market fit, partner with a university ADHD research group for a **pre-registered randomised evaluation** (e.g. waitlist or active control; outcomes: self-reported EF in daily life, on-time rate, missed-obligation diary). Publish the results whatever they show.

---

## 27. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Novelty cliff: users stop opening the app | High | High | Works when ignored (event cues + widgets); fresh start; value delivered through notifications, not app opens |
| Notification fatigue → user disables notifications | Med | Critical | Budget, digest, per-type controls, "notifications are off" recovery flow |
| AI parse errors break trust | Med | High | Confirmation rules, local fallback, easy edit, parse-accuracy metrics |
| Leave engine misfires (bad location/ETA) | Med | High | Confidence display, "arrived early/late?" feedback, conservative buffer |
| Platform limits (background, alarms, OEM battery killers) | High (Android) | High | Local scheduling, AlarmKit/setAlarmClock, per-OEM guidance, reliability telemetry |
| Platform competition (Apple/Google proactive assistants) | Med–High | High | ADHD-specific depth, tone, trust, speed |
| Privacy incident | Low–Med | Critical | Local-first, E2EE, minimal server data, pen-tests, no ad SDKs |
| Regulatory creep (health claims → medical device) | Low | High | Claims discipline, legal review of marketing copy |
| Overpromising "for ADHD" alienates or stigmatises users | Med | Med | Neurodivergent-led design, community advisory board, co-design |
| Feature creep (this document!) | High | High | The scoring table + "one next thing" as the product's own rule |
| Monetisation vs vulnerability | Med | High | Ethical charter (§19.3) |

---

## 28. Open questions (to validate)

1. **Launch market & platform:** US/UK iOS-first (best surfaces, higher willingness to pay) or India Android-first (founder's home market?, huge scale, low willingness to pay)? This decides the stack priorities.
2. What proportion of target users will grant **calendar** and **location**? Without them the Leave engine weakens, so a manual "I need to leave at…" fallback is needed.
3. Which **time representation** (ring vs bar vs text) best reduces lateness? Run an A/B test.
4. Does **AI presence** ("Stay with me") produce any social-facilitation benefit, or is it just a timer with a face?
5. Right **default notification budget** (4? 6? 8?) and digest times.
6. Do ADHD users prefer **auto-accept with undo** or **explicit confirm** for parsed items? This probably differs by person and could become a learned preference.
7. Is **medication logging** worth the extra compliance burden in the EU at MVP?
8. How to serve **teens** (a large segment) safely? It would need a separate product mode and parental-consent rules.
9. **Brand:** ADHD-explicit ("for ADHD brains") vs neurodivergent-friendly-for-everyone (a larger market; less stigma; risks diluting the focus).
10. Can **estimate-vs-actual feedback** improve estimation over time, or only compensate for it?

---

## 29. The final answer

### 29.1 If I had to build it from scratch today with a small team and limited budget

**Build first (in this order):**

1. **Capture that works in 3 seconds from anywhere** (hold-to-talk widget or control → parsed items → confirmation only when needed). *Why:* it is the entry point for everything, and it relieves working memory from the first minute [22].
2. **Reliable cue engine with event/place triggers and the 3-step ladder** (Do · Smaller · Later-smart · Drop). *Why:* it targets the best-evidenced deficit, time-based prospective memory [8], at the point of performance [1]. It is used daily.
3. **Leave engine with countdown** (Live Activity, prep checklist, calibration after 3 observations). *Why:* it addresses the most costly, most visible failure (lateness) with evidence-aligned design [6][F1][F2]. It produces "wow" moments that drive word of mouth.
4. **Start flow** (size check → one physical step → 2/5/10 timer → "stop here" counts). *Why:* initiation is the daily wall. Mood-repair framing [15] and implementation intentions [18] support small, specific, immediate starts.
5. **Park/Resume.** *Why:* it is cheap to build, it has no real competitor, and it is evidence-aligned [24][26]. It also generates the "Continue" habit loop.

All of this sits on one **NOW** screen with **no-shame, self-cleaning** behaviour and a **strict notification budget**.

**Deliberately NOT build (yet or ever):**

- ❌ Human body-doubling marketplace / stranger rooms (Focusmate owns it; costly moderation). *Integrate instead.*
- ❌ Points, streaks, levels, leaderboards (undermining and shame risks [F10][F11]).
- ❌ Money-based commitment penalties.
- ❌ An in-app stimulation or content feed (it would become the distraction).
- ❌ Mission/movement alarms as a default (no evidence, safety and accessibility risks; opt-in later at most).
- ❌ An insights dashboard in the MVP (privacy risk, low action value early).
- ❌ Auto-scheduling the whole calendar (Motion-style reshuffling destroys trust).
- ❌ Anything that diagnoses, scores symptoms, or claims to treat ADHD.
- ❌ Projects, tags, folders, priorities matrices: the organising-the-app trap.

### 29.2 The single strongest version of the product

> **A calm, voice-first app whose home screen shows only one thing: what matters *right now*. It catches every thought in a breath. It taps you at the moment you can actually act ("when you get home", "leave in 23 min, and I've added your usual 10"). It turns any task into one small physical step with a timer. It always knows exactly where you stopped. It never scolds, it never piles up guilt, and its understanding of *your* timing stays on your phone.**

In one line: **Waypoint closes the gap between intending and doing by cueing you at the right moment, starting you with one step, and remembering where you stopped.** It asks for as little of the user's own executive function as possible.
