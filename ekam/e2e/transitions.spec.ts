import { expect, test } from '@playwright/test';
import { app, enterAs } from './helpers';

test('changing Primary requires closing the current one respectfully, then feedback', async ({ page }) => {
  await enterAs(page, 'Abhishek');
  await page.goto('/#/connections?kind=romantic&change=1&to=c_riya');
  const sheet = page.getByRole('dialog', { name: 'Change Primary' });
  await expect(sheet.getByRole('heading', { name: 'What would you like to do with Ananya?' })).toBeVisible();
  await sheet.getByRole('radio', { name: /Close connection/ }).click();
  await sheet.getByRole('button', { name: 'Continue to closure' }).click();

  await page.getByRole('radio', { name: /long-term goals don't align/ }).click();
  await page.getByLabel(/A few words for Ananya/).fill('I loved our calls. Wishing you the very best.');
  await page.getByRole('button', { name: 'Close connection', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'How was your experience with Ananya?' })).toBeVisible();
  await page.getByRole('button', { name: /Respectful/ }).click();
  await page.getByRole('button', { name: 'Share feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to your new Primary' }).click();

  await expect(page).toHaveURL(/#\/chat\/c_riya$/);
  await expect(page.locator('.msg-system').first()).toContainText('Primary');
});

test('a romantic connection can move to friendship', async ({ page }) => {
  await enterAs(page, 'Abhishek');
  await page.goto('/#/chat/c_ananya');
  await page.getByRole('button', { name: 'Connection options' }).click();
  await page.getByRole('button', { name: 'Move to friendship' }).click();
  await page.getByRole('button', { name: 'Ask Ananya' }).click();
  await expect(page.getByText('Ananya also chose friendship.')).toBeVisible({ timeout: 5_000 });

  await page.goto('/#/connections?kind=friendship');
  // Rahul holds the friendship slot, so Ananya waits — marked as once romantic.
  await expect(app(page).getByText('Once romantic').first()).toBeVisible();
  await page.goto('/#/');
  await expect(app(page).getByRole('heading', { name: 'Your romantic Primary is open.' })).toBeVisible();
});

test('a failed network shows a retryable error', async ({ page }) => {
  await enterAs(page, 'Abhishek');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ekam.state')!);
    localStorage.setItem('ekam.state', JSON.stringify({ ...s, offline: true, day: 3 }));
  });
  await page.goto('/#/discover');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'We couldn’t load today’s selection' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
