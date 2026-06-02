import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Header
  readonly searchInput: Locator;
  readonly searchBtn: Locator;
  readonly signInLink: Locator;
  readonly signUpLink: Locator;
  readonly cartIcon: Locator;

  // Mobile navigation
  readonly hamburgerMenu: Locator;
  readonly logo: Locator;
  readonly mobileSignInLink: Locator;  // Sign In inside expanded mobile nav menu

  // Login panel
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly accountMenu: Locator;
  readonly loginErrorMessage: Locator;
  readonly forgotUsernameLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly forgotUsernamePanelHeading: Locator;
  readonly forgotPasswordPanelHeading: Locator;

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

  // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
  readonly mostPopularArticlesSection: Locator;
  readonly topBrandsSection: Locator;
  readonly articleCards: Locator;
  readonly articleLearnMoreButtons: Locator;
  readonly mostPopularArticlesSectionHeading: Locator;

  // Dev-02-Create Top Product Category Section on Home Page
  readonly topProductCategoriesSection: Locator;
  readonly topProductCategoriesSectionTitle: Locator;
  readonly topProductCategoryContainers: Locator;
  readonly diagnosticsUrologyCategory: Locator;
  readonly paperProductsCategory: Locator;
  readonly medicalInstrumentsCategory: Locator;
  readonly infectionControlCategory: Locator;
  readonly diagnosticsUrologyShopNowBtn: Locator;
  readonly paperProductsShopNowBtn: Locator;
  readonly medicalInstrumentsShopNowBtn: Locator;
  readonly infectionControlShopNowBtn: Locator;

  // Dev-05-Add “Top Equipment” Section below Most Popular Articles on Home Page
  readonly topEquipmentSection: Locator;
  readonly topEquipmentCards: Locator;
  readonly topEquipmentLearnMoreSelector: Locator;
  readonly topEquipmentHeading: Locator;

  // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
  readonly mostPopularArticleCards: Locator;
  readonly mostPopularArticleCardImages: Locator;
  readonly mostPopularArticleCardTitles: Locator;
  readonly mostPopularArticleLearnMoreButtons: Locator;

  // Dev-02-Create Top Product Category Section on Home Page
  readonly topProductCategoriesTitle: Locator;
  readonly categoryNameDiagnosticsUrology: Locator;
  readonly categoryNamePaperProducts: Locator;
  readonly categoryNameMedicalInstruments: Locator;
  readonly categoryNameInfectionControl: Locator;
  readonly shopNowButtons: Locator;
  readonly shopNowButtonDiagnosticsUrology: Locator;
  readonly shopNowButtonPaperProducts: Locator;
  readonly shopNowButtonMedicalInstruments: Locator;
  readonly shopNowButtonInfectionControl: Locator;
  readonly categoryContainers: Locator;
  readonly categoryNames: Locator;
  readonly diagnosticsAndUrologyCategory: Locator;
  readonly categoryShopNowButtons: Locator;

  // Dev-05-Add “Top Equipment” Section below Most Popular Articles on Home Page
  readonly equipmentCards: Locator;
  readonly equipmentLearnMoreLinks: Locator;

  // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
  readonly mostPopularArticleLinks: Locator;
  readonly mostPopularArticleImages: Locator;
  readonly mostPopularArticleTitles: Locator;

  // Dev-03-Add “Our Top Brands” Section under Top Product Categories on Home Page
  readonly ourTopBrandsSection: Locator;
  readonly ourTopBrandsSectionHeading: Locator;
  readonly brandContainers: Locator;
  readonly brandShopNowButton: Locator;

  // Dev-03-Add “Our Top Brands” Section under Top Product Categories on Home Page
  readonly brandShopNowButtons: Locator;

  // Dev-06-Footer Links Implementation
  readonly footer: Locator;
  readonly footerCompanyInfoLink: Locator;
  readonly footerLegalTermsLink: Locator;
  readonly footerPrivacyNoticeLink: Locator;
  readonly footerTaxStrategyLink: Locator;
  readonly footerModernSlaveryActLink: Locator;
  readonly footerManageCookieSettingsLink: Locator;
  readonly footerMyAccountLink: Locator;
  readonly footerDeliveryAndReturnsLink: Locator;
  readonly footerComplaintAndResolutionPolicyLink: Locator;
  readonly footerPageHeading: Locator;
  readonly cookieSettingsModal: Locator;
  readonly cookieSettingsModalTitle: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.searchInput = page.locator('input[placeholder="Search Henry Schein"], #search-input, [name="q"]').first();
    this.searchBtn = page.locator('button[type="submit"], .search-button, [aria-label="Search"]').first();
    this.signInLink = page.locator('text=Sign In').first();
    this.signUpLink = page.locator('text=Sign Up').first();
    this.cartIcon = page.locator('[data-test-id="cart_image_icon_notloggedin"]');

    // Mobile navigation
    this.hamburgerMenu = page.locator('img[alt="menu"]').first();
    this.logo = page.locator('img[alt*="Henry Schein" i], img[src*="henry-schein" i]').first();
    this.mobileSignInLink = page.locator('[data-test-id="mega_menu_component_a_23"]').first();

    // Login panel
    this.usernameInput = page.locator('[data-test-id="login.username"], input[name="username"], #username, input[autocomplete="username"]').first();
    this.passwordInput = page.locator('[data-test-id="login.password"], input[name="password"], #password, input[type="password"]').first();
    this.signInButton = page.locator('[data-test-id="sign-in-button"]')
    this.accountMenu = page.locator('[data-test-id="user_details_component_li_32"]');
    this.loginErrorMessage = page.locator('[data-test-id="login.error"], .login-error, [class*="error-message"], [role="alert"]').first();
    this.forgotUsernameLink = page.locator('a:has-text("Forgot Username"), a:has-text("Forgot your username"), [data-test-id*="forgotUsername"]').first();
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password"), a:has-text("Forgot your password"), [data-test-id*="forgotPassword"]').first();
    this.forgotUsernamePanelHeading = page.locator('h1:has-text("Forgot your username"), h2:has-text("Forgot your username"), [class*="panel"] h1, [class*="panel"] h2').filter({ hasText: 'Forgot your username' }).first();
    this.forgotPasswordPanelHeading = page.locator('h1:has-text("Forgot your password"), h2:has-text("Forgot your password"), [class*="panel"] h1, [class*="panel"] h2').filter({ hasText: 'Forgot your password' }).first();

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

    // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
    this.mostPopularArticlesSection = page.locator('section').filter({ hasText: 'Most Popular Articles' }).first();
    this.topBrandsSection = page.locator('section').filter({ hasText: 'Top Brands' }).first();
    this.articleCards = page.locator('.article-card');
    this.articleLearnMoreButtons = page.locator('a').filter({ hasText: 'Learn More' });
    this.mostPopularArticlesSectionHeading = page.locator('h2').filter({ hasText: 'Most Popular Articles' }).first();

    // Dev-02-Create Top Product Category Section on Home Page
    this.topProductCategoriesSection = page.locator('section:has(h2:has-text("Top Product Categories")), div:has(> h2:has-text("Top Product Categories"))').first();
    this.topProductCategoriesSectionTitle = page.locator('h2:has-text("Top Product Categories")').first();
    this.topProductCategoryContainers = page.locator('//div[@class="desktop_grid h-100 w-100 ng-star-inserted"]');
    this.diagnosticsUrologyCategory = page.locator('div:has-text("Diagnostics & Urology"):has(a:has-text("Shop now"))').first();
    this.paperProductsCategory = page.locator('div:has-text("Paper Products"):has(a:has-text("Shop now"))').first();
    this.medicalInstrumentsCategory = page.locator('div:has-text("Medical Instruments"):has(a:has-text("Shop now"))').first();
    this.infectionControlCategory = page.locator('div:has-text("Infection Control"):has(a:has-text("Shop now"))').first();
    this.diagnosticsUrologyShopNowBtn = page.locator('div:has-text("Diagnostics & Urology") a:has-text("Shop now")').first();
    this.paperProductsShopNowBtn = page.locator('div:has-text("Paper Products") a:has-text("Shop now")').first();
    this.medicalInstrumentsShopNowBtn = page.locator('div:has-text("Medical Instruments") a:has-text("Shop now")').first();
    this.infectionControlShopNowBtn = page.locator('div:has-text("Infection Control") a:has-text("Shop now")').first();

    // Dev-05-Add “Top Equipment” Section below Most Popular Articles on Home Page
    this.topEquipmentSection = page.locator('[data-test-id="top-equipment-section"], section:has-text("Top Equipment")').first();
    this.topEquipmentCards = page.locator('[data-test-id="top-equipment-section"] .product-card, section:has-text("Top Equipment") .card');
    this.topEquipmentLearnMoreSelector = page.locator('[data-test-id="top-equipment-section"] a:has-text("Learn More"), section:has-text("Top Equipment") a:has-text("Learn More")').first();
    this.topEquipmentHeading = page.locator('[data-test-id="top-equipment-heading"], section:has-text("Top Equipment") h2, section:has-text("Top Equipment") h3').first();

    // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
    this.mostPopularArticleCards = page.locator('.most-popular-articles .article-card, section:has-text("Most Popular Articles") .card');
    this.mostPopularArticleCardImages = page.locator('.most-popular-articles .article-card img, section:has-text("Most Popular Articles") .card img');
    this.mostPopularArticleCardTitles = page.locator('.most-popular-articles .article-card h3, section:has-text("Most Popular Articles") .card h3');
    this.mostPopularArticleLearnMoreButtons = page.locator('.most-popular-articles a:has-text("Learn More"), section:has-text("Most Popular Articles") a:has-text("Learn More")');

    // Dev-02-Create Top Product Category Section on Home Page
    this.topProductCategoriesTitle = page.locator('h2:has-text("Top Product Categories")').first();
    this.categoryNameDiagnosticsUrology = page.locator('a:has-text("Diagnostics & Urology"), h3:has-text("Diagnostics & Urology")').first();
    this.categoryNamePaperProducts = page.locator('a:has-text("Paper Products"), h3:has-text("Paper Products")').first();
    this.categoryNameMedicalInstruments = page.locator('a:has-text("Medical Instruments"), h3:has-text("Medical Instruments")').first();
    this.categoryNameInfectionControl = page.locator('a:has-text("Infection Control"), h3:has-text("Infection Control")').first();
    this.shopNowButtons = page.locator('a:has-text("Shop Now"), button:has-text("Shop Now")');
    this.shopNowButtonDiagnosticsUrology = page.locator('li:has-text("Diagnostics & Urology") a:has-text("Shop Now"), div:has(:is(a, h3):has-text("Diagnostics & Urology")) a:has-text("Shop Now")').first();
    this.shopNowButtonPaperProducts = page.locator('li:has-text("Paper Products") a:has-text("Shop Now"), div:has(:is(a, h3):has-text("Paper Products")) a:has-text("Shop Now")').first();
    this.shopNowButtonMedicalInstruments = page.locator('li:has-text("Medical Instruments") a:has-text("Shop Now"), div:has(:is(a, h3):has-text("Medical Instruments")) a:has-text("Shop Now")').first();
    this.shopNowButtonInfectionControl = page.locator('li:has-text(“Infection Control”) a:has-text(“Shop Now”), div:has(:is(a, h3):has-text(“Infection Control”)) a:has-text(“Shop Now”)').first();
    this.categoryContainers = page.locator('//div[@class=”desktop_grid h-100 w-100 ng-star-inserted”]');
    this.categoryNames = page.locator('//div[@class=”desktop_grid h-100 w-100 ng-star-inserted”]//h3');
    this.diagnosticsAndUrologyCategory = page.locator('div:has-text(“Diagnostics & Urology”):has(a:has-text(“Shop now”))').first();
    this.categoryShopNowButtons = page.locator('section:has(h2:has-text(“Top Product Categories”)) a:has-text(“Shop Now”), section:has(h2:has-text(“Top Product Categories”)) a:has-text(“Shop now”)');

    // Dev-05-Add “Top Equipment” Section below Most Popular Articles on Home Page
    this.equipmentCards = page.locator('.top-equipment .card, .equipment-section .product-card, [class*="equipment"] .card-item');
    this.equipmentLearnMoreLinks = page.locator('.top-equipment a[href*="equipment"], .equipment-section a:has-text("Learn More"), [class*="equipment"] a:has-text("Learn more")');

    // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
    this.mostPopularArticleLinks = page.locator('.article-card a');
    this.mostPopularArticleImages = page.locator('.article-card img');
    this.mostPopularArticleTitles = page.locator('.article-card__title');

    // Dev-03-Add “Our Top Brands” Section under Top Product Categories on Home Page
    this.ourTopBrandsSection = page.locator('.brands-section, section:has(h2:text("Our Top Brands"))').first();
    this.ourTopBrandsSectionHeading = page.locator('h2:text("Our Top Brands"), h2:text-is("Our Top Brands")').first();
    this.brandContainers = page.locator('.brand-item, .brands-section .brand-card, .brands-section li');
    this.brandShopNowButton = page.locator('.brands-section a:text("Shop Now"), .brand-item a:text("Shop Now")').first();

    // Dev-03-Add “Our Top Brands” Section under Top Product Categories on Home Page
    this.brandShopNowButtons = page.locator('.brand-container a:has-text("Shop Now"), .our-top-brands a:has-text("Shop Now")');

    // Dev-06-Footer Links Implementation
    this.footer = page.locator('footer.page-footer, footer').first();
    this.footerCompanyInfoLink = page.locator('footer a:has-text("Company Info")').first();
    this.footerLegalTermsLink = page.locator('footer a:has-text("Legal Terms")').first();
    this.footerPrivacyNoticeLink = page.locator('footer a:has-text("Privacy Notice")').first();
    this.footerTaxStrategyLink = page.locator('footer a:has-text("Tax Strategy")').first();
    this.footerModernSlaveryActLink = page.locator('footer a:has-text("Modern Slavery Act")').first();
    this.footerManageCookieSettingsLink = page.locator('footer a:has-text("Manage Cookie Settings")').first();
    this.footerMyAccountLink = page.locator('footer a:has-text("My Account")').first();
    this.footerDeliveryAndReturnsLink = page.locator('footer a:has-text("Delivery and Returns")').first();
    this.footerComplaintAndResolutionPolicyLink = page.locator('footer a:has-text("Complaint and Resolution Policy")').first();
    this.footerPageHeading = page.locator('h1').first();
    this.cookieSettingsModal = page.locator('#onetrust-pc-sdk').first();
    this.cookieSettingsModalTitle = page.locator('#onetrust-pc-sdk #pc-title').first();
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
