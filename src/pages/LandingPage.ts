import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page Object for the Ari marketing/landing page at "/".
 * Verified content: tagline "Meet Ari, your new teammate for caregiving",
 * a "Get started" CTA (→ signup) and an "I have an Ari account" CTA (→ login),
 * plus terms-of-service / privacy-policy links.
 */
export class LandingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getStartedButton(): Locator {
    return this.page.getByRole('button', { name: /get started/i }).first();
  }

  haveAccountButton(): Locator {
    return this.page.getByRole('button', { name: /i have an ari account/i }).first();
  }

  termsLink(): Locator {
    return this.page.getByRole('link', { name: /terms of service/i });
  }

  privacyLink(): Locator {
    return this.page.getByRole('link', { name: /privacy policy/i });
  }

  async open(): Promise<void> {
    await this.goto('/');
  }

  async clickGetStarted(): Promise<void> {
    await this.getStartedButton().click();
  }

  async clickHaveAccount(): Promise<void> {
    await this.haveAccountButton().click();
  }
}
