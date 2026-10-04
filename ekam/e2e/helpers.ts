import { expect, type Page } from '@playwright/test';

export type Persona = 'Abhishek' | 'Meera' | 'Sarah';

/** Fresh sample data, skip the intro, and enter as a persona. */
export async function enterAs(page: Page, persona: Persona) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: new RegExp(`^${persona}`) }).click();
  await page.getByRole('button', { name: 'Enter ekam' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

export const app = (page: Page) => page.getByRole('main', { name: 'ekam app' });
