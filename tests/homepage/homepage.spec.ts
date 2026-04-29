import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';

test.describe('Henry Schein - Homepage', () => {

  test('TC01 - Page title contains Henry Schein',
    {
      tag: ['@smoke', '@homepage', '@regression'],
      annotation: { type: 'feature', description: 'Page title validation' },
    },
    async ({ homePage }) => {
      await test.step('Get page title', async () => {
        const title = await homePage.getTitle();
        expect(title).toContain(TEST_DATA.homePage.title);
      });
    });

  test('TC02 - Search bar is visible and has correct placeholder',
    {
      tag: ['@smoke', '@homepage', '@regression'],
      annotation: { type: 'feature', description: 'Search bar UI validation' },
    },
    async ({ homePage }) => {
      await test.step('Verify search input is visible', async () => {
        await expect(homePage.searchInput).toBeVisible();
      });
      await test.step('Verify search input placeholder text', async () => {
        await expect(homePage.searchInput).toHaveAttribute(
          'placeholder',
          TEST_DATA.homePage.searchPlaceholder
        );
      });
    });

  test('TC03 - Sign In link is visible in header',
    {
      tag: ['@smoke', '@homepage', '@regression'],
      annotation: { type: 'feature', description: 'Header Sign In link validation' },
    },
    async ({ homePage }) => {
      await test.step('Verify Sign In link is visible', async () => {
        await expect(homePage.signInLink).toBeVisible();
      });
    });

  test('TC04 - Sign Up link is visible in header',
    {
      tag: ['@smoke', '@homepage', '@regression'],
      annotation: { type: 'feature', description: 'Header Sign Up link validation' },
    },
    async ({ homePage }) => {
      await test.step('Verify Sign Up link is visible', async () => {
        await expect(homePage.signUpLink).toBeVisible();
      });
    });

  test('TC05 - All navigation links are visible',
    {
      tag: ['@smoke', '@homepage', '@regression'],
      annotation: { type: 'feature', description: 'Navigation bar links validation' },
    },
    async ({ homePage }) => {
      for (const linkName of TEST_DATA.homePage.navLinks) {
        await test.step(`Verify "${linkName}" nav link is visible`, async () => {
          await expect(homePage.getNavLink(linkName)).toBeVisible();
        });
      }
    });

  test('TC06 - Cart icon is visible in header',
    {
      tag: ['@smoke', '@homepage', '@regression'],
      annotation: { type: 'feature', description: 'Header cart icon validation' },
    },
    async ({ homePage }) => {
      await test.step('Verify cart icon is visible', async () => {
        await expect(homePage.cartIcon).toBeVisible();
      });
    });

});
