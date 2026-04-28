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
};
