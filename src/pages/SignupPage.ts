import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage.js';
import { OtpForm } from './OtpForm.js';

/**
 * Page Object for the Ari signup flow (`/signup`).
 *
 * Verified flow:
 *   intro video ("Ari introduction") → "Now it's your turn to meet Ari"
 *   → "Welcome to Ari. What's your phone number?" (tel input + "Continue")
 *   → 6-digit OTP → profile setup.
 *
 * Like login, the phone step's submit button ("Continue") stays DISABLED until
 * a complete, valid number is entered — the SMS-free validation signal.
 */
export class SignupPage extends BasePage {
  readonly otp: OtpForm;

  constructor(page: Page) {
    super(page);
    this.otp = new OtpForm(page);
  }

  // --- Locators ------------------------------------------------------------

  phoneInput(): Locator {
    return this.page.locator('input[type="tel"]');
  }

  /** Submit on the phone step. The app labels it "Continue". */
  continueButton(): Locator {
    return this.page.getByRole('button', { name: /^(continue|next|send code)$/i });
  }

  skipButton(): Locator {
    return this.page.getByRole('button', { name: /skip/i });
  }

  phonePrompt(): Locator {
    return this.page.getByText(/what'?s your phone number/i);
  }

  validPhoneHelper(): Locator {
    return this.page.getByText(/please enter a valid phone number/i);
  }

  // --- Navigation ----------------------------------------------------------

  async openSignup(): Promise<void> {
    await this.goto('/signup');
  }

  /**
   * Advance from the intro video to the phone-entry step. Repeatedly clicks any
   * Skip/Continue control while polling for the tel input. Returns true once the
   * phone step is reached.
   */
  async reachPhoneEntry(timeoutMs = 50_000): Promise<boolean> {
    const maxIterations = Math.ceil(timeoutMs / 2000);
    for (let i = 0; i < maxIterations; i++) {
      if ((await this.phoneInput().count()) > 0 && (await this.phoneInput().first().isVisible())) {
        return true;
      }
      const skip = this.skipButton();
      if ((await skip.count()) > 0) await skip.first().click().catch(() => {});
      const cont = this.page.getByRole('button', { name: /continue|next|get started/i });
      if ((await cont.count()) > 0) await cont.first().click().catch(() => {});
      await this.page.waitForTimeout(2000);
    }
    return (await this.phoneInput().count()) > 0;
  }

  // --- Actions -------------------------------------------------------------

  async enterPhone(value: string): Promise<void> {
    const input = this.phoneInput();
    await input.click();
    await input.fill('');
    await input.fill(value);
  }

  async phoneValue(): Promise<string> {
    return this.phoneInput().inputValue();
  }

  async isContinueEnabled(): Promise<boolean> {
    return this.continueButton().isEnabled();
  }

  /**
   * Click "Continue". NOTE: unlike login's disabled-button gating, signup keeps
   * Continue enabled and validates ON CLICK. Clicking with an INVALID/empty
   * number only surfaces the inline error (no SMS). Clicking with a VALID number
   * sends a real SMS and advances to OTP — so only do that behind a flag.
   */
  async clickContinue(): Promise<void> {
    await this.continueButton().click();
  }

  /** Alias used by the happy-path test for readability. */
  async submitPhone(): Promise<void> {
    await this.clickContinue();
  }

  /** The inline "Please enter a valid phone number" validation message. */
  async expectPhoneValidationError(): Promise<void> {
    await expect(this.validPhoneHelper().first(), 'expected inline phone validation error').toBeVisible({
      timeout: 8000,
    });
  }

  async isValidationErrorVisible(): Promise<boolean> {
    const helper = this.validPhoneHelper();
    return (await helper.count()) > 0 && (await helper.first().isVisible());
  }

  // --- Queries / assertions ------------------------------------------------

  async isOnPhoneStep(): Promise<boolean> {
    return (await this.phoneInput().count()) > 0 && (await this.continueButton().count()) > 0;
  }

  async expectStillOnPhoneStep(): Promise<void> {
    expect(await this.isOnPhoneStep(), 'Expected to remain on the signup phone step').toBeTruthy();
  }
}
