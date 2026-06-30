import { Page, Locator, expect } from '@playwright/test';

/**
 * The 6-digit OTP entry screen shared by the login and signup flows.
 * Verified markup: six single-digit boxes (input[inputmode="numeric"]
 * [maxlength="1"]) plus a hidden composite input[autocomplete="one-time-code"],
 * heading "Enter the 6-digit code sent to your phone", and a
 * "Didn't get it? Resend in NNs" control.
 */
export class OtpForm {
  constructor(private readonly page: Page) {}

  digitBoxes(): Locator {
    return this.page.locator('input[inputmode="numeric"][maxlength="1"]');
  }

  compositeInput(): Locator {
    return this.page.locator('input[autocomplete="one-time-code"]');
  }

  resendControl(): Locator {
    return this.page.getByText(/resend/i);
  }

  heading(): Locator {
    return this.page.getByText(/enter the \d-digit code/i);
  }

  /** True once the OTP screen is showing (the digit boxes are present). */
  async isVisible(timeout = 8000): Promise<boolean> {
    try {
      await this.digitBoxes().first().waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async boxCount(): Promise<number> {
    return this.digitBoxes().count();
  }

  /** Type a code (one digit per box). Pads/truncates to the number of boxes. */
  async enterCode(code: string): Promise<void> {
    const boxes = this.digitBoxes();
    const n = await boxes.count();
    const digits = code.replace(/\D/g, '').slice(0, n).padEnd(n, '');
    for (let i = 0; i < n; i++) {
      if (digits[i]) await boxes.nth(i).fill(digits[i]);
    }
  }

  async expectVisible(): Promise<void> {
    expect(await this.isVisible(), 'Expected the 6-digit OTP screen to be visible').toBeTruthy();
  }
}
