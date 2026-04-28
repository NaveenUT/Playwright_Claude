import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchPage } from '../pages/SearchPage';
import { ENV_CONFIG } from '../utils/config';

type CustomFixtures = {
  homePage: HomePage;
  searchPage: SearchPage;
};

export const test = base.extend<CustomFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);

    await homePage.navigate(ENV_CONFIG.baseUrl);
    await homePage.acceptCookies();
    await homePage.selectDomain(ENV_CONFIG.domain);
    await homePage.waitForPageLoad();

    await use(homePage);
  },

  searchPage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    const searchPage = new SearchPage(page);

    await homePage.navigate(ENV_CONFIG.baseUrl);
    await homePage.acceptCookies();
    await homePage.selectDomain(ENV_CONFIG.domain);
    await homePage.waitForPageLoad();

    await use(searchPage);
  },
});

export { expect } from '@playwright/test';
