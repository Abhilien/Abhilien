import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function capture(page: Page, text: string) {
  await page.getByLabel('Capture anything').fill(text);
  await page.getByLabel('Capture anything').press('Enter');
}

// Pin the clock to a weekday morning so results never depend on when CI runs
// (e.g. cues are deliberately held during quiet hours at night).
export const FIXED_NOW = new Date('2026-10-01T10:00:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: FIXED_NOW });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('first run shows a friendly empty state and a demo day', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Hi. What’s on your mind?' })).toBeVisible();
  await page.getByRole('button', { name: 'Show me a demo day' }).click();
  await expect(page.getByText('Dentist').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Where was I?' }).or(page.getByText('Pick up where you left off'))).toBeVisible();
  // The demo bill is due tomorrow, so the cue engine raises it straight away.
  await expect(page.getByRole('alert').filter({ hasText: 'Pay electricity bill' })).toBeVisible();
});

test('capture parses a brain dump, asks only what is ambiguous, and files it', async ({ page }) => {
  await capture(page, 'pay electricity bill by the 14th, call mom tomorrow, waiting for refund from Amazon');
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Got 3 things.' })).toBeVisible();
  await expect(sheet.getByText('When tomorrow?')).toBeVisible();
  await sheet.getByRole('button', { name: 'Evening' }).click();
  await sheet.getByRole('button', { name: 'Looks right ✓' }).click();

  await page.getByRole('tab', { name: 'Later' }).click();
  await expect(page.getByText('Pay electricity bill')).toBeVisible();
  await expect(page.getByText('Call mom')).toBeVisible();
  await expect(page.getByText('Refund from Amazon')).toBeVisible();

  // Local-first: it survives a reload.
  await page.reload();
  await page.getByRole('tab', { name: 'Later' }).click();
  await expect(page.getByText('Call mom')).toBeVisible();
});

test('just start → stop here → where was I? → continue', async ({ page }) => {
  await capture(page, 'clean my room');
  await page.getByRole('button', { name: 'Looks right ✓' }).click();
  await page.getByRole('tab', { name: 'Later' }).click();
  await page.getByRole('button', { name: 'Start Clean my room' }).click();

  await page.getByRole('button', { name: "🧱 Can't even" }).click();
  await expect(page.getByText('Put one thing away. Just one.')).toBeVisible();
  await page.getByRole('button', { name: '▶ Start 2 min' }).click();
  await expect(page.getByRole('img', { name: /left/ })).toBeVisible();

  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByText('Nice, you started.')).toBeVisible();
  await page.getByRole('button', { name: 'Stop here ✓' }).click();

  const park = page.getByRole('dialog', { name: /Save your place/ });
  await expect(park.getByLabel('What’s the very next thing you’d do?')).toHaveValue('Throw away one piece of rubbish.');
  await park.getByLabel('Where were you? (optional)').fill('Desk is clear');
  await park.getByRole('button', { name: 'Save my place' }).click();

  await page.getByRole('tab', { name: 'Now' }).click();
  await expect(page.getByText('You stopped at: Desk is clear')).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).first().click();
  await expect(page.getByText('Throw away one piece of rubbish.')).toBeVisible();
});

test('event-based reminders fire on context, and every cue ends in a decision', async ({ page }) => {
  await capture(page, 'when I get home take the chicken out');
  await page.getByRole('button', { name: 'Looks right ✓' }).click();
  await page.getByRole('button', { name: '🏠 I’m home' }).click();

  const cue = page.getByRole('alert').filter({ hasText: 'Take the chicken out' });
  await expect(cue).toBeVisible();
  await cue.getByRole('button', { name: 'Later ▸' }).click();
  await expect(cue.getByRole('button', { name: 'Tomorrow morning' })).toBeVisible();
  await cue.getByRole('button', { name: 'Tomorrow morning' }).click();
  await expect(cue).toBeHidden();
});

test('appointments get a leave-by countdown', async ({ page }) => {
  await capture(page, 'dentist at 6pm, 25 min drive');
  await page.getByRole('button', { name: 'Looks right ✓' }).click();
  await expect(page.getByRole('region', { name: /Dentist/ })).toBeVisible();
  await expect(page.getByText('Free until 5:10pm')).toBeVisible();
  await expect(page.getByText(/leave ~5:30pm/)).toBeVisible();

  // Fast-forward into the getting-ready window: the card takes over with a checklist.
  await page.clock.fastForward('07:12:00'); // 5:12pm: after prep starts (5:10), before "leave soon" (5:20)
  await expect(page.getByText('Start getting ready')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Keys' })).toBeVisible();
});

test('distress switches to one-thing mode instead of making tasks', async ({ page }) => {
  await capture(page, "I'm so behind on everything");
  await page.getByRole('button', { name: 'Yes, help me focus' }).click();
  await expect(page.getByText('Pause. You don’t have to fix everything.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to normal' }).click();
  await expect(page.getByRole('tab', { name: 'Now' })).toBeVisible();
});

test('has no detectable accessibility violations on the main screens', async ({ page }) => {
  // Scan the resting state: mid-fade-in colours would give random contrast results.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Show me a demo day' }).click();
  for (const tab of ['Now', 'Later', 'You']) {
    await page.getByRole('tab', { name: tab }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`), `${tab} tab`).toEqual([]);
  }
});
