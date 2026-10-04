import { defineConfig, devices } from '@playwright/test';

// Locally you can point at an existing Chromium with PW_CHROMIUM_PATH;
// CI installs Playwright's own browser.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  testIgnore: /screenshots\.spec\.ts/,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
