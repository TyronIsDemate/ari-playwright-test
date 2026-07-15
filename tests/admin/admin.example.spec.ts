import { test, expect } from '../../src/fixtures/fixtures.js';

/**
 * Admin portal tests (authenticated via the saved Appgate + Google SSO session).
 *
 * Run with:  npm run test:admin   (config: playwright.admin.config.ts)
 * These start ALREADY LOGGED IN using playwright/.auth/admin.json — no SSO here.
 *
 * The first test verifies the saved session still works. The rest are
 * `test.fixme` placeholders — implement them (and flesh out AdminPage) once
 * you've mapped the admin UI. fixme keeps the run green until then.
 */
test.describe('Admin portal @admin @authenticated', () => {
  test('loads the admin portal using the saved session (not bounced to SSO)', async ({ adminPage }) => {
    await adminPage.open();
    expect(
      await adminPage.isAuthenticated(),
      'saved Appgate/Google session should keep us in the admin app — if this fails, re-run `npm run admin:login`'
    ).toBeTruthy();
  });

  test.fixme('shows the admin dashboard heading / primary nav', async ({ adminPage }) => {
    await adminPage.open();
    await expect(adminPage.authenticatedMarker()).toBeVisible();
  });

  test.fixme('can navigate to a key admin section', async ({ adminPage }) => {
    await adminPage.open();
    // e.g. await adminPage.page.getByRole('link', { name: /users/i }).click();
  });
});
