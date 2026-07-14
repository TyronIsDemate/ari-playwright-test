/**
 * Interactive OTP login — you type the SMS code in the terminal.
 *
 * A headless browser can't read an SMS, so this script runs a HEADED browser,
 * enters a phone number, requests the code, then PAUSES for you to type the
 * 6-digit OTP you receive. On success it saves the authenticated session so the
 * dashboard tests can reuse it (npm run test:dashboard) without re-doing OTP.
 *
 * Usage (in your VS Code terminal):
 *   node scripts/interactive-login.mjs                 # prompts for the phone
 *   node scripts/interactive-login.mjs 2015551234      # phone as an argument
 *   ARI_TEST_PHONE=2015551234 node scripts/interactive-login.mjs
 *
 * Flags:
 *   --headless     run without a visible window (you still type the code)
 *   --no-save      don't write the session file
 *   --signup       use the /signup flow instead of /login
 */
import 'dotenv/config';
import { chromium } from '@playwright/test';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'https://ari.beta.citizenhealth.com';
const STORAGE_STATE = 'playwright/.auth/user.json';

const args = process.argv.slice(2);
const headless = args.includes('--headless');
const noSave = args.includes('--no-save');
const isSignup = args.includes('--signup');
const phoneArg = args.find((a) => /^\+?[\d()\-\s]{7,}$/.test(a));

const rl = readline.createInterface({ input, output });

async function main() {
  let phoneDigits = (phoneArg || process.env.ARI_TEST_PHONE || '').replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    const answer = await rl.question('Enter the test phone number (US, 10 digits): ');
    phoneDigits = answer.replace(/\D/g, '');
  }
  if (phoneDigits.length < 10) {
    throw new Error(`"${phoneDigits}" is not a valid 10-digit US number.`);
  }

  console.log(`\n▶ Launching browser and opening ${isSignup ? 'signup' : 'login'}…`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  const phoneInput = page.locator('input[type="tel"]');

  if (isSignup) {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    // Advance through the intro to the phone step.
    for (let i = 0; i < 25 && !(await phoneInput.count()); i++) {
      await page.getByRole('button', { name: /skip|continue|next|get started/i }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  } else {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  await phoneInput.first().waitFor({ state: 'visible', timeout: 20_000 });
  await phoneInput.first().fill(phoneDigits);
  console.log(`▶ Phone entered as ${await phoneInput.first().inputValue()}`);

  const submit = page.getByRole('button', { name: isSignup ? /^continue$/i : /send code/i });
  await submit.first().click();
  console.log('▶ Code requested — check your phone.');

  // Wait for the OTP screen (6 single-digit boxes).
  const boxes = page.locator('input[inputmode="numeric"][maxlength="1"]');
  await boxes.first().waitFor({ state: 'visible', timeout: 20_000 });

  // --- The pause: you type the code here ---
  const code = (await rl.question('\n⌨  Enter the 6-digit OTP you received: ')).replace(/\D/g, '');
  const n = await boxes.count();
  for (let i = 0; i < n && i < code.length; i++) {
    await boxes.nth(i).fill(code[i]);
  }
  console.log('▶ Code submitted, verifying…');

  // Success = we leave the login/signup screen (no OTP boxes remain).
  const ok = await page
    .waitForFunction(() => !document.querySelector('input[inputmode="numeric"][maxlength="1"]'), null, {
      timeout: 20_000,
    })
    .then(() => true)
    .catch(() => false);

  if (!ok) {
    const bodyText = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`Login did not complete (still on the code screen). Page said: "${bodyText}"`);
  }

  console.log(`\n✅ Logged in! Landed on: ${page.url()}`);

  if (!noSave) {
    mkdirSync(dirname(STORAGE_STATE), { recursive: true });
    await context.storageState({ path: STORAGE_STATE });
    console.log(`💾 Session saved to ${STORAGE_STATE} — dashboard tests can now reuse it.`);
  }

  await browser.close();
}

main()
  .catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
