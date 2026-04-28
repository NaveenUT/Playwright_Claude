import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';

test.describe('Henry Schein - UK Medical Homepage', () => {

  test('TC01 - Page title contains Henry Schein',
    { tag: ['@smoke', '@homepage', '@regression'] },
    async ({ homePage }) => {
      const title = await homePage.getTitle();
      expect(title).toContain(TEST_DATA.homePage.title);
    });

  test('TC02 - Search bar is visible and has correct placeholder',
    { tag: ['@smoke', '@homepage', '@regression'] },
    async ({ homePage }) => {
      await expect(homePage.searchInput).toBeVisible();
      await expect(homePage.searchInput).toHaveAttribute(
        'placeholder',
        TEST_DATA.homePage.searchPlaceholder
      );
    });

  test('TC03 - Sign In link is visible in header',
    { tag: ['@smoke', '@homepage', '@regression'] },
    async ({ homePage }) => {
      await expect(homePage.signInLink).toBeVisible();
    });

  test('TC04 - Sign Up link is visible in header',
    { tag: ['@smoke', '@homepage', '@regression'] },
    async ({ homePage }) => {
      await expect(homePage.signUpLink).toBeVisible();
    });

  test('TC05 - All navigation links are visible',
    { tag: ['@smoke', '@homepage', '@regression'] },
    async ({ homePage }) => {
      for (const linkName of TEST_DATA.homePage.navLinks) {
        await expect(homePage.getNavLink(linkName)).toBeVisible();
      }
    });

  test('TC06 - Cart icon is visible in header',
    { tag: ['@smoke', '@homepage', '@regression'] },
    async ({ homePage }) => {
      await expect(homePage.cartIcon).toBeVisible();
    });

});
