import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchPage } from '../pages/SearchPage';

type CustomFixtures = {
  homePage: HomePage;
  searchPage: SearchPage;
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
});

export { expect } from '@playwright/test';
