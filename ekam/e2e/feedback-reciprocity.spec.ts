import { expect, test } from '@playwright/test';
import { enterAs } from './helpers';

test('Free members cannot view Connection Feedback', async ({ page }) => {
  await enterAs(page, 'Meera');
  await page.goto('/#/profile/rohan/feedback');
  await expect(page.getByText('Viewing Connection Feedback is part of Premium')).toBeVisible();
});

test('Premium with feedback visible can view others who share theirs', async ({ page }) => {
  await enterAs(page, 'Abhishek');
  await page.goto('/#/profile/ananya/feedback');
  await expect(page.getByText('Respect', { exact: true })).toBeVisible();
  await expect(page.getByText(/% positive/).first()).toBeVisible();
  await expect(page.getByText('Your feedback is visible while you view this.')).toBeVisible();
});

test('hiding your own feedback hides everyone else’s; showing it unlocks theirs', async ({ page }) => {
  await enterAs(page, 'Sarah');
  await page.goto('/#/profile/abhishek/feedback');
  await expect(page.getByText(/Your feedback is hidden, so other people’s is hidden from you/)).toBeVisible();

  await page.goto('/#/you/feedback');
  await page.getByRole('switch', { name: 'Off' }).click();
  await page.goto('/#/profile/abhishek/feedback');
  await expect(page.getByText(/% positive/).first()).toBeVisible();
});

test('nobody can view feedback that its owner has hidden', async ({ page }) => {
  await enterAs(page, 'Abhishek');
  await page.goto('/#/profile/sarah/feedback');
  await expect(page.getByText(/Sarah has chosen not to share Connection Feedback/)).toBeVisible();
});
