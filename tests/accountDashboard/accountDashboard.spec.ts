import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';
import { type LoginCredentials } from '../../utils/db';
import { fetchCredentials, performLogin } from '../../helpers/loginHelper';

// Loaded at collection time (sync) — determines credentials used at runtime
const credentials: LoginCredentials[] = JSON.parse(
  readFileSync(resolve('test-data/credentials.json'), 'utf-8')
);

test.describe('Henry Schein - Account Dashboard Page', () => {

  test('TC01 - Verify the "Budget Overview", "Locations", "Profile Details" and "Barcode Scanners" sections are displayed in the Account Dashboard Page',
    {
      tag: ['@smoke', '@regression', '@dashboard', '@sanity'],
      annotation: { type: 'feature', description: 'Verify all key sections are visible on the Account Dashboard page after successful login' },
    },
    async ({ accountDashboardPage }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(accountDashboardPage, cred);

      await test.step(`Navigate to the Account Dashboard page: ${TEST_DATA.accountDashboard.dashboardUrl}`, async () => {
        await accountDashboardPage.navigateToDashboard();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.sections.budgetOverview}" section is displayed`, async () => {
        await expect(accountDashboardPage.budgetOverviewSection).toBeVisible();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.sections.locations}" section is displayed`, async () => {
        await expect(accountDashboardPage.locationsSection).toBeVisible();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.sections.profileDetails}" section is displayed`, async () => {
        await expect(accountDashboardPage.profileDetailsSection).toBeVisible();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.sections.barcodeScanners}" section is displayed`, async () => {
        await expect(accountDashboardPage.barcodeScannerSection).toBeVisible();
      });
    });

  test('TC02 - Verify Budget Overview section displays "Total Assigned Locations", "Locations Over Budget" and "Locations Under Budget" fields with initial value "0" and "Manage Budget" link navigates correctly',
    {
      tag: ['@smoke', '@regression', '@dashboard'],
      annotation: { type: 'feature', description: 'Verify Budget Overview fields show initial value 0 and Manage Budget link navigates to BudgetManagement page' },
    },
    async ({ accountDashboardPage, page }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(accountDashboardPage, cred);

      await test.step(`Navigate to the Account Dashboard page: ${TEST_DATA.accountDashboard.dashboardUrl}`, async () => {
        await accountDashboardPage.navigateToDashboard();
      });

      await test.step(`Assert that "${TEST_DATA.accountDashboard.budgetFields.totalAssignedLocations}" is displayed in the Budget Overview section`, async () => {
        await expect(accountDashboardPage.totalAssignedLocationsLabel).toBeVisible();
      });

      await test.step(`Assert that "${TEST_DATA.accountDashboard.budgetFields.totalAssignedLocations}" has initial value "${TEST_DATA.accountDashboard.budgetFields.initialValue}"`, async () => {
        const value = await accountDashboardPage.getBudgetFieldValue(TEST_DATA.accountDashboard.budgetFields.totalAssignedLocations);
        expect(value).toBe(TEST_DATA.accountDashboard.budgetFields.initialValue);
      });

      await test.step(`Assert that "${TEST_DATA.accountDashboard.budgetFields.locationsOverBudget}" is displayed in the Budget Overview section`, async () => {
        await expect(accountDashboardPage.locationsOverBudgetLabel).toBeVisible();
      });

      await test.step(`Assert that "${TEST_DATA.accountDashboard.budgetFields.locationsOverBudget}" has initial value "${TEST_DATA.accountDashboard.budgetFields.initialValue}"`, async () => {
        const value = await accountDashboardPage.getBudgetFieldValue_locationOverbudget(TEST_DATA.accountDashboard.budgetFields.locationsOverBudget);
        expect(value).toBe(TEST_DATA.accountDashboard.budgetFields.initialValue);
      });

      await test.step(`Assert that "${TEST_DATA.accountDashboard.budgetFields.locationsUnderBudget}" is displayed in the Budget Overview section`, async () => {
        await expect(accountDashboardPage.locationsUnderBudgetLabel).toBeVisible();
      });

      await test.step(`Assert that "${TEST_DATA.accountDashboard.budgetFields.locationsUnderBudget}" has initial value "${TEST_DATA.accountDashboard.budgetFields.initialValue}"`, async () => {
        const value = await accountDashboardPage.getBudgetFieldValue_locationUnderbudget(TEST_DATA.accountDashboard.budgetFields.locationsUnderBudget);
        expect(value).toBe(TEST_DATA.accountDashboard.budgetFields.initialValue);
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.manageBudgetLinkText}" link is visible`, async () => {
        await expect(accountDashboardPage.manageBudgetLink).toBeVisible();
      });

      await test.step(`Assert that clicking "${TEST_DATA.accountDashboard.manageBudgetLinkText}" navigates to "${TEST_DATA.accountDashboard.manageBudgetUrl}"`, async () => {
        await accountDashboardPage.manageBudgetLink.click();
        await accountDashboardPage.waitForPageLoad();
        await expect(page).toHaveURL(TEST_DATA.accountDashboard.manageBudgetUrl);
      });
    });

  test('TC03 - Verify the Location Section has the Location Assigned value as 1 and "View Locations" link is visible and navigates to myorganization page',
    {
      tag: ['@smoke', '@regression', '@dashboard'],
      annotation: { type: 'feature', description: 'Verify Location Section displays Locations Assigned value as 1 and View Locations link navigates to myorganization page' },
    },
    async ({ accountDashboardPage, page }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(accountDashboardPage, cred);

      await test.step(`Navigate to the Account Dashboard page: ${TEST_DATA.accountDashboard.dashboardUrl}`, async () => {
        await accountDashboardPage.navigateToDashboard();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.sections.locations}" section is displayed`, async () => {
        await expect(accountDashboardPage.locationsSection).toBeVisible();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.locationsFields.locationsAssigned}" value is "${TEST_DATA.accountDashboard.locationsFields.locationsAssignedValue}"`, async () => {
        const value = await accountDashboardPage.getLocationsAssignedValue();
        expect(value).toBe(TEST_DATA.accountDashboard.locationsFields.locationsAssignedValue);
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.viewLocationsLinkText}" link is visible`, async () => {
        await expect(accountDashboardPage.viewLocationsButton).toBeVisible();
      });

      await test.step(`Assert that clicking "${TEST_DATA.accountDashboard.viewLocationsLinkText}" navigates to "${TEST_DATA.accountDashboard.myOrganizationUrl}"`, async () => {
        await accountDashboardPage.viewLocationsButton.click();
        await accountDashboardPage.waitForPageLoad();
        await expect(page).toHaveURL(TEST_DATA.accountDashboard.myOrganizationUrl);
      });
    });

  test('TC04 - Verify the Profile Details section displays the correct username and Barcode Scanners has two links "Download Barcode Scanner Software" and "Download Barcode Scanner Drivers"',
    {
      tag: ['@smoke', '@regression', '@dashboard'],
      annotation: { type: 'feature', description: 'Verify Profile Details shows correct username and Barcode Scanners section has both download links' },
    },
    async ({ accountDashboardPage }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(accountDashboardPage, cred);

      await test.step(`Navigate to the Account Dashboard page: ${TEST_DATA.accountDashboard.dashboardUrl}`, async () => {
        await accountDashboardPage.navigateToDashboard();
      });

      await test.step('Click the expand (+) button in the "Profile Details" section', async () => {
        await accountDashboardPage.profileDetailsToggle.click();
      });

      await test.step(`Assert that the username "${TEST_DATA.accountDashboard.profileDetails.expectedUsername}" is displayed in the Profile Details section`, async () => {
        await expect(accountDashboardPage.profileUsername).toBeVisible();
        const username = (await accountDashboardPage.profileUsername.textContent() ?? '').trim();
        expect(username).toBe(TEST_DATA.accountDashboard.profileDetails.expectedUsername);
      });

      await test.step('Click the expand (+) button in the "Barcode Scanners" section', async () => {
        await accountDashboardPage.barcodeScannersToggle.click();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.barcodeScanners.downloadSoftwareLinkText}" link is visible in the Barcode Scanners section`, async () => {
        await expect(accountDashboardPage.downloadBarcodeSoftwareLink).toBeVisible();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.barcodeScanners.downloadDriversLinkText}" link is visible in the Barcode Scanners section`, async () => {
        await expect(accountDashboardPage.downloadBarcodeDriversLink).toBeVisible();
      });
    });

  test('TC05 - Verify the "Shopping Baskets" section is NOT displayed when cart is empty and IS displayed with correct item count, date created, and "View All" link after adding an item to cart',
    {
      tag: ['@smoke', '@regression', '@dashboard'],
      annotation: { type: 'feature', description: 'Verify Shopping Baskets section is hidden when cart is empty and visible with correct data after adding an item to cart' },
    },
    async ({ accountDashboardPage, page }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(accountDashboardPage, cred);

      await test.step('Clear the basket if it has any items (navigate to cart and remove all)', async () => {
        await accountDashboardPage.navigate('/shoppingcart');
        await accountDashboardPage.waitForPageLoad();
        const clearLink = accountDashboardPage.clearBasketLink;
        if (await clearLink.isVisible()) {
          await clearLink.click();
          await accountDashboardPage.waitForPageLoad();
        }
      });

      await test.step(`Navigate to the Account Dashboard page: ${TEST_DATA.accountDashboard.dashboardUrl}`, async () => {
        await accountDashboardPage.navigateToDashboard();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.shoppingBaskets.sectionTitle}" section is NOT displayed when cart is empty`, async () => {
        await expect(accountDashboardPage.shoppingBasketsSection).not.toBeVisible();
      });

      await test.step(`Navigate to search results page to find a product: ${TEST_DATA.accountDashboard.shoppingBaskets.searchPath}`, async () => {
        await accountDashboardPage.navigate(TEST_DATA.accountDashboard.shoppingBaskets.searchPath);
        await accountDashboardPage.waitForPageLoad();
      });

      await test.step('Add the first product to the basket', async () => {
        await accountDashboardPage.product_grids.first().scrollIntoViewIfNeeded();
        await accountDashboardPage.product_grids.first().hover();
        await accountDashboardPage.addToBasketButton.click();
        await accountDashboardPage.waitForPageLoad();
      });

      await test.step(`Navigate back to the Account Dashboard page: ${TEST_DATA.accountDashboard.dashboardUrl}`, async () => {
        await accountDashboardPage.navigateToDashboard();
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.shoppingBaskets.sectionTitle}" section IS displayed after adding an item to cart`, async () => {
        await expect(accountDashboardPage.shoppingBasketsSection).toBeVisible();
      });

      await test.step(`Assert that the item count in the "${TEST_DATA.accountDashboard.shoppingBaskets.sectionTitle}" section is "${TEST_DATA.accountDashboard.shoppingBaskets.expectedItemCount}"`, async () => {
        await expect(accountDashboardPage.shoppingBasketsItemCount).toBeVisible();
        const count = (await accountDashboardPage.shoppingBasketsItemCount.textContent() ?? '').trim();
        expect(count).toContain(TEST_DATA.accountDashboard.shoppingBaskets.expectedItemCount);
      });

      await test.step('Assert that the date created is displayed in the Shopping Baskets section', async () => {
        await expect(accountDashboardPage.shoppingBasketsItemCount).toBeVisible();
        const datetext = (await accountDashboardPage.shoppingBasketsItemCount.textContent() ?? '').trim();
        expect(datetext).toContain(TEST_DATA.accountDashboard.shoppingBaskets.DateCreated);
      });

      await test.step(`Assert that the "${TEST_DATA.accountDashboard.shoppingBaskets.viewAllLinkText}" link is visible in the Shopping Baskets section`, async () => {
        await expect(accountDashboardPage.shoppingBasketsViewAllButton).toBeVisible();
      });

      await test.step(`Assert that clicking "${TEST_DATA.accountDashboard.shoppingBaskets.viewAllLinkText}" navigates to "${TEST_DATA.accountDashboard.shoppingBaskets.viewAllUrl}"`, async () => {
        await page.evaluate(() => {
          (document.querySelector('[data-test-id="dashboard_tiles_component_button_36"]') as HTMLElement)?.click();
        });
        await accountDashboardPage.waitForPageLoad();
        await expect(page).toHaveURL(TEST_DATA.accountDashboard.shoppingBaskets.viewAllUrl);
      });
    });

});
