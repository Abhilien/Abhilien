# Part 2: Existing product landscape, community research, unmet needs

## 4. Landscape: what exists and what it leaves unsolved

Prices are as of September 2026 (USD unless noted) and change often [45]–[52]. **"EF burden"** is our judgement of how much executive function the product itself demands: setup, maintenance, and decisions.

### 4.1 ADHD / neurodivergent-first products

| Product | Core concept | Strengths | Weaknesses / complaints | EF burden | Price |
|---|---|---|---|---|---|
| **Tiimo** | Visual timeline planner for neurodivergent users, now with AI planning. **iPhone App of the Year 2025** [45] | Beautiful, calm visual time; the countdown makes time visible; strong ND brand credibility | Still a *planner*: you must build the day. Some users drop it when life goes off-script. Subscription-only | Medium | $12/mo or $54/yr [45] |
| **Structured** | Timeline day planner | Fast, clean; time as blocks; generous free tier; very popular | Built for planning, not *starting* or *resuming*; weak on adaptive reminders | Low–Med | Pro ≈ $2.99/mo, $9.99/yr, $29.99 lifetime [49] |
| **Finch** | Self-care virtual pet; goals feed the pet | Excellent warmth and no shame; emotional hook; huge retention for a wellness app | Gamified self-care, not a task or executive-function tool. The pet can become the goal | Low | Free; Plus ≈ $9.99/mo or $69.99/yr [46] |
| **Goblin Tools** | Single-purpose AI tools: Magic ToDo (breaks tasks down with a "spiciness" level), Formalizer, Estimator, Judge | Brilliantly low-friction; one job per tool; the spiciness slider is a great UX idea; free on web | No memory, no reminders, no time. A tool, not a system | Very low | Web free; app ≈ $3.99 one-time [50] |
| **Routinery** | Step-by-step guided routines with timers | Good for mornings; plays steps one at a time | Aggressive paywall complaints; routines break when life varies; little behavioural grounding [52] | Medium | Subscription/lifetime, varies [52] |
| **Llama Life** | One-task-at-a-time countdown list | Built on focusing on the current task; timers per task | Manual; no capture intelligence or reminders | Low–Med | ≈ $6/mo or $39/yr [51] |
| **Focusmate** | Scheduled 25/50/75-min video co-working with strangers | The **most validated body-doubling product in practice**; real accountability | Requires scheduling ahead; camera anxiety; not always available at the moment you need it | Low | 3 free sessions/week; Plus ≈ $8–12/mo [47] |
| **Inflow, Numo, neurolist, and others** | ADHD coaching/CBT content, community, AI planners | Psychoeducation; community | Content-heavy; the tasks side is thin | Varies | Subscriptions |

### 4.2 General productivity products

| Product | What it does well | What ADHD users struggle with | EF burden |
|---|---|---|---|
| **Todoist / TickTick** | Excellent natural-language date parsing ("every other Tue"); fast capture; cross-platform | The list becomes a guilt wall. Overdue items pile up. Filing, projects and labels invite endless system-tinkering | Med–High |
| **Apple Reminders / Google Tasks / Microsoft To Do** | Free, built-in, location reminders (Apple), Siri/Assistant capture | Fire-once reminders are easy to swipe away forever; no escalation, no breakdown, no context | Low (but low value) |
| **Due** | **Auto-snooze nagging** until marked done; very fast entry | Nagging is the same message every time, and can be anxiety-inducing | Low |
| **Sunsama** | Guided daily planning ritual, realistic workload | Requires a daily planning session, the exact habit that fails first; $20–25/mo [48] | High |
| **Motion / Reclaim** | AI auto-scheduling into calendar gaps | The calendar reshuffles constantly, so the user loses trust and the sense of control. Expensive ($19–49/mo [48]). Built for knowledge workers | Med (low input, but high monitoring) |
| **Notion** | Unlimited flexibility | The perfect hyperfocus trap: people build systems instead of doing tasks **[Q]** | Very high |
| **Forest** | Gamified phone abstinence (tree dies if you leave) | Simple, visual; a mild commitment device | Loss-framed; focus only | Low |
| **Alarmy** | "Mission" alarms (photo, steps, math, shake, QR) | Works for some heavy sleepers | Harsh; can create a stressful wake-up; some users uninstall or find workarounds **[Q]** | Low |
| **ChatGPT / Claude / Gemini (general assistants)** | Break down tasks, draft awkward emails, talk through overwhelm | **No proactive timing.** Must be prompted; no OS presence at the right moment; memory not tied to calendar or location; limited reminders | Low per use, but the user must remember to open it |
| **Google Maps / Apple Maps "time to leave"** | Real travel time | Ignores *your* getting-ready time and *your* lateness pattern | None |

### 4.3 What the landscape tells us

1. **Nearly every product assumes the user will come to the app.** Planners require a planning ritual. Lists require review. Chat requires prompting. **[I]** Given weak time-based remembering [8], the *app coming to the user at the right moment* is the underserved half.
2. **Visual time (Tiimo, Structured) is validated by the market**. Tiimo's award and adoption are real signals. But it is used for *planning* the day, not for *executing transitions* ("leave in 23") with personal calibration.
3. **Task breakdown (Goblin Tools) is validated and becoming a commodity.** Any LLM does it. **[R]** Breakdown is table stakes. The differentiating part is *giving one step at a time, at the right time, with a timer*.
4. **Nagging works but hurts (Due).** Nobody does *adaptive* escalation: changing *strategy*, not just repeating.
5. **Body doubling works in practice (Focusmate) but needs scheduling.** There is a gap for *on-demand, low-stakes* presence.
6. **"Where was I?" and "Waiting Room" are essentially unaddressed** by consumer apps.
7. **Almost all of these tools make the user do the maintenance**: overdue piles, archiving, re-planning.

---

## 5. Community and review research (qualitative)

Sources: public app-store reviews, Reddit (r/ADHD, r/adhdwomen, r/ADHD_Programmers), ADDitude comments, and practitioner blogs, as surfaced in searches. **These are [Q] product signals, not evidence of prevalence.** The quotes below are paraphrased patterns, not verbatim.

| Pattern | Typical phrasing (paraphrased) | Implication |
|---|---|---|
| **Setup abandonment** | "Spent a whole weekend setting up Notion, used it for 4 days" / "Tried 4 apps this month, each for 5 minutes" (a common story, e.g. a PM with ADHD describing an "app graveyard") | Setup must be optional; value on first capture |
| **Guilt pile** | "Opened my to-do app and saw 63 overdue tasks and closed it" | No overdue counters; automatic decay and fresh start |
| **Swipe-away reminders** | "I dismiss the notification and it's gone forever" | Reminders need a memory: re-surface smartly |
| **Nag fatigue** | "Due works until I start ignoring it" | Change strategy; offer one-tap exits |
| **Paywall rage** | "Features moved behind paywall after I'd built my routines" (Routinery reviews [52]) | Never paywall the user's own data or core safety features |
| **Novelty cliff** | "Works great for 2 weeks then I stop opening it" | Design for re-entry, not just retention; the product must work even when ignored for a while |
| **Wants proactivity** | "I wish something would just tell me what to do next" / "I need someone to tap me on the shoulder" | "What now?" + point-of-performance cues |
| **Body doubling works** | "Focusmate is the only thing that gets me through admin" | Offer presence; low-stakes versions |
| **Time is invisible** | "Visual timers are the only thing that works" | Countdown-first time display |
| **Mornings** | "I snooze 9 alarms" / "Alarmy made me hate mornings" | Humane wake plus better evenings |
| **Doesn't want to be infantilised** | "Cartoon mascots and confetti feel like a kids' app" | Adult, calm, lightly playful tone |
| **Voice** | "I capture by voice memo but never listen back" | Voice must be *transcribed and actioned*, not just stored |

---

## 6. Unmet needs (synthesis)

Ranked by our judgement of size of gap × ADHD relevance × feasibility:

1. **Cues at the point of performance, in personal time.** Leave-time with *my* prep time; event-based triggers instead of clock times.
2. **Reminders that adapt instead of repeat**, and that end in a decision (do, shrink, move, drop) rather than a dismissal.
3. **Starting help that is emotionally small**, available in one tap from the lock screen.
4. **Context restoration** after interruptions and across days.
5. **Zero-maintenance capture**: speak or type, no filing, sensible defaults, easy correction.
6. **Guilt-free re-entry** after days or weeks away.
7. **Tracking things you're waiting on** without compulsive checking.
8. **On-demand, low-stakes presence** (body doubling without scheduling).
9. **Protecting life anchors during hyperfocus** (meals, meds, sleep, appointments).
10. **Admin and communication debt**: the replies, calls and forms that quietly cost money and relationships.
