import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page Object for the authenticated Ari dashboard (post login/signup).
 *
 * ⚠️  SKELETON — fill in the real selectors once the dashboard ships. Tests in
 * `tests/dashboard/` run under the `chromium-authed` project, which loads the
 * saved session from STORAGE_STATE, so `page` is already authenticated.
 *
 * Keep all dashboard selectors here so dashboard regression tests stay readable
 * and resilient. Prefer role/label/text locators, as elsewhere in this suite.
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Where the app lands after auth. Adjust if it's not the root. */
  async open(): Promise<void> {
    await this.goto('/');
  }

  // --- TODO: replace these placeholders with real dashboard locators --------

  /** A stable element only present when logged in (avatar, nav, greeting…). */
  authenticatedMarker(): Locator {
    // e.g. this.page.getByRole('navigation') or a user menu / avatar button.
    return this.page.getByRole('navigation');
  }

  /** The primary heading / greeting on the dashboard. */
  heading(): Locator {
    return this.page.getByRole('heading').first();
  }

  signOutControl(): Locator {
    return this.page.getByRole('button', { name: /sign out|log ?out/i });
  }

  // --- Queries --------------------------------------------------------------

  /**
   * Heuristic that we're authenticated: we're NOT on the phone-login screen.
   * Replace with a positive assertion on `authenticatedMarker()` once known.
   */
  async isAuthenticated(): Promise<boolean> {
    const onLogin = /\/login/.test(this.page.url());
    const hasPhoneLogin = (await this.page.locator('input[type="tel"]').count()) > 0;
    return !onLogin && !hasPhoneLogin;
  }
}
