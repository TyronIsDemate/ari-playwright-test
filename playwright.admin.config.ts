import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

/**
 * Admin portal (ari.beta.ciitizenhealth.net/admin) test config.
 *
 * The admin app is behind Appgate SDP + Google SSO, so we NEVER script the
 * login. Instead you authenticate once with `npm run admin:login`, which saves
 * the session below; these tests reuse it. Run this config on a machine that is
 * connected to Appgate.
 *
 *   npm run test:admin
 */
dotenv.config();

export const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'https://ari.beta.ciitizenhealth.net';
export const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json';

if (!existsSync(ADMIN_STORAGE_STATE)) {
  throw new Error(
    `No admin session found at ${ADMIN_STORAGE_STATE}. Run \`npm run admin:login\` first ` +
      '(on an Appgate-connected machine) to sign in once and save the session.'
  );
}

export default defineConfig({
  testDir: './tests/admin',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  timeout: 60_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit-admin.xml' }],
  ],

  use: {
    baseURL: ADMIN_BASE_URL,
    storageState: ADMIN_STORAGE_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30_000,
  },

  projects: [{ name: 'admin-chromium', use: { ...devices['Desktop Chrome'] } }],
});
