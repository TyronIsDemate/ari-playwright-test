import { defineConfig } from '@playwright/test';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

/**
 * LambdaTest cloud grid configuration.
 *
 * Runs the (logged-out) suite across real browsers/OSes on LambdaTest instead of
 * local browsers. Credentials come from the environment — NEVER hard-code them:
 *   LT_USERNAME, LT_ACCESS_KEY   (.env locally, GitHub Secrets in CI)
 *
 * Run with:  npm run test:lambdatest   (i.e. playwright test -c this file)
 */
dotenv.config();

const require = createRequire(import.meta.url);
const playwrightClientVersion: string = require('@playwright/test/package.json').version;

const BASE_URL = process.env.BASE_URL ?? 'https://ari.beta.citizenhealth.com';
const LT_USERNAME = process.env.LT_USERNAME;
const LT_ACCESS_KEY = process.env.LT_ACCESS_KEY;
const BUILD = process.env.LT_BUILD || `Ari E2E ${process.env.GITHUB_RUN_ID ?? 'local'}`;

if (!LT_USERNAME || !LT_ACCESS_KEY) {
  throw new Error(
    'LambdaTest credentials missing. Set LT_USERNAME and LT_ACCESS_KEY (in .env locally or ' +
      'GitHub Secrets in CI) before running the LambdaTest config.'
  );
}

/** Only the logged-out suite runs on the grid here; dashboard needs a session. */
const DASHBOARD_DIR = /[\\/]dashboard[\\/]/;

interface LtTarget {
  project: string;
  browserName: string; // Chrome | MicrosoftEdge | pw-chromium | pw-firefox | pw-webkit
  browserVersion: string;
  platform: string;
}

// Representative cross-browser / cross-OS matrix. Add or trim as needed.
const targets: LtTarget[] = [
  { project: 'lt-chrome-win11', browserName: 'pw-chromium', browserVersion: 'latest', platform: 'Windows 11' },
  { project: 'lt-edge-win11', browserName: 'MicrosoftEdge', browserVersion: 'latest', platform: 'Windows 11' },
  { project: 'lt-firefox-win11', browserName: 'pw-firefox', browserVersion: 'latest', platform: 'Windows 11' },
  { project: 'lt-webkit-macos', browserName: 'pw-webkit', browserVersion: 'latest', platform: 'macOS Sonoma' },
];

function wsEndpoint(target: LtTarget): string {
  const capabilities = {
    browserName: target.browserName,
    browserVersion: target.browserVersion,
    'LT:Options': {
      platform: target.platform,
      build: BUILD,
      name: target.project,
      user: LT_USERNAME,
      accessKey: LT_ACCESS_KEY,
      network: true,
      video: true,
      console: true,
      // Ari's beta is public, so no tunnel needed. Set true (+ start LT tunnel)
      // only when testing a localhost/private URL.
      tunnel: false,
      playwrightClientVersion,
    },
  };
  return `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify(capabilities))}`;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Cap parallel sessions to your LambdaTest plan's concurrency.
  workers: Number(process.env.LT_CONCURRENCY ?? 5),

  timeout: 90_000, // remote grid is slower than local
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit-lambdatest.xml' }],
  ],

  use: {
    baseURL: BASE_URL,
    // Artifacts live in LambdaTest's dashboard (video/network/console above);
    // keep local trace on retry for convenience.
    trace: 'on-first-retry',
  },

  projects: targets.map((t) => ({
    name: t.project,
    testIgnore: DASHBOARD_DIR,
    use: {
      connectOptions: {
        wsEndpoint: wsEndpoint(t),
      },
    },
  })),
});
