/**
 * Interactive admin login — you complete Appgate + Google SSO by hand, once.
 *
 * The admin portal sits behind Appgate SDP (zero-trust gateway) and then Google
 * SSO. Both are deliberately hostile to automation, so we DON'T script them:
 * this opens a real headed browser, you log in manually, and it saves the
 * resulting session so the admin tests can reuse it.
 *
 * Run from a machine that is connected to Appgate (so the portal is reachable):
 *   npm run admin:login
 *
 * Notes:
 * - Uses a persistent Chrome profile (playwright/.auth/admin-profile) so Google
 *   is less likely to flag it and so future logins may be remembered.
 * - Saves cookies/localStorage to playwright/.auth/admin.json for `npm run test:admin`.
 *
 * Flags: --no-save
 */
import 'dotenv/config';
import { chromium } from '@playwright/test';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { mkdirSync } from 'node:fs';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'https://ari.beta.ciitizenhealth.net';
const STORAGE_STATE = 'playwright/.auth/admin.json';
const PROFILE_DIR = 'playwright/.auth/admin-profile';
const noSave = process.argv.slice(2).includes('--no-save');

const rl = readline.createInterface({ input, output });

async function describe(page, label) {
  const info = await page.evaluate(() => {
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const buttons = [...document.querySelectorAll('button,[role="button"],a')]
      .filter((e) => e.offsetParent)
      .map((e) => (e.innerText || '').trim())
      .filter(Boolean)
      .slice(0, 20);
    return { text, buttons };
  });
  console.log(`\n──── ${label} | ${page.url()}`);
  console.log(`  text   : ${info.text}`);
  if (info.buttons.length) console.log(`  actions: ${JSON.stringify(info.buttons)}`);
}

async function main() {
  mkdirSync(PROFILE_DIR, { recursive: true });

  console.log('\n▶ Launching a real Chrome window…');
  // Prefer installed Chrome (friendliest to Google SSO); fall back to bundled Chromium.
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      baseURL: ADMIN_BASE_URL,
      viewport: null,
    });
  } catch {
    console.log('  (Chrome channel not found — using bundled Chromium.)');
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      baseURL: ADMIN_BASE_URL,
      viewport: null,
    });
  }

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto('/admin/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await describe(page, 'START');

  console.log(
    '\nIn the browser window, complete EVERYTHING needed to reach the admin portal:\n' +
      '  1. Appgate SDP portal (if shown)\n' +
      '  2. Google SSO sign-in\n' +
      '  3. Any consent / MFA prompts\n' +
      'Wait until the actual admin dashboard is fully loaded.'
  );
  await rl.question('\n⏸  Press Enter here once you are fully logged in to the admin portal… ');

  await describe(page, 'CURRENT SCREEN (paste this to help map the admin UI)');

  if (!noSave) {
    await context.storageState({ path: STORAGE_STATE });
    console.log(`\n💾 Session saved to ${STORAGE_STATE} — run:  npm run test:admin`);
  }
  console.log('\nDone. You can close the browser window.');
  await context.close();
}

main()
  .catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
