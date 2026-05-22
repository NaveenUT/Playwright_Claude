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

test.describe('Henry Schein - Cart Page', () => {

  test('TC01 - Verify the "View basket" button is displayed and navigates to the cart page when clicked',
    {
      tag: ['@smoke', '@regression', '@cart', '@sanity'],
      annotation: { type: 'feature', description: 'Verify View Basket button is visible on home page after login and navigates to /shoppingcart when clicked' },
    },
    async ({ cartPage, page }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(cartPage, cred);

      await test.step(`Assert that the "${TEST_DATA.cartPage.viewBasketButtonText}" button is displayed in the home page`, async () => {
        await expect(cartPage.viewBasketButton).toBeVisible();
        await expect(cartPage.viewBasketTooltipText).toHaveText(TEST_DATA.cartPage.viewBasketButtonText);
      });

      await test.step(`Click the "${TEST_DATA.cartPage.viewBasketButtonText}" button and assert navigation to the cart page: ${TEST_DATA.cartPage.cartPageUrl}`, async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.cartPage.cartPageUrl);
      });

      await test.step(`Assert that the cart page heading "${TEST_DATA.cartPage.cartPageHeading}" is displayed`, async () => {
        await expect(cartPage.cartPageHeading).toBeVisible();
      });
    });

  test('TC02 - Verify tooltip of the View basket button shows the correct quantity when products are added to the cart',
    {
      tag: ['@smoke', '@regression', '@cart'],
      annotation: {
        type: 'feature',
        description: 'Verify the cart icon quantity badge (tooltip) reflects the correct item count after adding products, and is absent when the basket is empty',
      },
    },
    async ({ cartPage, page }) => {
      const gloveQty = 1;
      const glassQty = 4;
      const totalQty = gloveQty + glassQty;
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(cartPage, cred);

      await test.step(`Verify the "${TEST_DATA.cartPage.viewBasketButtonText}" button is displayed in the home page`, async () => {
        await expect(cartPage.viewBasketButton).toBeVisible();
        await expect(cartPage.viewBasketTooltipText).toHaveText(TEST_DATA.cartPage.viewBasketButtonText);
      });

      await test.step(`Click the "${TEST_DATA.cartPage.viewBasketButtonText}" button and verify navigation to cart page: ${TEST_DATA.cartPage.cartPageUrl}`, async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.cartPage.cartPageUrl);
        await expect(cartPage.cartPageHeading).toBeVisible();
      });

      await test.step('Clear all existing products from the basket', async () => {
        await cartPage.clearBasket();
      });

      await test.step('Verify the cart quantity badge (tooltip) is not displayed when the basket is empty', async () => {
        await expect(cartPage.cartQuantityBadge).not.toBeVisible();
      });

      await test.step('Search for "mask" in the search bar', async () => {
        await cartPage.searchFor('mask');
      });

      await test.step(`Add the first mask product to cart with quantity ${gloveQty}`, async () => {
        await cartPage.addFirstProductToCart(gloveQty);
      });

      await test.step(`Verify the tooltip badge is visible and shows quantity "${gloveQty}" matching the added product quantity`, async () => {
        await expect(cartPage.cartQuantityBadge).toBeVisible();
        await expect(cartPage.cartQuantityBadge).toHaveText(String(gloveQty));
      });

      await test.step('Search for "glass" in the search bar', async () => {
        await cartPage.searchFor('glass');
      });

      await test.step(`Set quantity to ${glassQty} and add the first glass product to cart`, async () => {
        await cartPage.addFirstProductToCart(glassQty);
      });

      await test.step('Navigate to the cart page via the View Basket button', async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.cartPage.cartPageUrl);
      });

      await test.step(`Verify the cart total quantity (${totalQty}) matches the tooltip badge count`, async () => {
        await expect(cartPage.cartQuantityBadge).toHaveText(String(totalQty));
        await expect(page.getByText(`(${totalQty} Quantity)`)).toBeVisible();
      });
    });

  test('TC03 - Verify the Quick Order link is displayed and can add products to cart from Quick Order',
    {
      tag: ['@smoke', '@regression', '@cart'],
      annotation: {
        type: 'feature',
        description: 'Verify the Quick Order panel is visible on the cart page and products can be added by entering item codes with quantities',
      },
    },
    async ({ cartPage, page }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(cartPage, cred);

      await test.step(`Click the "${TEST_DATA.cartPage.viewBasketButtonText}" button and navigate to cart page: ${TEST_DATA.cartPage.cartPageUrl}`, async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.cartPage.cartPageUrl);
        await expect(cartPage.cartPageHeading).toBeVisible();
      });

      await test.step('Clear all existing products from the basket', async () => {
        await cartPage.clearBasket();
      });

      await test.step(`Verify the Quick Order link is displayed on the cart page`, async () => {
        await expect(cartPage.quickOrderBtn).toBeVisible();
      });

      await test.step(`Click the Quick Order link`, async () => {
        await cartPage.quickOrderBtn.click();
      });

      await test.step(`Enter item code "${TEST_DATA.cartPage.quickOrderItemCode1}" with quantity ${TEST_DATA.cartPage.quickOrderItemQty1} and add to basket`, async () => {
        await cartPage.addItemViaQuickAdd(
          TEST_DATA.cartPage.quickOrderItemCode1,
          TEST_DATA.cartPage.quickOrderItemQty1,
        );
      });

      await test.step(`Verify both items "${TEST_DATA.cartPage.quickOrderItemCode1}" and "${TEST_DATA.cartPage.quickOrderItemCode2}" are present in the cart`, async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.cartPage.cartPageUrl);
        await expect(page.locator(`[data-test-id="cart_${TEST_DATA.cartPage.quickOrderItemCode1}_deletebutton"]`)).toBeVisible();
      });
    });

  test('TC04 - Verify that products from Top Supplies and Top Equipment sections can be added to the cart',
    {
      tag: ['@smoke', '@regression', '@cart'],
      annotation: {
        type: 'feature',
        description: 'Browse Infection Control and Otoscopes categories, apply sub-category and attribute filters, add one product (qty 3) from each to the cart, and verify both appear in the Shopping Basket',
      },
    },
    async ({ cartPage, page }) => {
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(cartPage, cred);

      await test.step(`Click "${TEST_DATA.topCategoryCart.topSuppliesMenu}" in the menu and select "${TEST_DATA.topCategoryCart.infectionControlSubMenu}"`, async () => {
        await cartPage.navigateViaMenu(
          TEST_DATA.topCategoryCart.topSuppliesMenu,
          TEST_DATA.topCategoryCart.infectionControlSubMenu,
        );
      });

      await test.step(`Verify navigation to the Cleaning and Infection Control page: ${TEST_DATA.topCategoryCart.infectionControlUrl}`, async () => {
        await expect(page).toHaveURL(TEST_DATA.topCategoryCart.infectionControlUrl);
      });

      await test.step(`Select the "${TEST_DATA.topCategoryCart.eyeProtectionFilter}" checkbox under Sub Category`, async () => {
        await cartPage.selectFilter(TEST_DATA.topCategoryCart.eyeProtectionFilter);
      });

      await test.step(`Select the "${TEST_DATA.topCategoryCart.frameColourFilter}" checkbox under Frame Colour filter`, async () => {
        await cartPage.selectFilter(TEST_DATA.topCategoryCart.frameColourFilter);
      });

      await test.step('Click on the first product from the list and verify navigation to the product page', async () => {
        await cartPage.clickFirstProduct();
        await expect(page).toHaveURL(/\/p\//);
      });

      await test.step(`Select Side Shield option as "${TEST_DATA.topCategoryCart.sideShieldOptionValue}"`, async () => {
        await cartPage.selectProductOption(
          TEST_DATA.topCategoryCart.sideShieldOptionLabel,
          TEST_DATA.topCategoryCart.sideShieldOptionValue,
        );
      });

      await test.step(`Set quantity to ${TEST_DATA.topCategoryCart.productQuantity}`, async () => {
        await cartPage.setPdpQuantity(TEST_DATA.topCategoryCart.productQuantity);
      });

      await test.step('Click the Add to Cart button', async () => {
        await cartPage.addToCartFromPdp();
      });

      await test.step('Navigate back to the homepage', async () => {
        await cartPage.goToHomePage();
        await expect(page).toHaveURL(TEST_DATA.baseUrl);
      });

      await test.step(`Click "${TEST_DATA.topCategoryCart.topEquipmentMenu}" in the menu and select "${TEST_DATA.topCategoryCart.otoscopesSubMenu}"`, async () => {
        await cartPage.navigateViaMenu(
          TEST_DATA.topCategoryCart.topEquipmentMenu,
          TEST_DATA.topCategoryCart.otoscopesSubMenu,
        );
      });

      await test.step(`Verify navigation to the Otoscopes page: ${TEST_DATA.topCategoryCart.otoscopesUrl}`, async () => {
        await expect(page).toHaveURL(TEST_DATA.topCategoryCart.otoscopesUrl);
      });

      await test.step(`Select the "${TEST_DATA.topCategoryCart.woundDressingFilter}" checkbox under Sub Category`, async () => {
        await cartPage.selectFilter(TEST_DATA.topCategoryCart.woundDressingFilter);
      });

      await test.step(`Verify the "${TEST_DATA.topCategoryCart.adhesiveFilterSection}" filter section is displayed`, async () => {
        const isVisible = await cartPage.isFilterSectionVisible(TEST_DATA.topCategoryCart.adhesiveFilterSection);
        expect(isVisible).toBe(true);
      });

      await test.step(`Select "${TEST_DATA.topCategoryCart.adhesiveFilterValue}" under the Adhesive filter`, async () => {
        await cartPage.selectFilter(TEST_DATA.topCategoryCart.adhesiveFilterValue);
      });

      await test.step('Click on the first product from the list and verify navigation to the product page', async () => {
        await cartPage.clickFirstProduct();
        await expect(page).toHaveURL(/\/p\//);
      });

      await test.step(`Select size option "${TEST_DATA.topCategoryCart.sizeOptionValue}"`, async () => {
        await cartPage.selectProductOption(
          TEST_DATA.topCategoryCart.sizeOptionLabel,
          TEST_DATA.topCategoryCart.sizeOptionValue,
        );
      });

      await test.step(`Set quantity to ${TEST_DATA.topCategoryCart.productQuantity}`, async () => {
        await cartPage.setPdpQuantity(TEST_DATA.topCategoryCart.productQuantity);
      });

      await test.step('Click the Add to Cart button', async () => {
        await cartPage.addToCartFromPdp();
      });

      await test.step('Verify products from both Wound Dressing and Eye Protection categories are in the cart', async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.topCategoryCart.cartPageUrl);
        await expect(cartPage.cartPageHeading).toBeVisible();
        const lineItems = page.locator('[data-test-id*="cart_row"], [data-test-id*="cart_item"], tr[data-test-id]');
        await expect(lineItems.first()).toBeVisible();
        const badgeText = await cartPage.cartQuantityBadge.textContent();
        expect(Number(badgeText)).toBeGreaterThanOrEqual(6);
      });
    });

  test('TC05 - Verify "Save To Shopping List" is displayed, add products and save to a new shopping list, verify in My Lists & Favourites',
    {
      tag: ['@smoke', '@regression', '@cart'],
      annotation: {
        type: 'feature',
        description: 'After adding glove (qty 1) and glass (qty 4) products to the basket, save the basket as a new shopping list with a unique timestamped name and verify it appears on the My Lists & Favourites page',
      },
    },
    async ({ cartPage, page }) => {
      const listName = `new${Date.now()}`;
      const cred = await fetchCredentials(1, credentials[0]);
      await performLogin(cartPage, cred);

      await test.step('Navigate to the cart page and click "Clear This Basket" to empty the cart', async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.cartPage.cartPageUrl);
        await cartPage.clearBasket();
      });

      await test.step(`Search for "${TEST_DATA.shoppingList.gloveSearchTerm}" in the search bar`, async () => {
        await cartPage.searchFor(TEST_DATA.shoppingList.gloveSearchTerm);
      });

      await test.step(`Add the first product to cart with quantity ${TEST_DATA.shoppingList.gloveQty}`, async () => {
        await cartPage.addFirstProductToCart(TEST_DATA.shoppingList.gloveQty);
      });

      await test.step('Navigate to the cart page via the View Basket button', async () => {
        await cartPage.clickViewBasket();
        await expect(page).toHaveURL(TEST_DATA.cartPage.cartPageUrl);
      });

      await test.step(`Verify the "${TEST_DATA.shoppingList.saveToShoppingListText}" link is displayed and click it`, async () => {
        await expect(cartPage.saveToShoppingListOption).toBeVisible();
        await cartPage.clickSaveToShoppingList();
      });

      await test.step(`Verify the "${TEST_DATA.shoppingList.dialogTitle}" dialog box is displayed`, async () => {
        await expect(cartPage.saveShoppingListDialog).toBeVisible();
        await expect(page.locator(`text=${TEST_DATA.shoppingList.dialogTitle}`)).toBeVisible();
      });

      await test.step(`Enter new shopping list name: "${listName}"`, async () => {
        await cartPage.newListNameInput.fill(listName);
      });

      await test.step(`Select sharing option as "${TEST_DATA.shoppingList.sharingOptionDoNotShare}"`, async () => {
        await cartPage.sharingOptionTrigger.selectOption({ label: TEST_DATA.shoppingList.sharingOptionDoNotShare });
      });

      await test.step('Click the Save button', async () => {
        await cartPage.saveListBtn.click();
        await cartPage.waitForPageLoad();
      });

      await test.step('Navigate to My Lists & Favourites page and verify the new list is added', async () => {
        await cartPage.goToMyListsAndFavourites();
        await expect(page).toHaveURL('https://www.henryschein.co.uk/dashboard/myfavouritesandlists');
        await expect(page.locator(`//a[text()="${listName}"]`)).toBeVisible();
      });
    });

});
