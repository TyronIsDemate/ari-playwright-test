import { test, expect } from '../../src/fixtures/fixtures.js';
import { canRunFullOtp, credentials, resolveOtp } from '../../src/fixtures/test-data.js';

/**
 * Positive login — the passwordless happy path.
 *
 * Requires:
 *   ARI_ALLOW_OTP_FLOW=true   (permits sending an SMS)
 *   ARI_TEST_PHONE            (a dedicated test number)
 *   and a way to obtain the code:
 *     • ARI_TEST_OTP (static code for a whitelisted number), OR
 *     • TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (ARI_TEST_PHONE is a Twilio number)
 *
 * Skips unless all of the above are configured.
 */
test.describe('Login — positive (happy path) @login @positive @manual', () => {
  test.skip(
    !canRunFullOtp(),
    'Set ARI_ALLOW_OTP_FLOW=true, ARI_TEST_PHONE and a code source (ARI_TEST_OTP or Twilio) to enable'
  );

  test('logs in successfully with a valid phone and OTP code', async ({ loginPage }) => {
    await loginPage.openLogin();
    await loginPage.enterPhone(credentials.testPhone);
    await expect(loginPage.sendCodeButton()).toBeEnabled();

    const sentAt = Date.now();
    await loginPage.sendCode();
    await loginPage.otp.expectVisible();

    const code = await resolveOtp(sentAt);
    await loginPage.otp.enterCode(code);
    await loginPage.expectLoggedIn();
  });
});
