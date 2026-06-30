import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { OtpForm } from './OtpForm.js';

/**
 * Page Object for the Ari login screen (`/login`).
 *
 * Verified flow: passwordless phone + OTP.
 *   "Welcome back. Sign in with your phone number."
 *   → tel input "(000) 000-0000" + country selector (🇺🇸 +1) + "Send code"
 *   → 6-digit OTP screen.
 *
 * The "Send code" button is DISABLED until a complete, valid number is entered,
 * which is the primary client-side validation signal (no SMS required to test).
 */
export class LoginPage extends BasePage {
  readonly otp: OtpForm;

  constructor(page: Page) {
    super(page);
    this.otp = new OtpForm(page);
  }

  // --- Locators ------------------------------------------------------------

  phoneInput(): Locator {
    return this.page.locator('input[type="tel"]');
  }

  sendCodeButton(): Locator {
    return this.page.getByRole('button', { name: /send code/i });
  }

  /** Country/dial-code selector trigger (shows the flag + "+1"). */
  countrySelector(): Locator {
    return this.page.getByRole('button', { name: /\+\d/ }).first();
  }

  heading(): Locator {
    return this.page.getByText(/welcome back|sign in with your phone/i);
  }

  // --- Navigation ----------------------------------------------------------

  async openLogin(): Promise<void> {
    await this.goto('/login');
    await this.phoneInput().waitFor({ state: 'visible', timeout: 15_000 });
  }

  // --- Actions -------------------------------------------------------------

  async enterPhone(value: string): Promise<void> {
    const input = this.phoneInput();
    await input.click();
    await input.fill('');
    await input.fill(value);
  }

  /** The masked/formatted value currently shown in the tel input. */
  async phoneValue(): Promise<string> {
    return this.phoneInput().inputValue();
  }

  async isSendCodeEnabled(): Promise<boolean> {
    return this.sendCodeButton().isEnabled();
  }

  /**
   * Submit the phone number to request an OTP. THIS SENDS A REAL SMS — only
   * call from tests gated behind ARI_ALLOW_OTP_FLOW.
   */
  async sendCode(): Promise<void> {
    await this.sendCodeButton().click();
  }

  /** Full passwordless login: phone → code → OTP. Sends an SMS. */
  async loginWithOtp(phone: string, code: string): Promise<void> {
    await this.enterPhone(phone);
    await expect(this.sendCodeButton(), 'Send code should enable for a valid number').toBeEnabled();
    await this.sendCode();
    await this.otp.expectVisible();
    await this.otp.enterCode(code);
  }

  // --- Queries / assertions ------------------------------------------------

  async isLoginFormVisible(): Promise<boolean> {
    return (await this.phoneInput().count()) > 0 && (await this.sendCodeButton().count()) > 0;
  }

  /** Heuristic for a successful login: left /login and the OTP screen is gone. */
  async expectLoggedIn(): Promise<void> {
    await this.page
      .waitForURL((url) => !/\/login/.test(url.toString()), { timeout: 15_000 })
      .catch(() => {});
    const stillOnLogin = /\/login/.test(this.page.url());
    const error = await this.errorText();
    expect(
      !stillOnLogin && error === '',
      `Expected to be logged in. url=${this.page.url()} error="${error}"`
    ).toBeTruthy();
  }
}
