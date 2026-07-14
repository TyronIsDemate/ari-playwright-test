/**
 * Interactive OTP signup/login — you type the SMS code in the terminal.
 *
 * DEFAULT = SIGNUP flow (what you regress). Pass --login for the login flow.
 *
 * A headless browser can't read an SMS, so this runs a HEADED browser, enters a
 * phone number, requests the code, then PAUSES for you to type the 6-digit OTP.
 * For signup it pauses again so you can complete any onboarding steps by hand,
 * then saves the authenticated session for dashboard-test reuse.
 *
 * Usage (in your VS Code terminal):
 *   npm run signup:interactive              # signup, phone from ARI_TEST_PHONE or prompt
 *   node scripts/interactive-otp.mjs 6282105982
 *   node scripts/interactive-otp.mjs --login          # login instead of signup
 *
 * Flags: --login | --headless | --no-save
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
const isLogin = args.includes('--login'); // default is signup
const headless = args.includes('--headless');
const noSave = args.includes('--no-save');
const phoneArg = args.find((a) => /^\+?[\d()\-\s]{7,}$/.test(a));

const rl = readline.createInterface({ input, output });

/** Print a compact summary of what's currently on screen (helps map new steps). */
async function describe(page, label) {
  const info = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const inputs = [...document.querySelectorAll('input,textarea,select')]
      .filter(vis)
      .map((e) => ({ type: e.getAttribute('type'), placeholder: e.getAttribute('placeholder'), name: e.getAttribute('name') }));
    const buttons = [...document.querySelectorAll('button,[role="button"]')]
      .filter(vis)
      .map((e) => (e.innerText || '').trim().slice(0, 30))
      .filter(Boolean);
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    return { inputs, buttons, text };
  });
  console.log(`\n──── ${label} | ${page.url()}`);
  console.log(`  text   : ${info.text}`);
  if (info.inputs.length) console.log(`  inputs : ${JSON.stringify(info.inputs)}`);
  if (info.buttons.length) console.log(`  buttons: ${JSON.stringify(info.buttons)}`);
}

async function main() {
  let phoneDigits = (phoneArg || process.env.ARI_TEST_PHONE || '').replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    phoneDigits = (await rl.question('Enter the test phone number (US, 10 digits): ')).replace(/\D/g, '');
  }
  if (phoneDigits.length < 10) throw new Error(`"${phoneDigits}" is not a valid 10-digit US number.`);

  const flow = isLogin ? 'login' : 'signup';
  console.log(`\n▶ Launching browser — ${flow} flow…`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const phoneInput = page.locator('input[type="tel"]');

  if (isLogin) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  } else {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    // Advance through the intro video to the phone step.
    for (let i = 0; i < 25 && !(await phoneInput.count()); i++) {
      await page.getByRole('button', { name: /skip|continue|next|get started/i }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  await phoneInput.first().waitFor({ state: 'visible', timeout: 20_000 });
  await phoneInput.first().fill(phoneDigits);
  console.log(`▶ Phone entered as ${await phoneInput.first().inputValue()}`);

  await page.getByRole('button', { name: isLogin ? /send code/i : /^continue$/i }).first().click();
  console.log('▶ Code requested — check your phone.');

  const boxes = page.locator('input[inputmode="numeric"][maxlength="1"]');
  await boxes.first().waitFor({ state: 'visible', timeout: 20_000 });

  // --- Pause #1: type the OTP ---
  const code = (await rl.question('\n⌨  Enter the 6-digit OTP you received: ')).replace(/\D/g, '');
  const n = await boxes.count();
  for (let i = 0; i < n && i < code.length; i++) await boxes.nth(i).fill(code[i]);
  console.log('▶ Code submitted, verifying…');

  const verified = await page
    .waitForFunction(() => !document.querySelector('input[inputmode="numeric"][maxlength="1"]'), null, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!verified) {
    await describe(page, 'STILL ON CODE SCREEN');
    throw new Error('OTP not accepted — see the screen summary above.');
  }
  console.log('✅ OTP verified.');
  await describe(page, isLogin ? 'AFTER LOGIN' : 'AFTER OTP (onboarding starts here)');

  // --- Pause #2 (signup): finish onboarding by hand, then save ---
  if (!isLogin) {
    console.log(
      '\nComplete any remaining signup/onboarding steps in the browser window.\n' +
        '(Copy the screen summaries above/below to me and I can automate these steps.)'
    );
    await rl.question('\n⏸  Press Enter here once signup is fully complete to save the session… ');
    await describe(page, 'FINAL STATE');
  }

  if (!noSave) {
    mkdirSync(dirname(STORAGE_STATE), { recursive: true });
    await context.storageState({ path: STORAGE_STATE });
    console.log(`\n💾 Session saved to ${STORAGE_STATE} — dashboard tests can now reuse it.`);
  }
  console.log('\nDone. You can close the browser window.');
  await browser.close();
}

main()
  .catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
