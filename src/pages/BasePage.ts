import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behavior for all page objects.
 *
 * Selector philosophy: prefer user-facing, semantic locators (role, label,
 * placeholder, text). Ari's auth UI is verified against the live app, so the
 * concrete page objects use confirmed selectors with light fallbacks.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  url(): string {
    return this.page.url();
  }

  /** Collapsed, trimmed visible text of the page body. */
  async bodyText(): Promise<string> {
    return (await this.page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }

  /** Whether the given pattern appears anywhere in the visible body text. */
  async hasText(pattern: RegExp): Promise<boolean> {
    return pattern.test(await this.bodyText());
  }

  /**
   * Visible error / validation text shown to the user. Covers role="alert",
   * aria-live regions, conventional error classes, and Ari's inline helper
   * copy (e.g. "Please enter a valid phone number"). Returns '' when none.
   */
  async errorText(): Promise<string> {
    const candidates: Locator[] = [
      this.page.getByRole('alert'),
      this.page.locator('[aria-live="assertive"], [aria-live="polite"]'),
      this.page.locator(
        '.error, .errorMessage, .error-message, .form-error, .field-error, [class*="error" i], [data-testid*="error" i]'
      ),
      this.page.getByText(/please enter a valid|invalid|incorrect|try again|expired|too many/i),
    ];
    const parts: string[] = [];
    for (const c of candidates) {
      const count = await c.count();
      for (let i = 0; i < count; i++) {
        const el = c.nth(i);
        if (await el.isVisible().catch(() => false)) {
          const t = (await el.innerText().catch(() => '')).trim();
          if (t) parts.push(t);
        }
      }
    }
    return [...new Set(parts)].join(' | ');
  }

  /** Assert that some validation/error feedback became visible. */
  async expectAnyError(): Promise<void> {
    await expect
      .poll(async () => (await this.errorText()).length, {
        message: 'Expected a visible validation/error message to appear',
        timeout: 8000,
      })
      .toBeGreaterThan(0);
  }
}
