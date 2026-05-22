import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchPage } from '../pages/SearchPage';
import { LoginPage } from '../pages/LoginPage';
import { AccountDashboardPage } from '../pages/accountDashboard';
import { CartPage } from '../pages/CartPage';

type CustomFixtures = {
  homePage: HomePage;
  searchPage: SearchPage;
  loginPage: LoginPage;
  accountDashboardPage: AccountDashboardPage;
  cartPage: CartPage;
};

export const test = base.extend<CustomFixtures>({
  homePage: async ({ page }, use) => {
    const p = new HomePage(page);
    await p.setup();
    await use(p);
  },

  searchPage: async ({ page }, use) => {
    const p = new SearchPage(page);
    await p.setup();
    await use(p);
  },

  loginPage: async ({ page }, use) => {
    const p = new LoginPage(page);
    await p.setup();
    await use(p);
  },

  accountDashboardPage: async ({ page }, use) => {
    const p = new AccountDashboardPage(page);
    await p.setup();
    await use(p);
  },

  cartPage: async ({ page }, use) => {
    const p = new CartPage(page);
    await p.setup();
    await use(p);
  },
});

export { expect } from '@playwright/test';
