import { test, expect } from '../../src/fixtures/fixtures.js';
import { INVALID_PHONES, VALID_PHONE_DIGITS, VALID_PHONE_FORMATTED } from '../../src/utils/helpers.js';

/**
 * Signup phone-step validation.
 *
 * Unlike login (which DISABLES "Send code"), signup keeps "Continue" enabled and
 * validates ON CLICK — an empty/invalid number surfaces the inline
 * "Please enter a valid phone number" message and keeps you on the step.
 *
 * Validation-only by policy: we only ever click Continue with INVALID input
 * (which never sends an SMS) and never submit a valid number here.
 */

// The intro flow makes each test relatively slow, so we cover a representative
// subset of malformed inputs here; login-validation exercises the full set.
const SIGNUP_INVALID = INVALID_PHONES.filter((p) => ['two digits', 'six digits (incomplete)', 'letters only (rejected by tel input)'].includes(p.label));

test.describe('Signup — phone-step validation @signup @validation', () => {
  test.beforeEach(async ({ signupPage }) => {
    await signupPage.openSignup();
    const reached = await signupPage.reachPhoneEntry();
    test.skip(!reached, 'Could not reach the signup phone step (intro flow may have changed)');
  });

  test('shows the phone prompt and a Continue button', async ({ signupPage }) => {
    expect(await signupPage.hasText(/what'?s your phone number/i)).toBeTruthy();
    await expect(signupPage.continueButton()).toBeVisible();
  });

  test('clicking Continue with an empty number shows the inline error', async ({ signupPage }) => {
    await signupPage.clickContinue();
    await signupPage.expectPhoneValidationError();
    await signupPage.expectStillOnPhoneStep();
  });

  for (const { value, label } of SIGNUP_INVALID) {
    test(`rejects an invalid number on submit — ${label}`, async ({ signupPage }) => {
      await signupPage.enterPhone(value);
      await signupPage.clickContinue();
      await signupPage.expectPhoneValidationError();
      await signupPage.expectStillOnPhoneStep();
    });
  }

  test('accepts a complete valid number (formatted, no inline error)', async ({ signupPage }) => {
    // Do NOT click Continue here — a valid number would send a real SMS.
    await signupPage.enterPhone(VALID_PHONE_DIGITS);
    expect(await signupPage.phoneValue()).toBe(VALID_PHONE_FORMATTED);
    expect(await signupPage.isValidationErrorVisible(), 'no error should show for a valid number').toBeFalsy();
  });

  test('tel input formats digits as (XXX) XXX-XXXX', async ({ signupPage }) => {
    await signupPage.enterPhone(VALID_PHONE_DIGITS);
    expect(await signupPage.phoneValue()).toBe(VALID_PHONE_FORMATTED);
  });
});
