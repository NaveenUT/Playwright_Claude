import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Cookie banner
  readonly acceptCookiesBtn: Locator;
  readonly denyCookiesBtn: Locator;
  readonly cookieBanner: Locator;

  // Domain selector modal
  readonly domainModal: Locator;
  readonly ukMedicalCard: Locator;
  readonly ukDentalCard: Locator;
  readonly irelandDentalCard: Locator;

  // Header
  readonly searchInput: Locator;
  readonly searchBtn: Locator;
  readonly signInLink: Locator;
  readonly signUpLink: Locator;
  readonly cartIcon: Locator;

  // Navigation
  readonly exploreAllMenu: Locator;
  readonly topSuppliesLink: Locator;
  readonly topEquipmentLink: Locator;
  readonly pharmaceuticalsLink: Locator;
  readonly furnitureLink: Locator;
  readonly clearanceLink: Locator;
  readonly blogLink: Locator;
  readonly myDashboardLink: Locator;
  readonly orderFromHistoryLink: Locator;

  // Hero banner
  readonly heroBanner: Locator;
  readonly signUpNowBtn: Locator;

  constructor(page: Page) {
    super(page);

    // Cookie banner (Usercentrics - uses Shadow DOM)
    this.cookieBanner = page.locator('#usercentrics-root');
    this.acceptCookiesBtn = page.locator('#usercentrics-root');
    this.denyCookiesBtn = page.locator('#usercentrics-root');

    // Domain selector modal - using data-test-id attributes from actual DOM
    this.domainModal = page.locator('[data-test-id*="selectDomain"]').first();
    this.ukMedicalCard = page.locator('[data-test-id="selectDomain.MedicalText6"]');
    this.ukDentalCard = page.locator('[data-test-id*="selectDomain.Dental"]').first();
    this.irelandDentalCard = page.locator('[data-test-id*="selectDomain.Ireland"]').first();

    // Header
    this.searchInput = page.locator('input[placeholder="Search Henry Schein"], #search-input, [name="q"]').first();
    this.searchBtn = page.locator('button[type="submit"], .search-button, [aria-label="Search"]').first();
    this.signInLink = page.locator('text=Sign In').first();
    this.signUpLink = page.locator('text=Sign Up').first();
    this.cartIcon = page.locator('[data-test-id="cart_image_icon_notloggedin"]');

    // Navigation
    this.exploreAllMenu = page.locator('text=Explore All').first();
    this.topSuppliesLink = page.locator('nav >> text=Top Supplies').first();
    this.topEquipmentLink = page.locator('nav >> text=Top Equipment').first();
    this.pharmaceuticalsLink = page.locator('nav >> text=Pharmaceuticals').first();
    this.furnitureLink = page.locator('nav >> text=Furniture').first();
    this.clearanceLink = page.locator('nav >> text=Clearance').first();
    this.blogLink = page.locator('nav >> text=Blog').first();
    this.myDashboardLink = page.locator('nav >> text=My Dashboard').first();
    this.orderFromHistoryLink = page.locator('nav >> text=Order From History').first();

    // Hero banner
    this.heroBanner = page.locator('.hero-banner, .banner, [class*="hero"]').first();
    this.signUpNowBtn = page.getByRole('link', { name: /sign up now/i })
      .or(page.getByRole('button', { name: /sign up now/i })).first();
  }

  async acceptCookies(): Promise<void> {
    await this.cookieBanner.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});

    // Try Usercentrics global API first, fall back to Shadow DOM button click
    await this.page.evaluate(() => {
      const win = window as Window & { UC_UI?: { acceptAllConsents: () => void } };
      if (win.UC_UI?.acceptAllConsents) {
        win.UC_UI.acceptAllConsents();
        return;
      }
      const root = document.getElementById('usercentrics-root');
      const shadow = root?.shadowRoot;
      if (!shadow) return;
      const buttons = Array.from(shadow.querySelectorAll<HTMLButtonElement>('button'));
      const acceptBtn = buttons.find(b =>
        b.textContent?.toLowerCase().includes('accept all')
      );
      acceptBtn?.click();
    });

    // Forcibly remove the overlay from DOM so it cannot intercept any clicks
    await this.page.evaluate(() => {
      const root = document.getElementById('usercentrics-root');
      if (root) {
        root.style.display = 'none';
        root.style.pointerEvents = 'none';
      }
    });
  }

  async selectDomain(domain: 'UK Medical' | 'UK Dental' | 'Ireland Dental'): Promise<void> {
    const domainMap = {
      'UK Medical': this.ukMedicalCard,
      'UK Dental': this.ukDentalCard,
      'Ireland Dental': this.irelandDentalCard,
    };

    await domainMap[domain].waitFor({ state: 'visible', timeout: 15000 });

    // Click the Browse link inside the domain card container
    await domainMap[domain]
      .locator('xpath=ancestor::div[contains(@class,"card") or contains(@class,"domain") or contains(@class,"list")][1]')
      .locator('text=Browse')
      .click()
      .catch(async () => {
        // Fallback: traverse up two levels from domain text and find Browse
        await domainMap[domain].locator('..').locator('..').locator('text=Browse').click();
      });
  }

  async searchFor(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchBtn.click();
  }

  getNavLink(name: string): Locator {
    return this.page.locator(`nav >> text=${name}`).first();
  }

  async clickNavLink(linkName: string): Promise<void> {
    await this.page.locator(`nav >> text=${linkName}`).first().click();
  }

  async isSignInVisible(): Promise<boolean> {
    return this.signInLink.isVisible();
  }

  async isCookieBannerVisible(): Promise<boolean> {
    return this.cookieBanner.isVisible().catch(() => false);
  }

  async isDomainModalVisible(): Promise<boolean> {
    return this.ukMedicalCard.isVisible().catch(() => false);
  }
}
