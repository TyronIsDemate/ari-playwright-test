import { test, expect } from '../../src/fixtures/fixtures.js';
import { maliciousInputs } from '../../src/fixtures/test-data.js';

/**
 * Negative signup — malformed / abusive phone input on the signup phone step.
 * Validation-only: clicking Continue with sanitized-to-invalid input surfaces
 * the inline error and never sends an SMS or creates an account.
 */
test.describe('Signup — negative input @signup @negative', () => {
  test.beforeEach(async ({ signupPage }) => {
    await signupPage.openSignup();
    const reached = await signupPage.reachPhoneEntry();
    test.skip(!reached, 'Could not reach the signup phone step (intro flow may have changed)');
  });

  test('SQL-injection-style string is sanitized and rejected on submit', async ({ signupPage }) => {
    await signupPage.enterPhone(maliciousInputs.sqlInjection);
    await signupPage.clickContinue();
    await signupPage.expectPhoneValidationError();
    await signupPage.expectStillOnPhoneStep();
  });

  test('XSS payload is not executed and is rejected on submit', async ({ signupPage, page }) => {
    let dialogFired = false;
    page.on('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss().catch(() => {});
    });
    await signupPage.enterPhone(maliciousInputs.xss);
    await signupPage.clickContinue();
    expect(dialogFired, 'XSS payload must not trigger a JS dialog').toBeFalsy();
    await signupPage.expectPhoneValidationError();
  });

  test('letters-only input is rejected by the tel field', async ({ signupPage }) => {
    await signupPage.enterPhone('abcdefghij');
    expect(await signupPage.phoneValue()).toBe('');
    await signupPage.clickContinue();
    await signupPage.expectPhoneValidationError();
  });

  test('an over-long digit string is capped and does not break the page', async ({ signupPage, page }) => {
    await signupPage.enterPhone(maliciousInputs.longDigits);
    expect((await signupPage.phoneValue()).length).toBeLessThanOrEqual('(999) 999-9999'.length);
    await expect(page.locator('body')).not.toContainText(/stack trace|exception/i);
  });
});
