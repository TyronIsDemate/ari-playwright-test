import { test, expect } from '../../src/fixtures/fixtures.js';
import { maliciousInputs } from '../../src/fixtures/test-data.js';

/**
 * Negative login — malformed / abusive phone input must never enable the
 * passwordless flow, and the tel input must sanitize it. No SMS is sent.
 */
test.describe('Login — negative input @login @negative', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.openLogin();
  });

  test('an SQL-injection-style string cannot enable Send code', async ({ loginPage }) => {
    await loginPage.enterPhone(maliciousInputs.sqlInjection);
    // The tel input keeps only digits, so this can never form a valid number.
    await expect(loginPage.sendCodeButton()).toBeDisabled();
  });

  test('an XSS payload is not executed and does not enable Send code', async ({ loginPage, page }) => {
    let dialogFired = false;
    page.on('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss().catch(() => {});
    });
    await loginPage.enterPhone(maliciousInputs.xss);
    await page.waitForTimeout(500);
    expect(dialogFired, 'XSS payload must not trigger a JS dialog').toBeFalsy();
    await expect(loginPage.sendCodeButton()).toBeDisabled();
  });

  test('whitespace / punctuation only stays disabled', async ({ loginPage }) => {
    await loginPage.enterPhone('()   -  ');
    await expect(loginPage.sendCodeButton()).toBeDisabled();
  });

  test('a very long digit string is capped and never breaks the page', async ({ loginPage, page }) => {
    await loginPage.enterPhone(maliciousInputs.longDigits);
    expect((await loginPage.phoneValue()).length, 'value should be capped to the formatted mask').toBeLessThanOrEqual(
      '(999) 999-9999'.length
    );
    await expect(page.locator('body')).not.toContainText(/stack trace|exception|undefined is not/i);
  });

  test('Send code button cannot be submitted while disabled', async ({ loginPage }) => {
    await loginPage.enterPhone('12');
    // force:false click should fail because the control is disabled.
    await expect(loginPage.sendCodeButton()).toBeDisabled();
    let clicked = true;
    await loginPage.sendCodeButton().click({ timeout: 1500 }).catch(() => (clicked = false));
    expect(clicked, 'a disabled Send code button must not be clickable').toBeFalsy();
  });
});
