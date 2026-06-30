import { test as base, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { SignupPage } from '../pages/SignupPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';

/**
 * Custom fixtures injecting ready-to-use page objects into every test.
 *
 *   test('...', async ({ loginPage }) => { await loginPage.openLogin(); });
 */
type Pages = {
  landingPage: LandingPage;
  loginPage: LoginPage;
  signupPage: SignupPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Pages>({
  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect };
