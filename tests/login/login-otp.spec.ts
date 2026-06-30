import { test, expect } from '../../src/fixtures/fixtures.js';
import { canSendCode, fictionalPhone, wrongOtp } from '../../src/fixtures/test-data.js';

/**
 * Login OTP-screen behavior. These tests CLICK "Send code", which triggers a
 * real SMS send, so the whole describe is opt-in via ARI_ALLOW_OTP_FLOW=true
 * and uses fictional 555-01XX numbers so no real subscriber is messaged.
 */
test.describe('Login — OTP screen @login @otp', () => {
  test.skip(!canSendCode(), 'Set ARI_ALLOW_OTP_FLOW=true to run OTP-screen tests (sends SMS)');

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.openLogin();
  });

  test('valid phone + Send code advances to the 6-digit OTP screen', async ({ loginPage }) => {
    await loginPage.enterPhone(fictionalPhone());
    await loginPage.sendCode();
    await loginPage.otp.expectVisible();
    expect(await loginPage.otp.boxCount(), 'should render 6 single-digit boxes').toBe(6);
    expect(await loginPage.hasText(/enter the \d-digit code/i)).toBeTruthy();
  });

  test('OTP screen shows a resend control / countdown', async ({ loginPage }) => {
    await loginPage.enterPhone(fictionalPhone());
    await loginPage.sendCode();
    await loginPage.otp.expectVisible();
    await expect(loginPage.otp.resendControl().first()).toBeVisible();
  });

  test('an incorrect OTP code is rejected and does not log in', async ({ loginPage, page }) => {
    await loginPage.enterPhone(fictionalPhone());
    await loginPage.sendCode();
    await loginPage.otp.expectVisible();
    await loginPage.otp.enterCode(wrongOtp);
    // Either an error appears or we simply stay on the OTP screen (not logged in).
    await page.waitForTimeout(2500);
    const error = await loginPage.errorText();
    const stillOtp = await loginPage.otp.isVisible(2000);
    expect(error.length > 0 || stillOtp, 'wrong code must not authenticate').toBeTruthy();
    expect(loginPage.url()).toContain('/login');
  });
});
