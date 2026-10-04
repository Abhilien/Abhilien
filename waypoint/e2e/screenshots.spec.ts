import { test, type Page } from '@playwright/test';

const OUT = 'docs/screenshots';

async function setup(page: Page, time: string, scheme: 'light' | 'dark' = 'light') {
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date(time) });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Show me a demo day' }).click();
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}/${name}.png` });

test('home', async ({ page }) => {
  await setup(page, '2026-10-01T15:10:00');
  await shot(page, '01-now');
});

test('leave countdown', async ({ page }) => {
  await setup(page, '2026-10-01T15:10:00');
  await page.clock.fastForward('02:12:00');
  await page.getByRole('checkbox', { name: 'Phone' }).check();
  await shot(page, '02-leave');
});

test('capture', async ({ page }) => {
  await setup(page, '2026-10-01T10:00:00');
  await page.getByRole('button', { name: 'Dismiss' }).first().click();
  await page.getByLabel('Capture anything').fill(
    "pay rent by the 14th, call mom tomorrow, tomorrow morning remind me to take the documents because I'm going to the office, ask Rahul about the car",
  );
  await page.getByLabel('Capture anything').press('Enter');
  await shot(page, '03-capture');
});

test('start flow', async ({ page }) => {
  await setup(page, '2026-10-01T10:00:00');
  await page.getByRole('tab', { name: 'Later' }).click();
  await page.getByRole('button', { name: 'Start Clean my room' }).click();
  await shot(page, '04-size');
  await page.getByRole('button', { name: "🧱 Can't even" }).click();
  await page.getByRole('button', { name: '▶ Start 2 min' }).click();
  await page.clock.fastForward('00:00:47');
  await shot(page, '05-timer');
});

test('later and you (dark)', async ({ page }) => {
  await setup(page, '2026-10-01T10:00:00', 'dark');
  await page.getByRole('tab', { name: 'Later' }).click();
  await shot(page, '06-later-dark');
  await page.getByRole('tab', { name: 'You' }).click();
  await shot(page, '07-you-dark');
});

test('overwhelm', async ({ page }) => {
  await setup(page, '2026-10-01T10:00:00');
  await page.getByRole('button', { name: /overwhelmed/ }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await shot(page, '08-overwhelm');
});
