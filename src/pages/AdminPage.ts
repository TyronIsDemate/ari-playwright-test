import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page Object for the Ari admin portal (ari.beta.ciitizenhealth.net/admin).
 *
 * ⚠️  SKELETON — fill in real selectors once you've reached the admin dashboard
 * (paste the screen summary from `npm run admin:login`). Tests run under the
 * `playwright.admin.config.ts` config, which loads the saved Appgate+Google SSO
 * session, so `page` is already authenticated.
 */
export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/admin/');
  }

  // --- TODO: replace with real admin selectors -----------------------------

  /** A stable element only present once inside the admin app (nav, header…). */
  authenticatedMarker(): Locator {
    return this.page.getByRole('navigation');
  }

  heading(): Locator {
    return this.page.getByRole('heading').first();
  }

  // --- Queries --------------------------------------------------------------

  /**
   * Heuristic that the saved session still works: we're on the admin host and
   * NOT bounced to the Appgate portal or Google sign-in. Replace with a positive
   * marker once known.
   */
  async isAuthenticated(): Promise<boolean> {
    const url = this.page.url();
    const bouncedToSso = /accounts\.google\.com|port\.ciitizenhealth\.net|appgate/i.test(url);
    const onAdmin = /\/admin/i.test(url);
    return onAdmin && !bouncedToSso;
  }
}
