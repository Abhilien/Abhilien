import { expect, test } from '@playwright/test';
import { app, enterAs } from './helpers';

test('onboarding explains the model in four short steps', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'You don’t need a thousand matches.' })).toBeVisible();
  await page.getByRole('button', { name: /How it works/ }).click();
  for (const step of ['Like many people', 'Mutual interest waits', 'Give your attention to one', 'Stay discoverable', 'Change with care']) {
    await expect(page.getByText(step, { exact: true })).toBeVisible();
  }
});

test('home shows one Primary per kind and the waiting lists', async ({ page }) => {
  await enterAs(page, 'Abhishek');
  await expect(app(page).getByRole('heading', { name: 'Your attention is with Ananya.' })).toBeVisible();
  await expect(app(page).getByText('4 romantic mutual interests')).toBeVisible();
  await expect(app(page).getByText('3 friendship mutual interests')).toBeVisible();
});

test('mutual interest joins the waiting list when the Primary is taken', async ({ page }) => {
  await enterAs(page, 'Abhishek');
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  // Kavya has already chosen Abhishek in the sample data and leads today's set.
  await expect(page.locator('.hero-caption')).toContainText('Kavya');
  await page.getByRole('button', { name: 'I’m interested' }).click();
  const sheet = page.getByRole('dialog', { name: 'Interest' });
  await expect(sheet.getByRole('heading', { name: 'Mutual interest with Kavya' })).toBeVisible();
  await expect(sheet).toContainText('Kavya joins your waiting list');
  await sheet.getByRole('button', { name: 'View waiting list' }).click();
  await expect(app(page).getByText('Romantic waiting · 5')).toBeVisible();
});

test('the daily selection ends instead of refilling', async ({ page }) => {
  await enterAs(page, 'Meera');
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  const pass = page.getByRole('button', { name: 'Pass' });
  await expect(pass).toBeVisible();
  while (await pass.isVisible()) await pass.click();
  await expect(page.getByRole('heading', { name: 'That’s everyone for today' })).toBeVisible();
});

test('a Free member with an open slot can begin a Primary and chat', async ({ page }) => {
  await enterAs(page, 'Meera');
  await page.getByRole('link', { name: 'Connections', exact: true }).click();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page).toHaveURL(/#\/chat\/c_rohan$/);
  await page.getByLabel('Message Rohan').fill('Hi Rohan! How are the tomatoes?');
  await page.keyboard.press('Enter');
  await expect(page.locator('.bubble.me')).toHaveText('Hi Rohan! How are the tomatoes?');
  await expect(page.locator('.bubble.them')).toHaveCount(1, { timeout: 5_000 });
});
