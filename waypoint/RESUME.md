# Resume material for Waypoint

## Project entry (pick the version that fits your layout)

**Waypoint: ADHD-focused productivity PWA** · TypeScript, React 19, Vite, Vitest, Playwright · [Live demo](#) · [GitHub](#)

- Designed and built a local-first progressive web app that turns free-form "brain dumps" into scheduled, context-triggered reminders using a rule-based natural-language parser (dates, deadlines, places, people, money; ambiguity resolved with one-tap questions).
- Engineered a deterministic reminder engine with escalating strategies, a daily interruption budget, per-item caps and quiet hours, so excess reminders become a digest instead of spam.
- Built a "leave-by" countdown that learns each user's typical lateness from past departures (median with small-sample shrinkage) and explains every adjustment it makes.
- Wrote 79 unit tests and 14 end-to-end tests across mobile and desktop, with a pinned browser clock for deterministic time-based tests and automated WCAG 2.2 AA accessibility scans (axe-core), all run in GitHub Actions CI with automatic deployment to GitHub Pages.
- Grounded product decisions in a ~25,000-word research and design document: peer-reviewed ADHD research (prospective memory, time perception, procrastination), analysis of more than 15 competitor products, and an MVP spec with acceptance criteria.

### Short version (2 bullets)

- Built **Waypoint**, a local-first React/TypeScript PWA for people with ADHD: natural-language capture, adaptive context-triggered reminders, a leave-by countdown that learns personal lateness, and "where was I?" task resumption.
- 93 automated tests (Vitest + Playwright, incl. axe accessibility scans) in CI with GitHub Pages deployment; product decisions grounded in a cited research document.

## Before you put it on your resume

1. **Make the links real.** Merge to `main`, enable GitHub Pages (Settings → Pages → Source: GitHub Actions), and paste the live URL above. Ideally move it to its own repository (e.g. `github.com/<you>/waypoint`), since this repo doubles as your GitHub profile page.
2. **Know it well enough to explain it.** Interviewers will ask "how does X work?" and "what would you change?". Read `src/core/` first; it is the interesting part. Good things to be able to explain:
   - why the reminder engine is deterministic rather than AI-driven;
   - how `useStore` avoids render loops (selector results cached per state version);
   - why the end-to-end tests pin the clock;
   - the lateness formula in `lateCorrection()` and why it shrinks toward zero.
3. **Be upfront about how it was made** if asked. It's increasingly common, and normal, to build with AI assistance. What matters is that you understand the code, can extend it, and made the product decisions.

## Talking points for interviews

- **Product judgement:** cut features the research didn't support (mission alarms, streaks and points), and why every reminder must end in a decision.
- **Trade-offs:** a web app can't wake a closed tab, so the core is platform-independent and ready to drive native notifications later.
- **Testing:** the tone test that fails the build if any reminder text contains shaming language.
- **Accessibility:** automated axe checks caught a real bug. Reminder pop-ups covered the navigation bar, so I moved them into the page flow.
