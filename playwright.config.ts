import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

// Load .env (local dev). In CI the values come from the environment / GitHub Secrets.
dotenv.config();

export const BASE_URL = process.env.BASE_URL ?? 'https://ari.beta.citizenhealth.com';
const isCI = !!process.env.CI;

/** Saved authenticated session, produced by tests/setup/auth.setup.ts. */
export const STORAGE_STATE = 'playwright/.auth/user.json';

/**
 * Whether a full OTP login can be performed (so the authenticated/dashboard
 * projects are worth wiring up). Mirrors canRunFullOtp() in test-data.ts but is
 * inlined here to keep the config free of test-only imports.
 */
const otpConfigured =
  process.env.ARI_ALLOW_OTP_FLOW === 'true' &&
  !!process.env.ARI_TEST_PHONE &&
  (!!process.env.ARI_TEST_OTP || (!!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN));

// Logged-out (public) projects — run the smoke/login/signup specs and explicitly
// ignore the dashboard, which requires authentication.
const DASHBOARD_DIR = /[\\/]dashboard[\\/]/;
const publicProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: DASHBOARD_DIR },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: DASHBOARD_DIR },
  { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: DASHBOARD_DIR },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testIgnore: DASHBOARD_DIR },
  { name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testIgnore: DASHBOARD_DIR },
];

// Island Enterprise Browser (Chromium-based) — driven via its executable path.
// Activated only when ISLAND_EXECUTABLE points at the Island binary, e.g.
//   ISLAND_EXECUTABLE="C:\\Program Files\\Island\\Island\\Application\\Island.exe"
// Runs non-headless because enterprise browsers generally don't support headless.
const islandExecutable = process.env.ISLAND_EXECUTABLE;
const islandProjects = islandExecutable
  ? [
      {
        name: 'island',
        testIgnore: DASHBOARD_DIR,
        use: {
          browserName: 'chromium' as const,
          launchOptions: {
            executablePath: islandExecutable,
            headless: false,
            slowMo: Number(process.env.SLOWMO ?? 0),
          },
        },
      },
    ]
  : [];

// Authenticated projects for the dashboard suite. Two ways to get a session:
//   1. OTP retriever configured → the `setup` project logs in automatically.
//   2. `node scripts/interactive-login.mjs` → a saved session file already exists.
// The authenticated project is registered if either is available, so the default
// suite never references a missing storage-state file.
const hasSavedSession = existsSync(STORAGE_STATE);
const authProjects =
  otpConfigured || hasSavedSession
    ? [
        // `setup` only makes sense with an automated retriever.
        ...(otpConfigured ? [{ name: 'setup', testMatch: /.*\.setup\.ts/ }] : []),
        {
          name: 'chromium-authed',
          use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
          testMatch: DASHBOARD_DIR,
          // Depend on `setup` only when it's registered; otherwise reuse the
          // session saved by the interactive-login script.
          ...(otpConfigured ? { dependencies: ['setup'] } : {}),
        },
      ]
    : [];

/**
 * Playwright configuration for the Ari E2E / regression suite.
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,

  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [...authProjects, ...islandProjects, ...publicProjects],
});
