import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';

const BASE_URL = process.env.BASE_URL ?? 'https://www.henryschein.co.uk';

/** Removes blocking overlays (domain modal + consent managers) via JS, then dismisses cookie banner */
async function dismissOverlays(page: import('@playwright/test').Page) {
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    document.querySelectorAll('ngb-modal-window, ngb-modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    ['usercentrics-root', 'uc-center-container', 'uc-backdrop'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('[id*="usercentrics"], [class*="usercentrics"]')
      .forEach(el => (el as HTMLElement).style.display = 'none');
  }).catch(() => {});

  await page.waitForTimeout(300);

  const cookieBtn = page.locator('#onetrust-accept-btn-handler').first();
  if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieBtn.click();
    await page.waitForTimeout(300);
  }
}

/** Clicks the hamburger menu if it is visible (force bypasses residual overlay) */
async function openMobileMenuIfNeeded(page: import('@playwright/test').Page) {
  const hamburger = page.locator(`img[alt="${TEST_DATA.mobile.hamburgerAlt}"]`).first();
  if (await hamburger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hamburger.click({ force: true });
    await page.waitForTimeout(600);
  }
}

test.describe('Henry Schein - Mobile Emulation & Responsive Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/*usercentrics*', route => route.abort()).catch(() => {});
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
  });

  // ── TC01 ────────────────────────────────────────────────────────────────────

  test('TC01 - Verify page title is correct on mobile viewport',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Page title validation on mobile' },
    },
    async ({ page }) => {
      await test.step('Verify page title contains Henry Schein', async () => {
        const title = await page.title();
        expect(title).toBeTruthy();
        expect(title.toLowerCase()).toContain(TEST_DATA.homePage.title.toLowerCase());
      });
    });

  // ── TC02 ────────────────────────────────────────────────────────────────────

  test('TC02 - Verify navigation menu toggle is present on mobile',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Hamburger menu visibility on mobile viewports' },
    },
    async ({ page, viewport }) => {
      if (viewport && viewport.width < 768) {
        await test.step('Verify hamburger toggle is visible on small mobile', async () => {
          const hamburger = page.locator(`img[alt="${TEST_DATA.mobile.hamburgerAlt}"]`).first();
          await expect(hamburger).toBeVisible({ timeout: 10000 });
        });
      } else {
        await test.step('Verify nav link is visible on tablet viewport', async () => {
          const navLink = page.locator('nav a, header a').first();
          await expect(navLink).toBeVisible({ timeout: 10000 });
        });
      }
    });

  // ── TC03 ────────────────────────────────────────────────────────────────────

  test('TC03 - Verify search bar is visible and accepts input on mobile',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Search bar interaction on mobile' },
    },
    async ({ page }) => {
      const searchInput = page.locator(
        `input[placeholder="${TEST_DATA.homePage.searchPlaceholder}"], #search-input, [name="q"]`
      ).first();

      await test.step('Verify search input is visible', async () => {
        await expect(searchInput).toBeVisible({ timeout: 10000 });
      });

      await test.step('Verify search input accepts text', async () => {
        await searchInput.fill(TEST_DATA.mobile.searchTerm);
        await expect(searchInput).toHaveValue(TEST_DATA.mobile.searchTerm);
      });
    });

  // ── TC04 ────────────────────────────────────────────────────────────────────

  test('TC04 - Verify Sign In link is accessible after opening mobile menu',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Sign In link visibility after opening mobile nav' },
    },
    async ({ page }) => {
      await test.step('Open hamburger menu if present', async () => {
        await openMobileMenuIfNeeded(page);
      });

      await test.step('Verify Sign In link is visible', async () => {
        const signIn = page.locator(`[data-test-id="${TEST_DATA.mobile.signInDataTestId}"]`).first();
        await expect(signIn).toBeVisible({ timeout: 10000 });
      });
    });

  // ── TC05 ────────────────────────────────────────────────────────────────────

  test('TC05 - Verify cart icon is visible in mobile header',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Cart icon accessibility on mobile header' },
    },
    async ({ page }) => {
      await test.step('Verify cart icon is visible without opening menu', async () => {
        const cartIcon = page.locator(
          'a[href*="cart"], a[href*="basket"], button[aria-label*="cart" i], [data-test-id*="cart"], [data-test-id*="basket"]'
        ).first();
        await expect(cartIcon).toBeVisible({ timeout: 10000 });
      });
    });

  // ── TC06 ────────────────────────────────────────────────────────────────────

  test('TC06 - Verify login username input is accessible after clicking Sign In on mobile',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Login form accessibility on mobile after Sign In click' },
    },
    async ({ page }) => {
      await test.step('Open mobile menu if needed', async () => {
        await openMobileMenuIfNeeded(page);
      });

      await test.step('Click Sign In to open login panel', async () => {
        await page.locator(`[data-test-id="${TEST_DATA.mobile.signInDataTestId}"]`).first().click({ force: true });
      });

      await test.step('Verify username input is visible and within viewport', async () => {
        const usernameInput = page.locator(
          '[data-test-id="login.username"], input[name="username"], #username, input[autocomplete="username"]'
        ).first();
        await expect(usernameInput).toBeVisible({ timeout: 10000 });

        const box = await usernameInput.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.width).toBeGreaterThan(0);
      });
    });

  // ── TC07 ────────────────────────────────────────────────────────────────────

  test('TC07 - Verify homepage has no horizontal overflow on mobile viewport',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'No horizontal scroll on mobile — layout integrity check' },
    },
    async ({ page, viewport }) => {
      await test.step('Verify page body width does not exceed viewport width', async () => {
        const bodyWidth     = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport?.width ?? 390;
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + TEST_DATA.mobile.overflowTolerancePx);
      });

      await test.step('Verify at least one hero/content element is visible', async () => {
        const hero = page.locator('[class*="hero"], [class*="banner"], [class*="carousel"], main, section').first();
        await expect(hero).toBeVisible({ timeout: 10000 });
      });
    });

  // ── TC08 ────────────────────────────────────────────────────────────────────

  test('TC08 - Verify Henry Schein logo is visible in header on all viewports',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Logo visibility across all mobile device sizes' },
    },
    async ({ page }) => {
      await test.step('Verify HS logo is visible in header', async () => {
        const logo = page.locator('img[alt*="Henry Schein" i], img[src*="henry-schein" i]').first();
        await expect(logo).toBeVisible({ timeout: 10000 });
      });
    });

  // ── TC09 ────────────────────────────────────────────────────────────────────

  test('TC09 - Verify search results page is readable on mobile viewport',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Search results layout on mobile — no overflow, results visible' },
    },
    async ({ page, viewport }) => {
      await test.step('Navigate to search results', async () => {
        await page.goto(`${BASE_URL}/search?q=${TEST_DATA.mobile.searchTerm}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays(page);
      });

      await test.step('Verify at least one result is visible', async () => {
        const result = page.locator('[class*="product"], [class*="result"], app-add-to-cart').first();
        await expect(result).toBeVisible({ timeout: 15000 });
      });

      await test.step('Verify no horizontal overflow on results page', async () => {
        const bodyWidth     = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport?.width ?? 390;
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + TEST_DATA.mobile.overflowTolerancePx);
      });
    });

  // ── TC10 ────────────────────────────────────────────────────────────────────

  test('TC10 - Verify page is fully scrollable and footer is reachable on mobile',
    {
      tag: ['@mobile', '@smoke', '@regression'],
      annotation: { type: 'feature', description: 'Full page scroll and footer reachability on mobile' },
    },
    async ({ page }) => {
      await test.step('Scroll to bottom of page', async () => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
      });

      await test.step('Verify footer is visible after scrolling', async () => {
        const footer = page.locator('footer').first();
        await expect(footer).toBeVisible({ timeout: 10000 });
      });

      await test.step('Verify scroll position is near the bottom', async () => {
        const scrolled = await page.evaluate(() => window.scrollY + window.innerHeight);
        const total    = await page.evaluate(() => document.body.scrollHeight);
        expect(scrolled).toBeGreaterThanOrEqual(total * TEST_DATA.mobile.scrollThreshold);
      });
    });

});
