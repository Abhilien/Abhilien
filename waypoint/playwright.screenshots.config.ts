import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Regenerates the README screenshots: `npm run screenshots`.
export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: /screenshots\.spec\.ts/,
  retries: 0,
  projects: [{ name: 'screens', use: { ...devices['Pixel 7'], launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined } } }],
});
