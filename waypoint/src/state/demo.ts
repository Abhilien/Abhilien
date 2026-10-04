// Demo data, generated relative to "now" so the app always looks alive when
// someone opens it for the first time (e.g. from a portfolio link).

import { freshLedger } from '../core/cues';
import { HOUR, MIN } from '../core/dates';
import { itemFromParsed } from '../core/items';
import { parseCapture } from '../core/parser';
import type { AppState } from './store';
import { DEFAULT_SETTINGS } from './store';

export function demoState(now: Date): AppState {
  const t = now.getTime();
  const parsed = parseCapture(
    [
      'pay electricity bill by tomorrow',
      'reply to the landlord about the lease',
      'when I get home take the chicken out',
      'ask Rahul about the car',
      'waiting for refund from Amazon',
      'buy toothpaste',
      'book a haircut',
      'clean my room',
    ].join(', '),
    now,
  ).items;

  const items = parsed.map((p, i) => itemFromParsed(p, now, `demo_${i}`));
  // The landlord reply has been sliding for a while.
  const landlord = items.find((i) => i.title.startsWith('Reply to the landlord'));
  if (landlord) landlord.postponeCount = 3;

  // Round the appointment to a nice time ~2.5h from now.
  const start = new Date(t + 2.5 * HOUR);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);

  return {
    version: 1,
    items,
    parks: [
      {
        id: 'demo_park',
        itemId: null,
        title: 'Quarterly presentation',
        nextAction: "Find Company X's 2025 revenue",
        where: 'Slide 7, competitor analysis',
        createdAt: t - 20 * HOUR,
      },
    ],
    events: [
      {
        id: 'demo_event',
        title: 'Dentist',
        startAt: start.getTime(),
        travelMin: 25,
        prepMin: 20,
        bufferMin: 5,
        checklist: [
          { text: 'Phone', done: false },
          { text: 'Keys', done: false },
          { text: 'Wallet', done: false },
          { text: 'Insurance card', done: false },
        ],
      },
    ],
    sessions: [],
    // Past observations: usually leaves ~10 minutes after the plan.
    lags: [12, 8, 10, 9, 14],
    ledger: freshLedger(now),
    inbox: [],
    settings: DEFAULT_SETTINGS,
    lastOpenAt: t - 5 * MIN,
    overwhelmUntil: null,
    welcomeBackDays: null,
  };
}
