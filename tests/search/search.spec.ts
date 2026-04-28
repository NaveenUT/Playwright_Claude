import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';

test.describe('Henry Schein - UK Medical Search', () => {

  test('TC01 - Search with a valid product returns results',
    { tag: ['@smoke', '@search', '@regression'] },
    async ({ searchPage }) => {
      await searchPage.searchFor(TEST_DATA.search.validProduct);
      const url = await searchPage.getCurrentUrl();
      expect(url.toLowerCase()).toContain(TEST_DATA.search.expectedUrlParam);
      const hasResults = await searchPage.hasResults();
      expect(hasResults).toBeTruthy();
    });

  test('TC02 - Enter key on search input keeps page stable',
    { tag: ['@regression', '@search'] },
    async ({ searchPage }) => {
      const urlBefore = await searchPage.getCurrentUrl();
      await searchPage.searchWithEnterKey(TEST_DATA.search.validProduct);
      await expect(searchPage.searchInput).toBeVisible();
      const urlAfter = await searchPage.getCurrentUrl();
      expect(urlAfter).toBeTruthy();
      expect(urlBefore).toBeTruthy();
    });

  test('TC03 - Empty search navigates to search page without crashing',
    { tag: ['@regression', '@search'] },
    async ({ searchPage }) => {
      await searchPage.searchWithEmptyInput();
      const url = await searchPage.getCurrentUrl();
      expect(url.toLowerCase()).toContain(TEST_DATA.search.expectedUrlParam);
      await expect(searchPage.searchInput).toBeVisible();
    });

  test('TC04 - Search with special characters does not crash',
    { tag: ['@regression', '@search'] },
    async ({ searchPage }) => {
      await searchPage.searchFor(TEST_DATA.search.specialChars);
      const url = await searchPage.getCurrentUrl();
      expect(url).toBeTruthy();
      await expect(searchPage.searchInput).toBeVisible();
    });

});
