// Offline first-step library for the Start flow (Part 3 §8.4).
// The rule: give ONE physical step, sized to how heavy the task feels.
// The next step is only shown when asked for.

import type { Size } from './types';

export const START_MINUTES: Record<Size, number> = { fine: 10, heavy: 5, cant: 2 };
export const TIMER_CHOICES = [2, 5, 10, 15, 25] as const;

interface Recipe {
  match: RegExp;
  /** Steps, smallest first. The first step for 'cant' is index 0. */
  steps: string[];
}

const RECIPES: Recipe[] = [
  {
    match: /\b(clean|tidy|declutter)\b.*\b(room|bedroom|desk|house|flat|apartment|kitchen)\b|\bmess\b/i,
    steps: [
      'Put one thing away. Just one.',
      'Throw away one piece of rubbish.',
      'Put all the clothes in one pile.',
      'Clear one surface: a table, a chair or the desk.',
      'Set a 10-minute timer and keep going until it rings.',
    ],
  },
  {
    match: /\b(laundry|washing)\b/i,
    steps: ['Pick up one item of clothing.', 'Carry the basket to the machine.', 'Load it and press start.', 'Set a reminder for when it finishes.'],
  },
  {
    match: /\b(dishes|washing up)\b/i,
    steps: ['Run the hot water.', 'Wash three things.', 'Wash everything with a handle.', 'Empty the sink.'],
  },
  {
    match: /\b(tax|taxes|tax return)\b/i,
    steps: [
      "Find where your tax stuff lives. Don't open anything yet.",
      'Open the folder or email with your tax documents.',
      'Find your income statement.',
      'Write down the one number you need first.',
      'Open the tax website and log in.',
    ],
  },
  {
    match: /\b(inbox|emails?)\b/i,
    steps: [
      'Open your inbox. Read nothing yet.',
      'Archive five emails you obviously don’t need.',
      'Reply to the shortest one.',
      'Flag the one you are avoiding most.',
    ],
  },
  {
    match: /\b(reply|respond|write back)\b/i,
    steps: ['Open the message.', 'Write one sentence. It can be bad.', 'Add a greeting and sign-off.', 'Press send.'],
  },
  {
    match: /\b(call|ring|phone)\b/i,
    steps: ['Find the number and put it on screen.', 'Write the one thing you need to say.', 'Press call.'],
  },
  {
    match: /\b(application|apply|form)\b/i,
    steps: ['Open the application page.', 'Fill in the easiest field.', 'List the documents it asks for.', 'Do the next empty section.'],
  },
  {
    match: /\b(presentation|slides|deck|report|essay|write|writing|document|doc)\b/i,
    steps: [
      'Open the file. That’s it.',
      'Write the title of the next section.',
      'Write one rough sentence under it.',
      'Keep going until the timer rings.',
    ],
  },
  {
    match: /\b(study|revise|homework|read)\b/i,
    steps: ['Put the book or notes in front of you.', 'Read one page or one slide.', 'Write one line about what it said.'],
  },
  {
    match: /\b(exercise|workout|gym|run|walk|yoga|stretch)\b/i,
    steps: ['Put on your shoes.', 'Step outside or onto the mat.', 'Move for two minutes. Any movement counts.'],
  },
  {
    match: /\b(pay|bill|rent|renew|book|cancel)\b/i,
    steps: ['Open the website or app you need.', 'Log in.', 'Do the one thing and confirm.'],
  },
];

function genericSteps(title: string): string[] {
  const t = title.trim().replace(/[.!]+$/, '');
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  return [
    `Get the first thing you need for "${lower}" in front of you.`,
    `Open or set up whatever "${lower}" needs.`,
    `Do the smallest visible part of "${lower}".`,
    'Keep going until the timer rings.',
  ];
}

export function stepsFor(title: string): string[] {
  return RECIPES.find((r) => r.match.test(title))?.steps ?? genericSteps(title);
}

/** First step for a given size. Heavier feelings start earlier in the list. */
export function firstStep(title: string, size: Size): { text: string; index: number } {
  const steps = stepsFor(title);
  const index = size === 'cant' ? 0 : size === 'heavy' ? Math.min(1, steps.length - 1) : Math.min(2, steps.length - 1);
  return { text: steps[index] ?? steps[0] ?? title, index };
}

export function nextStep(title: string, index: number): { text: string; index: number } | null {
  const steps = stepsFor(title);
  const next = index + 1;
  return next < steps.length ? { text: steps[next] ?? '', index: next } : null;
}
