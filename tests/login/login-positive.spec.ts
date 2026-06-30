import { test } from '../../src/fixtures/fixtures.js';
import { canRunFullOtp, credentials } from '../../src/fixtures/test-data.js';

/**
 * Positive login — the passwordless happy path.
 *
 * Requires:
 *   ARI_ALLOW_OTP_FLOW=true   (permits sending an SMS)
 *   ARI_TEST_PHONE            (a dedicated test number)
 *   ARI_TEST_OTP              (a static code your beta accepts for that number)
 *
 * Without a way to retrieve the SMS code headlessly, a static test-number code
 * is the only way to automate this — so the test skips unless all three are set.
 * (Alternatively, wire an SMS-retrieval provider into OtpForm.enterCode.)
 */
test.describe('Login — positive (happy path) @login @positive @manual', () => {
  test.skip(
    !canRunFullOtp(),
    'Set ARI_ALLOW_OTP_FLOW=true, ARI_TEST_PHONE and ARI_TEST_OTP to enable the happy-path login'
  );

  test('logs in successfully with a valid phone and OTP code', async ({ loginPage }) => {
    await loginPage.openLogin();
    await loginPage.loginWithOtp(credentials.testPhone, credentials.testOtp);
    await loginPage.expectLoggedIn();
  });
});
