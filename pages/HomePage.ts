import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
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

    // Header
    this.searchInput = page.locator('input[placeholder="Search Henry Schein"], #search-input, [name="q"]').first();
    this.searchBtn = page.locator('button[type="submit"], .search-button, [aria-label="Search"]').first();
    this.signInLink = page.locator('text=Sign4134').first();
    this.signUpLink = page.locator('text=Sign8979').first();
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
}
