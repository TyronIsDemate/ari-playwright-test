import { test, expect } from '../../src/fixtures/fixtures.js';

/**
 * Dashboard regression tests (authenticated).
 *
 * These run under the `chromium-authed` project, which is only registered when
 * OTP login is configured and which loads the saved session from STORAGE_STATE
 * — so `page` is ALREADY LOGGED IN here. No phone/OTP steps needed per test.
 *
 * The first test is a real, runnable sanity check that the saved session works.
 * The rest are `test.fixme` placeholders: implement them (and flesh out
 * DashboardPage) once the dashboard ships. fixme keeps regression green until then.
 */
test.describe('Dashboard @dashboard @regression @authenticated', () => {
  test('loads authenticated using the saved session (not bounced to login)', async ({ dashboardPage }) => {
    await dashboardPage.open();
    expect(await dashboardPage.isAuthenticated(), 'saved session should keep us logged in').toBeTruthy();
  });

  test.fixme('shows the primary dashboard heading / greeting', async ({ dashboardPage }) => {
    await dashboardPage.open();
    await expect(dashboardPage.heading()).toBeVisible();
    // expect(await dashboardPage.heading().innerText()).toMatch(/your real greeting/i);
  });

  test.fixme('renders the main navigation / key widgets', async ({ dashboardPage }) => {
    await dashboardPage.open();
    await expect(dashboardPage.authenticatedMarker()).toBeVisible();
    // Assert the dashboard's key sections/cards here.
  });

  test.fixme('can sign out and is returned to the login screen', async ({ dashboardPage, page }) => {
    await dashboardPage.open();
    await dashboardPage.signOutControl().click();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });
});
