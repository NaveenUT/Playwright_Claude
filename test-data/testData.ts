import { ENV_CONFIG } from '../utils/config';

export const TEST_DATA = {
  baseUrl: ENV_CONFIG.baseUrl,
  domain: ENV_CONFIG.domain,
  homePage: {
    title: 'Henry Schein',
    searchPlaceholder: 'Search Henry Schein',
    navLinks: ['Top Supplies', 'Top Equipment', 'Pharmaceuticals', 'Furniture', 'Clearance', 'Blog'],
  },
  search: {
    validProduct: 'gloves',
    specialChars: '@@@',
    expectedUrlParam: 'search',
  },
  login: {
    validUsername: 'Naveenkumar',
    validPassword: 'Welcome@123',
    invalidUsername: 'invalid_user',
    invalidPassword: 'invalid_pass',
    errorMessage: 'Invalid username or password',
  },
  mostPopularArticlesHeading: 'Most Popular Articles',
  topProductCategoriesSection: {
    title: 'Top Product Categories',
    expectedContainerCount: 5,
    categories: {
      diagnosticsUrology: 'Diagnostics & Urology',
      paperProducts: 'Paper Products',
      medicalInstruments: 'Medical Instruments',
      infectionControl: 'Infection Control',
    },
    urls: {
      diagnosticsUrology: 'diagnostics',
      paperProducts: 'paper-products',
      medicalInstruments: 'medical-instruments',
      infectionControl: 'infection-control',
    },
  },
  // Dev-05-Add “Top Equipment” Section below Most Popular Articles on Home Page
  topEquipment: {
    heading: 'Top Equipment',
    detailPageUrlPattern: /\/(dental-chairs|autoclaves-sterilisers|dental-compressors|x-ray-imaging|handpieces)/,
    items: ['Dental Chairs', 'Autoclaves & Sterilisers', 'Dental Compressors', 'X-Ray & Imaging', 'Handpieces'],
  },
  // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
  mostPopularArticles: {
    sectionHeadingText: 'Most Popular Articles',
    learnMoreButtonText: 'Learn More',
    learnMoreButtonSelector: 'a:has-text("Learn More")',
  },
  // Dev-02-Create Top Product Category Section on Home Page
  topProductCategories: {
    sectionTitle: 'Top Product Categories',
    diagnosticsAndUrology: 'Diagnostics & Urology',
    paperProducts: 'Paper Products',
    medicalInstruments: 'Medical Instruments',
    infectionControl: 'Infection Control',
    shopNowButtonText: 'Shop Now',
    diagnosticsAndUrologyUrl: '/diagnostics-urology',
    paperProductsUrl: '/paper-products',
    medicalInstrumentsUrl: '/medical-instruments',
    infectionControlUrl: '/infection-control',
  },
  // Dev-05-Add “Top Equipment” Section below Most Popular Articles on Home Page
  TOP_EQUIPMENT_HEADING: 'Top Equipment',
  TOP_EQUIPMENT_DETAIL_URL_PATTERN: /\/(dental-chairs|autoclaves-sterilisers|dental-compressors|x-ray-imaging|handpieces)/,
  // Dev-04-Add “Most Popular Articles” Section below Top Brands on Home Page
  HOME_PAGE_URL: '/',
  MOST_POPULAR_ARTICLES_HEADING: 'Most Popular Articles',
  // Dev-03-Add “Our Top Brands” Section under Top Product Categories on Home Page
  // Dev-03-Add "Our Top Brands" Section under Top Product Categories on Home Page
  ourTopBrandsHeading: 'Our Top Brands',
  ourTopBrandsCount: 6,
  shopNowButtonText: 'Shop Now',
  firstBrandPageUrl: '/brands',
  // Dev-03-Add “Our Top Brands” Section under Top Product Categories on Home Page
  ourTopBrands: {
    shopNowButtonText: 'Shop Now',
    firstBrandPageUrl: '/brands',
  },
  // Dev-07-Account Dashboard Page
  accountDashboard: {
    dashboardUrl: '/dashboard',
    pageTitle: 'Account',
    dashboardHeading: 'Welcome to Your Dashboard',
    sections: {
      budgetOverview: 'Budget Overview',
      locations: 'Locations',
      profileDetails: 'Profile Details',
      barcodeScanners: 'Barcode Scanners',
    },
    budgetFields: {
      totalAssignedLocations: 'Total Assigned Locations',
      locationsOverBudget: 'Locations Over Budget',
      locationsUnderBudget: 'Locations Under Budget',
      initialValue: '0',
    },
    manageBudgetLinkText: 'Manage Budget',
    manageBudgetUrl: 'https://www.henryschein.co.uk/Dashboard/BudgetManagement',
    locationsFields: {
      locationsAssigned: 'Locations Assigned',
      locationsAssignedValue: '1',
    },
    viewLocationsLinkText: 'View Locations',
    myOrganizationUrl: 'https://www.henryschein.co.uk/dashboard/myorganization',
    profileDetails: {
      expectedUsername: 'Naveenkumar',
    },
    barcodeScanners: {
      downloadSoftwareLinkText: 'Download Barcode Scanner Software',
      downloadDriversLinkText: 'Download Barcode Scanner Drivers',
    },
    shoppingBaskets: {
      sectionTitle: 'Shopping Baskets',
      viewAllLinkText: 'View All',
      viewAllUrl: 'https://www.henryschein.co.uk/dashboard/myorders?activetab=unplaced-orders-tab',
      searchPath: '/search/gloves?type=Products&exactSearch=false',
      expectedItemCount: '1items',
      DateCreated:'Date Created',
    },
  },
  // Cart Page
  cartPage: {
    viewBasketButtonText: 'View Basket',
    cartPageUrl: 'https://www.henryschein.co.uk/shoppingcart',
    cartPageTitle: 'Shopping Cart',
    cartPageHeading: 'Shopping Basket',
    quickOrderLinkText: 'Quick Order',
    quickOrderItemCode1: 'SCA511',
    quickOrderItemQty1: 3,
    quickOrderItemCode2: 'DIS207',
    quickOrderItemQty2: 4,
  },
  // TC05 — Save To Shopping List
  shoppingList: {
    saveToShoppingListText: 'Save To Shopping list',
    dialogTitle: 'Save to a Shopping List',
    sharingOptionDoNotShare: 'Do Not Share',
    myListsUrl: 'https://www.henryschein.co.uk/dashboard/myfavouritesandlists',
    gloveSearchTerm: 'glove',
    gloveQty: 1,
    glassSearchTerm: 'glass',
    glassQty: 4,
  },
  // TC04 — Top Supplies & Top Equipment cart flow
  topCategoryCart: {
    topSuppliesMenu: 'Top Supplies',
    infectionControlSubMenu: 'Infection Control',
    infectionControlUrl: 'https://www.henryschein.co.uk/c/cleaningandinfectioncontrol',
    eyeProtectionFilter: 'Eye Protection',
    frameColourFilter: 'Black',
    sideShieldOptionLabel: 'Side Shield',
    sideShieldOptionValue: 'NO',
    topEquipmentMenu: 'Top Equipment',
    otoscopesSubMenu: 'Otoscopes',
    otoscopesUrl: 'https://www.henryschein.co.uk/c/eyesearsnosethroat/otoscopes',
    woundDressingFilter: 'Wound Dressing',
    adhesiveFilterSection: 'Adhesive',
    adhesiveFilterValue: 'Yes',
    sizeOptionLabel: 'Size',
    sizeOptionValue: '10 x 10 cm',
    productQuantity: 3,
    cartPageUrl: 'https://www.henryschein.co.uk/shoppingcart',
  },
  // Dev-06-Footer Links Implementation
  // Dev-06-Footer Links Implementation
  footer: {
    companyInformation: 'Company Information',
    legalTerms: 'Legal Terms',
    privacyNotice: 'Privacy Notice',
    taxStrategy: 'Tax Strategy',
    modernSlaveryAct: 'Modern Slavery Act',
    manageCookieSettings: 'Manage Cookie Settings',
    myAccount: 'My Account',
    deliveryAndReturns: 'Delivery & Returns',
    complaintAndResolutionPolicy: 'Complaint & Resolution Policy',
    companyInformationUrl: '/company-information',
    legalTermsUrl: '/legal-terms',
    privacyNoticeUrl: '/privacy-notice',
    taxStrategyUrl: '/tax-strategy',
    modernSlaveryActUrl: '/modern-slavery-act',
    myAccountUrl: '/my-account',
    deliveryAndReturnsUrl: '/delivery-returns',
    complaintAndResolutionPolicyUrl: '/complaint-resolution-policy',
  },
};

