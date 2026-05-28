import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  // Login panel
  readonly signInLink: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly accountMenu: Locator;

  // View basket button (cart icon in header)
  readonly viewBasketButton: Locator;
  readonly viewBasketTooltipText: Locator;

  // Cart quantity badge — shows total item count in the header (absent when cart is empty)
  readonly cartQuantityBadge: Locator;

  // Cart page
  readonly cartPageHeading: Locator;

  // Cart operations
  readonly clearBasketOption: Locator;

  // Search elements (available on all pages after login)
  readonly searchInput: Locator;
  readonly searchBtn: Locator;

  // Search results — first product
  readonly firstProductQuantityInput: Locator;
  readonly firstProductAddToBasketBtn: Locator;

  // Quick Order panel (always visible on cart page)
  readonly quickOrderBtn: Locator;
  readonly itemCodeInput: Locator;
  readonly itemCodeAutocompleteFirstOption: Locator;
  readonly quickAddQuantityInput: Locator;
  readonly quickAddToBasketBtn: Locator;
  readonly cartItemCodes: Locator;

  // Top-category browsing — category listing page
  readonly firstProductLink: Locator;

  // Product detail page (PDP) — options, quantity, add to cart
  readonly pdpQuantityInput: Locator;
  readonly pdpAddToCartBtn: Locator;

  // Cart icon (header) used to navigate to cart
  readonly cartIconBtn: Locator;

  // Save To Shopping List — action item in the cart header menu (visible only when basket has items)
  readonly saveToShoppingListOption: Locator;

  // Save to a Shopping List dialog
  readonly saveShoppingListDialog: Locator;
  readonly newListNameInput: Locator;
  readonly sharingOptionTrigger: Locator;
  readonly saveListBtn: Locator;
  readonly  product_grid : Locator;
  // Dev-02-Create Top Product Category Section on Home Page
  readonly topProductCategoriesSection: Locator;
  readonly topProductCategoriesSectionTitle: Locator;
  readonly categoryContainers: Locator;
  readonly diagnosticsUrologyCategory: Locator;
  readonly paperProductsCategory: Locator;
  readonly medicalInstrumentsCategory: Locator;
  readonly infectionControlCategory: Locator;
  readonly categoryShopNowButtons: Locator;
  readonly diagnosticsUrologyShopNowBtn: Locator;
  readonly paperProductsShopNowBtn: Locator;
  readonly medicalInstrumentsShopNowBtn: Locator;
  readonly infectionControlShopNowBtn: Locator;

  constructor(page: Page) {
    super(page);

    // Login panel
    this.signInLink = page.locator('text=Sign In').first();
    this.usernameInput = page.locator(
      '[data-test-id="SignInUserNameInput"], [data-test-id="login.username"], input[autocomplete="username"]'
    ).first();
    this.passwordInput = page.locator(
      '[data-test-id="SignInPasswordInput"], [data-test-id="login.password"], input[type="password"]'
    ).first();
    this.signInButton = page.locator('[data-test-id="sign-in-button"]');
    this.accountMenu = page.locator('[data-test-id="user_details_component_li_32"]');

    // View basket button — the cart icon div in the header (shows "View Basket" tooltip text)
    this.viewBasketButton = page.locator('[data-test-id="user_details_component_div_10"]');
    this.viewBasketTooltipText = page.locator('[data-test-id="userDetails.CartTooltipText20"]');

    // Cart quantity badge — the count bubble on the cart icon; rendered by Angular only when qty > 0
    this.cartQuantityBadge = page.locator('[data-test-id="cart_image_qty"]');

    // Cart page heading
    this.cartPageHeading = page.locator('h1').filter({ hasText: 'Shopping Basket' }).first();

    // Clear basket option in the basket action menu
    this.clearBasketOption = page.locator('[data-test-id="cart_link_orderforresaleno"]');

    // Global search bar (header — present on all pages)
    this.searchInput = page.locator('input[placeholder="Search Henry Schein"], #search-input, [name="q"]').first();
    this.searchBtn = page.locator('[data-test-id="basic-addon2"]');

    // First product card on search results
  this.product_grid= page.locator('.product-grid-card');
    this.firstProductQuantityInput = page.locator('[data-test-id="PurchaseQuantityInput"]');
    this.firstProductAddToBasketBtn = page.locator('[data-test-id="pdp_button_addcart"]').first();

    // Category listing page — first product
    this.firstProductLink = page.locator('a[href*="/p/"]').first();

    // PDP controls
    this.pdpQuantityInput = page.locator('[data-test-id="PurchaseQuantityInput"]').first();
    this.pdpAddToCartBtn = page.locator('[data-test-id="pdp_button_addcart"]').first();

    // Cart icon in header (navigates to /shoppingcart)
    this.cartIconBtn = page.locator('[data-test-id="user_details_component_div_10"]');

    // "Save To Shopping list" option in the cart header action list
    this.saveToShoppingListOption = page.locator('text=Save To Shopping list').first();

    // Save to a Shopping List dialog (Angular Material dialog or custom modal)
    this.saveShoppingListDialog = page.locator("//div[@class='shopping-list-modal mbl-w-100']");
    this.newListNameInput = page
      .locator('[role="dialog"] input[type="text"], mat-dialog-container input[type="text"]')
      .first();
    // Sharing option — Angular mat-select (rendered as combobox) inside the dialog
    this.sharingOptionTrigger = page
      .locator("[data-test-id='quickview_addtoshoppinglist_dropdown_sharingoption']")
    this.saveListBtn = page
      .locator('[data-test-id="quickview_addtoshoppinglist_button_save"]')

    // Quick Order panel
    this.quickOrderBtn = page.locator('[data-test-id="quick_add_cart_component_QuickOrderButton1"]');
    this.itemCodeInput = page.locator('[data-test-id="quick_order_item_code_0"]');
    this.itemCodeAutocompleteFirstOption = page.locator('[data-test-id="quick_add_cart_component_mat_option_0"]');
    this.quickAddQuantityInput = page.locator('[data-test-id="quick_order_qty_0"]');
    // Scoped to quick-add panel to avoid matching product recommendation cards
    this.quickAddToBasketBtn = page.locator('[data-test-id="btn_quick_order_add_to_cart"] ');
    this.cartItemCodes = page.locator('[data-test-id="cart_textbox_itemcode"]');

    // Dev-02-Create Top Product Category Section on Home Page
    this.topProductCategoriesSection = page.locator('section:has-text("Top Product Categories")').first();
    this.topProductCategoriesSectionTitle = page.locator('h2:has-text("Top Product Categories")').first();
    this.categoryContainers = page.locator('.category-item');
    this.diagnosticsUrologyCategory = page.locator('.category-item:has-text("Diagnostics & Urology")').first();
    this.paperProductsCategory = page.locator('.category-item:has-text("Paper Products")').first();
    this.medicalInstrumentsCategory = page.locator('.category-item:has-text("Medical Instruments")').first();
    this.infectionControlCategory = page.locator('.category-item:has-text("Infection Control")').first();
    this.categoryShopNowButtons = page.locator('.category-item a:has-text("Shop Now")');
    this.diagnosticsUrologyShopNowBtn = page.locator('.category-item:has-text("Diagnostics & Urology") a:has-text("Shop Now")').first();
    this.paperProductsShopNowBtn = page.locator('.category-item:has-text("Paper Products") a:has-text("Shop Now")').first();
    this.medicalInstrumentsShopNowBtn = page.locator('.category-item:has-text("Medical Instruments") a:has-text("Shop Now")').first();
    this.infectionControlShopNowBtn = page.locator('.category-item:has-text("Infection Control") a:has-text("Shop Now")').first();
  }

  async login(username: string, password: string): Promise<void> {
    await this.signInLink.click();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async clickViewBasket(): Promise<void> {
    await this.viewBasketButton.click();
    await this.waitForPageLoad();
  }

  async clearBasket(): Promise<void> {
    const isVisible = await this.clearBasketOption.isVisible().catch(() => false);
    if (isVisible) {
      await this.clearBasketOption.click();
      await this.waitForPageLoad();
    }
  }

  async searchFor(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await Promise.all([
      this.page.waitForURL('**/search/**', { timeout: 15000 }),
      this.searchBtn.click(),
    ]);
    await this.firstProductAddToBasketBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  async addFirstProductToCart(quantity: number = 1): Promise<void> {
    await this.product_grid.first().scrollIntoViewIfNeeded();
    await this.product_grid.first().hover();
    //await this.firstProductQuantityInput.first().doubleClick();
    await this.firstProductQuantityInput.first().fill(String(quantity));
    await this.firstProductAddToBasketBtn.click();
    await this.page.waitForTimeout(2000);
  }

  /** Hover a top-level nav menu item to open its dropdown, then click the submenu link. */
  async navigateViaMenu(topMenuLabel: string, subMenuLabel: string): Promise<void> {
    await this.page.locator(`button:has-text("${topMenuLabel}")`).first().hover();
    const subLink = this.page.locator(`a:has-text("${subMenuLabel}")`).first();
    await subLink.waitFor({ state: 'visible', timeout: 8000 });
    await subLink.click();
    await this.waitForPageLoad();
  }

  /** Click a filter checkbox on a category page by its visible label text. */
  async selectFilter(filterLabel: string): Promise<void> {
    const label = this.page.locator('label').filter({ hasText: filterLabel }).first();
    await label.waitFor({ state: 'visible', timeout: 10000 });
    await label.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  /** Returns true when a filter section heading is visible on the page. */
  async isFilterSectionVisible(sectionLabel: string): Promise<boolean> {
    return this.page.locator(`text=${sectionLabel}`).first().isVisible().catch(() => false);
  }

  /** Click the first product card link on a category listing page. */
  async clickFirstProduct(): Promise<void> {
    await this.firstProductLink.waitFor({ state: 'visible', timeout: 15000 });
    await this.firstProductLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Select a variant option on the PDP.
   * Finds the option container whose text includes `optionLabel`, then clicks the
   * button or label whose text matches `value`.
   */
  async selectProductOption(optionLabel: string, value: string): Promise<void> {
    const section = this.page
      .locator('div, section, fieldset')
      .filter({ hasText: optionLabel })
      .last();
    const target = section
      .locator(`button:has-text("${value}"), label:has-text("${value}")`)
      .first();
    await target.waitFor({ state: 'visible', timeout: 8000 });
    await target.click();
    await this.page.waitForTimeout(500);
  }

  /** Set the quantity on the PDP quantity input. */
  async setPdpQuantity(qty: number): Promise<void> {
    await this.pdpQuantityInput.waitFor({ state: 'visible', timeout: 8000 });
    await this.pdpQuantityInput.fill(String(qty));
  }

  /** Click the Add to Cart button on the PDP and wait for the cart update animation. */
  async addToCartFromPdp(): Promise<void> {
    await this.pdpAddToCartBtn.click();
    await this.page.waitForTimeout(2500);
  }

  /** Navigate to the site home page via the header logo. */
  async goToHomePage(): Promise<void> {
    await this.page
      .locator('a')
      .filter({ has: this.page.locator('img[alt="Henry Schein Logo"]') })
      .first()
      .click();
    await this.waitForPageLoad();
  }

  /** Click "Save To Shopping list" in the cart header action menu. */
  async clickSaveToShoppingList(): Promise<void> {
    await this.saveToShoppingListOption.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveToShoppingListOption.click();
    await this.page.waitForTimeout(800);
  }

  /**
   * Fill the "Save to a Shopping List" dialog: enter list name, select sharing option, click Save.
   * Handles both Angular Material mat-select (combobox → mat-option) and plain <select>.
   */
  async fillAndSaveShoppingList(listName: string, sharingOption: string): Promise<void> {
    await this.saveShoppingListDialog.waitFor({ state: 'visible', timeout: 8000 });
    // Enter list name
    await this.newListNameInput.fill(listName);
    // Select sharing option — try mat-select first, fall back to native select
    await this.sharingOptionTrigger.click();
    const matOption = this.page.locator(`mat-option:has-text("${sharingOption}")`).first();
    const isMatOption = await matOption.isVisible({ timeout: 3000 }).catch(() => false);
    if (isMatOption) {
      await matOption.click();
    } else {
      await this.page
        .locator('[role="dialog"] select, mat-dialog-container select')
        .first()
        .selectOption({ label: sharingOption });
    }
    // Click Save
    await this.saveListBtn.click();
    await this.waitForPageLoad();
  }

  /** Navigate to the My Lists & Favourites page in the account dashboard. */
  async goToMyListsAndFavourites(): Promise<void> {
    await this.page.goto('https://www.henryschein.co.uk/dashboard/myfavouritesandlists', {
      waitUntil: 'domcontentloaded',
    });
    await this.acceptCookies();
    await this.waitForPageLoad();
  }

  async addItemViaQuickAdd(itemCode: string, quantity: number): Promise<void> {
    await this.itemCodeInput.fill(itemCode);
    //await this.itemCodeAutocompleteFirstOption.waitFor({ state: 'visible', timeout: 10000 });
    //await this.itemCodeAutocompleteFirstOption.click();
    await this.quickAddQuantityInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.quickAddQuantityInput.fill(String(quantity));
    await this.quickAddToBasketBtn.click();
    await this.page.waitForTimeout(2000);
  }
}
