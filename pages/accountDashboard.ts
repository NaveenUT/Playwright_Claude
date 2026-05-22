import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AccountDashboardPage extends BasePage {
  // Login elements
  readonly signInLink: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly accountMenu: Locator;

  // Dashboard page
  readonly dashboardHeading: Locator;

  // Dashboard sections
  readonly budgetOverviewSection: Locator;
  readonly locationsSection: Locator;
  readonly profileDetailsSection: Locator;
  readonly barcodeScannerSection: Locator;

  // Budget Overview field labels
  readonly totalAssignedLocationsLabel: Locator;
  readonly locationsOverBudgetLabel: Locator;
  readonly locationsUnderBudgetLabel: Locator;
  readonly manageBudgetLink: Locator;

  // Locations section
  readonly viewLocationsButton: Locator;
  readonly locationsAssignedLabel: Locator;

  // Profile Details section
  readonly profileDetailsToggle: Locator;
  readonly profileUsername: Locator;

  // Barcode Scanners section
  readonly barcodeScannersToggle: Locator;
  readonly downloadBarcodeSoftwareLink: Locator;
  readonly downloadBarcodeDriversLink: Locator;

  // Shopping Baskets section
  readonly shoppingBasketsSection: Locator;
  readonly shoppingBasketsViewAllButton: Locator;
  readonly shoppingBasketsItemCount: Locator;

  // Cart / search helpers
  readonly searchInput: Locator;
  readonly clearBasketLink: Locator;
  readonly addToBasketButton: Locator;
  readonly product_grids: Locator

  constructor(page: Page) {
    super(page);

    this.signInLink = page.locator('text=Sign In').first();
    this.usernameInput = page.locator(
      '[data-test-id="SignInUserNameInput"], [data-test-id="login.username"], input[name="username"], #username, input[autocomplete="username"]'
    ).first();
    this.passwordInput = page.locator(
      '[data-test-id="SignInPasswordInput"], [data-test-id="login.password"], input[name="password"], #password, input[type="password"]'
    ).first();
    this.signInButton = page.locator('[data-test-id="sign-in-button"]');
    this.accountMenu = page.locator('[data-test-id="user_details_component_li_32"]');

    this.dashboardHeading = page.locator('h3:has-text("Welcome to Your Dashboard")');

    this.budgetOverviewSection = page.locator(':text-is("Budget Overview")');
    this.locationsSection = page.locator(':text-is("Locations")');
    this.profileDetailsSection = page.locator('a[href="#profilecollapse"]');
    this.barcodeScannerSection = page.locator('a[href="#barcodecollapse"]');

    this.totalAssignedLocationsLabel = page.locator('text=Total Assigned Locations');
    this.locationsOverBudgetLabel = page.locator('text=Locations Over Budget');
    this.locationsUnderBudgetLabel = page.locator('text=Locations Under Budget');
    this.manageBudgetLink = page.locator("//span[text()='Manage Budget']");

    this.viewLocationsButton = page.locator('[data-test-id="dashboard_tiles_component_button_30"]');
    this.locationsAssignedLabel = page.locator('[data-test-id="dashboardTiles.LocationsAssignedText20"]');

    this.profileDetailsToggle = page.locator('[data-test-id="dashboard_profile_component_a_0"]');
    this.profileUsername = page.locator('[data-test-id="profiledetais-label-username"]');

    this.barcodeScannersToggle = page.locator('[data-test-id="dashboard_barcode_scanner_component_a_2"]');
    this.downloadBarcodeSoftwareLink = page.locator('[data-test-id="dashboard_barcode_scanner_component_a_1"]');
    this.downloadBarcodeDriversLink = page.locator('[data-test-id="dashboard_barcode_scanner_component_a_0"]');

    this.shoppingBasketsSection = page.locator(':text-is("Shopping Baskets")');
    this.shoppingBasketsViewAllButton = page.locator('[data-test-id="dashboard_tiles_component_button_36"]');
    this.shoppingBasketsItemCount = page.locator('.row.w-100.mx-0').first()
    
    this.searchInput = page.locator('[data-test-id="RecipientUsername"]');
    this.clearBasketLink = page.locator('[data-test-id="shoppingCart.RemoveCartText46"]');
    this.addToBasketButton = page.locator('[data-test-id="pdp_button_addcart"]').first();
    this.product_grids = page.locator('.product-grid-card'); 
  }

  async getLocationsAssignedValue(): Promise<string> {
    const value = await this.page
      .locator('xpath=//span[@data-test-id="dashboardTiles.LocationsAssignedText20"]/parent::div/preceding-sibling::div[1]')
      .textContent();
    return (value ?? '').trim();
  }

  async getBudgetFieldValue(fieldLabel: string): Promise<string> {
    const container = this.page
      .locator('.budgetOverView_label', { hasText: fieldLabel })
      .locator('xpath=..');
    return (await container.locator('.budgetStatus_value1').textContent() ?? '').trim();
  }
  async getBudgetFieldValue_locationOverbudget(fieldLabel: string): Promise<string> {
    const container = this.page
      .locator('.budgetOverView_label', { hasText: fieldLabel })
      .locator('xpath=..');
    return (await container.locator('.budgetStatus_value3').textContent() ?? '').trim();
  }
  async getBudgetFieldValue_locationUnderbudget(fieldLabel: string): Promise<string> {
    const container = this.page
      .locator('.budgetOverView_label', { hasText: fieldLabel })
      .locator('xpath=..');
    return (await container.locator('.budgetStatus_value2').textContent() ?? '').trim();
  }
  async login(username: string, password: string): Promise<void> {
    await this.signInLink.click();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async navigateToDashboard(): Promise<void> {
    await this.navigate('/dashboard');
    await this.waitForPageLoad();
  }
}
