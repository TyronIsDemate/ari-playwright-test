import { test as base, expect } from '@playwright/test';
import { LandingPage } from '../pages/LandingPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { SignupPage } from '../pages/SignupPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { AdminPage } from '../pages/AdminPage.js';

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
  adminPage: AdminPage;
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
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
});

export { expect };
