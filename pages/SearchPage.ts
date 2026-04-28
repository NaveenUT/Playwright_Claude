import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SearchPage extends BasePage {
  readonly searchInput: Locator;
  readonly searchBtn: Locator;
  readonly resultItems: Locator;
  readonly noResultsMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.searchInput = page.locator('input[placeholder="Search Henry Schein"], #search-input, [name="q"]').first();
    this.searchBtn = page.locator('[data-test-id="basic-addon2"]');

    // app-add-to-cart appears inside every product card on search results page
    this.resultItems = page.locator('app-add-to-cart');
    this.noResultsMessage = page.locator('[data-test-id*="no-result"], [class*="no-result"]').first();
  }

  async searchFor(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await Promise.all([
      this.page.waitForURL('**/search/**', { timeout: 15000 }),
      this.searchBtn.click(),
    ]);
    // Wait for product cards to finish rendering
    await this.resultItems.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  async searchWithEnterKey(term: string): Promise<void> {
    await this.searchInput.fill(term);
    const navigationPromise = this.page
      .waitForURL('**/search/**', { timeout: 5000 })
      .catch(() => {});
    await this.searchInput.press('Enter');
    await navigationPromise;
  }

  async searchWithEmptyInput(): Promise<void> {
    await this.searchInput.clear();
    await Promise.all([
      this.page.waitForURL('**/search/**', { timeout: 10000 }),
      this.searchBtn.click(),
    ]);
    await this.page.waitForLoadState('load');
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async getResultsCount(): Promise<number> {
    return this.resultItems.count();
  }

  async hasResults(): Promise<boolean> {
    const count = await this.resultItems.count();
    return count > 0;
  }
}
