import { test, expect } from '../../src/fixtures/fixtures.js';
import { canRunFullOtp, credentials } from '../../src/fixtures/test-data.js';

/**
 * Positive signup — the happy path that creates / signs into a REAL account
 * via phone + OTP.
 *
 * ⚠️  SKIPPED BY DEFAULT (validation-only policy: no real accounts/PHI on beta).
 * Enable deliberately on a throwaway environment by setting:
 *   ARI_ALLOW_OTP_FLOW=true, ARI_TEST_PHONE, ARI_TEST_OTP
 */
test.describe('Signup — positive (real account via OTP) @signup @positive @manual', () => {
  test.skip(
    !canRunFullOtp(),
    'Set ARI_ALLOW_OTP_FLOW=true, ARI_TEST_PHONE and ARI_TEST_OTP to run the real signup'
  );

  test('completes the phone + OTP signup steps', async ({ signupPage }) => {
    await signupPage.openSignup();
    const reached = await signupPage.reachPhoneEntry();
    expect(reached, 'should reach the signup phone step').toBeTruthy();

    await signupPage.enterPhone(credentials.testPhone);
    await expect(signupPage.continueButton()).toBeEnabled();
    await signupPage.submitPhone();

    await signupPage.otp.expectVisible();
    await signupPage.otp.enterCode(credentials.testOtp);

    // After a valid code the flow leaves the OTP screen (into profile setup or
    // the app). Tighten this to a real post-signup marker once known.
    await expect
      .poll(async () => signupPage.otp.isVisible(1500), { message: 'should advance past the OTP screen' })
      .toBeFalsy();
  });
});
