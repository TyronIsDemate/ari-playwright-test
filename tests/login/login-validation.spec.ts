import { test, expect } from '../../src/fixtures/fixtures.js';
import { INVALID_PHONES, VALID_PHONE_DIGITS, VALID_PHONE_FORMATTED } from '../../src/utils/helpers.js';

/**
 * Login phone-field validation.
 *
 * Ari gates the "Send code" button on a complete, valid phone number, so we can
 * verify all validation WITHOUT sending any SMS — by asserting the button's
 * enabled/disabled state and the tel input's formatting mask.
 */
test.describe('Login — phone validation @login @validation', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.openLogin();
  });

  test('Send code is disabled on an empty form', async ({ loginPage }) => {
    await expect(loginPage.sendCodeButton()).toBeDisabled();
  });

  // Data-driven: every incomplete/invalid number must keep submission disabled.
  for (const { value, label } of INVALID_PHONES) {
    test(`Send code stays disabled — ${label}`, async ({ loginPage }) => {
      if (value) await loginPage.enterPhone(value);
      await expect(loginPage.sendCodeButton(), `"${value}" must not enable Send code`).toBeDisabled();
    });
  }

  test('Send code enables once a complete valid number is entered', async ({ loginPage }) => {
    await loginPage.enterPhone(VALID_PHONE_DIGITS);
    await expect(loginPage.sendCodeButton()).toBeEnabled();
  });

  test('tel input formats digits as (XXX) XXX-XXXX', async ({ loginPage }) => {
    await loginPage.enterPhone(VALID_PHONE_DIGITS);
    expect(await loginPage.phoneValue()).toBe(VALID_PHONE_FORMATTED);
  });

  test('partial entry is masked progressively and stays disabled', async ({ loginPage }) => {
    await loginPage.enterPhone('201555');
    expect(await loginPage.phoneValue()).toBe('(201) 555');
    await expect(loginPage.sendCodeButton()).toBeDisabled();
  });

  test('letters are rejected by the tel input', async ({ loginPage }) => {
    await loginPage.enterPhone('abcdefghij');
    expect(await loginPage.phoneValue()).toBe('');
    await expect(loginPage.sendCodeButton()).toBeDisabled();
  });

  test('excess digits are truncated to a 10-digit national number', async ({ loginPage }) => {
    await loginPage.enterPhone('99999999999999');
    expect(await loginPage.phoneValue()).toBe('(999) 999-9999');
    await expect(loginPage.sendCodeButton()).toBeEnabled();
  });

  test('correcting an invalid number flips the button to enabled', async ({ loginPage }) => {
    await loginPage.enterPhone('12');
    await expect(loginPage.sendCodeButton()).toBeDisabled();
    await loginPage.enterPhone(VALID_PHONE_DIGITS);
    await expect(loginPage.sendCodeButton()).toBeEnabled();
  });
});
