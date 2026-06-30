import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env (local dev). In CI the values come from the environment / GitHub Secrets.
dotenv.config();

export const BASE_URL = process.env.BASE_URL ?? 'https://ari.beta.citizenhealth.com';
const isCI = !!process.env.CI;

/**
 * Playwright configuration for the Ari login & signup E2E suite.
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  // Run files in parallel; tests inside a file run sequentially by default.
  fullyParallel: true,

  // Fail the CI build if test.only is accidentally committed.
  forbidOnly: isCI,

  // Retry flaky tests on CI; never locally (so flakiness surfaces immediately).
  retries: isCI ? 2 : 0,

  // Limit workers on CI for stability against a shared beta environment.
  workers: isCI ? 2 : undefined,

  // Hard timeouts keep a hung beta backend from stalling the whole run.
  timeout: 45_000,
  expect: { timeout: 10_000 },

  // Rich reporting: list in the console + HTML report + JUnit for CI dashboards.
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: BASE_URL,

    // Capture artifacts only when something goes wrong — keeps runs fast.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    launchOptions: {
      slowMo: Number(process.env.SLOWMO ?? 0),
    },

    // A health app may be picky about UA / locale; keep these explicit.
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
