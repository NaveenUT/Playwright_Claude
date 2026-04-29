import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';

test.describe('Henry Schein - Search', () => {

  test('TC01 - Search with a valid product returns results',
    {
      tag: ['@smoke', '@search', '@regression'],
      annotation: { type: 'feature', description: 'Valid product search returns results' },
    },
    async ({ searchPage }) => {
      await test.step('Search for a valid product', async () => {
        await searchPage.searchFor(TEST_DATA.search.validProduct);
      });
      await test.step('Verify URL contains search param', async () => {
        const url = await searchPage.getCurrentUrl();
        expect(url.toLowerCase()).toContain(TEST_DATA.search.expectedUrlParam);
      });
      await test.step('Verify search results are displayed', async () => {
        const hasResults = await searchPage.hasResults();
        expect(hasResults).toBeTruthy();
      });
    });

  test('TC02 - Enter key on search input keeps page stable',
    {
      tag: ['@regression', '@search'],
      annotation: { type: 'feature', description: 'Enter key search does not crash the page' },
    },
    async ({ searchPage }) => {
      await test.step('Capture URL before search', async () => {
        const urlBefore = await searchPage.getCurrentUrl();
        expect(urlBefore).toBeTruthy();
      });
      await test.step('Search using Enter key', async () => {
        await searchPage.searchWithEnterKey(TEST_DATA.search.validProduct);
      });
      await test.step('Verify search input is still visible', async () => {
        await expect(searchPage.searchInput).toBeVisible();
      });
      await test.step('Verify URL is set after search', async () => {
        const urlAfter = await searchPage.getCurrentUrl();
        expect(urlAfter).toBeTruthy();
      });
    });

  test('TC03 - Empty search navigates to search page without crashing',
    {
      tag: ['@regression', '@search'],
      annotation: { type: 'feature', description: 'Empty search does not crash the page' },
    },
    async ({ searchPage }) => {
      await test.step('Submit empty search', async () => {
        await searchPage.searchWithEmptyInput();
      });
      await test.step('Verify URL contains search param', async () => {
        const url = await searchPage.getCurrentUrl();
        expect(url.toLowerCase()).toContain(TEST_DATA.search.expectedUrlParam);
      });
      await test.step('Verify search input is still visible', async () => {
        await expect(searchPage.searchInput).toBeVisible();
      });
    });

  test('TC04 - Search with special characters does not crash',
    {
      tag: ['@regression', '@search'],
      annotation: { type: 'feature', description: 'Special character search does not crash' },
    },
    async ({ searchPage }) => {
      await test.step('Search with special characters', async () => {
        await searchPage.searchFor(TEST_DATA.search.specialChars);
      });
      await test.step('Verify page URL is valid', async () => {
        const url = await searchPage.getCurrentUrl();
        expect(url).toBeTruthy();
      });
      await test.step('Verify search input is still visible', async () => {
        await expect(searchPage.searchInput).toBeVisible();
      });
    });

});
