import { Page, Locator } from '@playwright/test';
import { ENV_CONFIG } from '../utils/config';

export class BasePage {
  readonly cookieBanner: Locator;
  readonly domainModal: Locator;
  readonly ukMedicalCard: Locator;
  readonly ukDentalCard: Locator;
  readonly irelandDentalCard: Locator;

  constructor(protected page: Page) {
    this.cookieBanner = page.locator('#usercentrics-root');
    this.domainModal = page.locator('[data-test-id*="selectDomain"]').first();
    this.ukMedicalCard = page.locator('[data-test-id="selectDomain.MedicalText6"]');
    this.ukDentalCard = page.locator('[data-test-id*="selectDomain.Dental"]').first();
    this.irelandDentalCard = page.locator('[data-test-id*="selectDomain.Ireland"]').first();
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('load');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async getUrl(): Promise<string> {
    return this.page.url();
  }

  async pause(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async acceptCookies(): Promise<void> {
    await this.cookieBanner.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});

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
      const acceptBtn = buttons.find(b => b.textContent?.toLowerCase().includes('accept all'));
      acceptBtn?.click();
    });

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

    await domainMap[domain]
      .locator('xpath=ancestor::div[contains(@class,"card") or contains(@class,"domain") or contains(@class,"list")][1]')
      .locator('text=Browse')
      .click()
      .catch(async () => {
        await domainMap[domain].locator('..').locator('..').locator('text=Browse').click();
      });
  }

  async setup(): Promise<void> {
    await this.navigate(ENV_CONFIG.baseUrl);
    await this.acceptCookies();
    await this.selectDomain(ENV_CONFIG.domain);
    await this.waitForPageLoad();
  }

  async isCookieBannerVisible(): Promise<boolean> {
    return this.cookieBanner.isVisible().catch(() => false);
  }

  async isDomainModalVisible(): Promise<boolean> {
    return this.ukMedicalCard.isVisible().catch(() => false);
  }
}
