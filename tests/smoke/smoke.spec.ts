import { test, expect } from '../../src/fixtures/fixtures.js';

/**
 * @smoke — fast confidence checks that the app and its auth entry points load.
 * These run first in CI and gate the heavier suites. No SMS is sent.
 */
test.describe('Smoke @smoke', () => {
  test('landing page loads with tagline and both CTAs', async ({ landingPage, page }) => {
    const response = await page.goto('/');
    expect(response, 'navigation should return a response').toBeTruthy();
    expect(response!.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/Ari/i);
    await expect(landingPage.getStartedButton()).toBeVisible();
    await expect(landingPage.haveAccountButton()).toBeVisible();
    expect(await landingPage.hasText(/teammate for caregiving/i)).toBeTruthy();
  });

  test('terms and privacy links point to citizen.health', async ({ landingPage }) => {
    await landingPage.open();
    await expect(landingPage.termsLink().first()).toHaveAttribute('href', /citizen\.health\/terms/);
    await expect(landingPage.privacyLink().first()).toHaveAttribute('href', /citizen\.health\/privacy/);
  });

  test('login page renders the phone field and Send code button', async ({ loginPage }) => {
    await loginPage.openLogin();
    await expect(loginPage.phoneInput()).toBeVisible();
    await expect(loginPage.sendCodeButton()).toBeVisible();
    expect(await loginPage.hasText(/welcome back|sign in with your phone/i)).toBeTruthy();
  });

  test('"I have an Ari account" navigates to the login screen', async ({ landingPage, loginPage }) => {
    await landingPage.open();
    await landingPage.clickHaveAccount();
    await expect(loginPage.phoneInput()).toBeVisible({ timeout: 15_000 });
    expect(loginPage.url()).toContain('/login');
  });

  test('"Get started" navigates into the signup flow', async ({ landingPage, page }) => {
    await landingPage.open();
    await landingPage.clickGetStarted();
    await expect.poll(() => page.url(), { message: 'should navigate to /signup' }).toContain('/signup');
  });
});
