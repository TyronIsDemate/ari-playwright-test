import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup, expect } from '../../src/fixtures/fixtures.js';
import { STORAGE_STATE } from '../../playwright.config.js';
import { canRunFullOtp, credentials, resolveOtp } from '../../src/fixtures/test-data.js';

/**
 * Authentication setup — runs ONCE before the authenticated (dashboard) project
 * and saves the logged-in session to STORAGE_STATE. Dashboard regression tests
 * then start already authenticated, without repeating the OTP flow per test.
 *
 * This project is only registered when OTP login is configured (see
 * playwright.config.ts), so it never runs — or fails — in the default suite.
 */
setup('authenticate via phone + OTP', async ({ loginPage, page }) => {
  expect(canRunFullOtp(), 'OTP login must be configured for the authenticated project').toBeTruthy();

  await loginPage.openLogin();
  await loginPage.enterPhone(credentials.testPhone);
  await expect(loginPage.sendCodeButton()).toBeEnabled();

  const sentAt = Date.now();
  await loginPage.sendCode();
  await loginPage.otp.expectVisible();

  const code = await resolveOtp(sentAt);
  await loginPage.otp.enterCode(code);
  await loginPage.expectLoggedIn();

  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
