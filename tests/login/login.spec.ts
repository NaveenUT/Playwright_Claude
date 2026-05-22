import { readFileSync } from 'fs';
import { resolve } from 'path';
import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';
import { getLoginCredentials, type LoginCredentials } from '../../utils/db';

// Loaded at collection time (sync) — determines how many TC01 tests appear in the report
const credentials: LoginCredentials[] = JSON.parse(
  readFileSync(resolve('test-data/credentials.json'), 'utf-8')
);

test.describe('Henry Schein - Login Functionality', () => {

  // TC01 — one test per user; credentials fetched live from DB at runtime
  // Falls back to credentials.json if DB is unavailable
  for (const [index, staticCred] of credentials.entries()) {
    const dbId = index + 1;

    test(`TC01 - Verify the user able to login with valid credentials [${staticCred.username}]`,
      {
        tag: ['@smoke', '@regression', '@login', '@sanity'],
        annotation: { type: 'feature', description: `Verify successful login for user: ${staticCred.username}` },
      },
      async ({ loginPage }) => {
        let cred: LoginCredentials = staticCred;

        await test.step(`Fetch credentials for user id=${dbId} from DB (fallback: credentials.json)`, async () => {
          try {
            cred = await getLoginCredentials(dbId);
          } catch {
            // DB unavailable — using static fallback from credentials.json
          }
        });

        await test.step('Click the Sign In link', async () => {
          await loginPage.signInLink.click();
        });
        await test.step(`Enter username: ${cred.username}`, async () => {
          await loginPage.usernameInput.fill(cred.username);
        });
        await test.step('Enter password', async () => {
          await loginPage.passwordInput.fill(cred.password);
        });
        await test.step('Click the Sign In button', async () => {
          await loginPage.signInButton.click();
        });
        await test.step('Assert that the user is logged in successfully', async () => {
          await expect(loginPage.accountMenu).toBeVisible();
        });
      });
  }

  test('TC02 - Verify the user can\'t able to login with invalid credentials and respective message is displayed',
    {
      tag: ['@smoke', '@regression', '@login'],
      annotation: { type: 'feature', description: 'Verify login fails with invalid credentials and an error message is shown' },
    },
    async ({ loginPage }) => {
      await test.step('Click the Sign In link', async () => {
        await loginPage.signInLink.click();
      });
      await test.step('Enter invalid username', async () => {
        await loginPage.usernameInput.fill(TEST_DATA.login.invalidUsername);
      });
      await test.step('Enter invalid password', async () => {
        await loginPage.passwordInput.fill(TEST_DATA.login.invalidPassword);
      });
      await test.step('Click the Sign In button', async () => {
        await loginPage.signInButton.click();
      });
      await test.step('Assert that the error message is displayed', async () => {
        await expect(loginPage.loginErrorMessage).toBeVisible();
      });
    });

  test('TC03 - Verify the forgot options is displayed for username and password',
    {
      tag: ['@smoke', '@regression', '@login'],
      annotation: { type: 'feature', description: 'Verify that the Forgot Username and Forgot Password links are visible on the login panel' },
    },
    async ({ loginPage }) => {
      await test.step('Click the Sign In link', async () => {
        await loginPage.signInLink.click();
      });
      await test.step('Assert that the Forgot Username link is visible', async () => {
        await expect(loginPage.forgotUsernameLink).toBeVisible();
      });
      await test.step('Assert that the Forgot Password link is visible', async () => {
        await expect(loginPage.forgotPasswordLink).toBeVisible();
      });
    });

  test('TC04 - Verify the forgot option is clicked in username , it moves to the Forgot your username? panel',
    {
      tag: ['@smoke', '@regression', '@login'],
      annotation: { type: 'feature', description: 'Verify clicking Forgot Username navigates to the Forgot your username? panel' },
    },
    async ({ loginPage }) => {
      await test.step('Click the Sign In link', async () => {
        await loginPage.signInLink.click();
      });
      await test.step('Click the Forgot Username link', async () => {
        await loginPage.forgotUsernameLink.click();
      });
      await test.step('Assert that the Forgot your username? panel heading is visible', async () => {
        await expect(loginPage.forgotUsernamePanelHeading).toBeVisible();
      });
      await test.step('Assert that the Forgot your username? panel heading has correct text', async () => {
        await expect(loginPage.forgotUsernamePanelHeading).toContainText('Forgot your username?');
      });
    });

  test('TC05 - Verify the forgot option is clicked in password, it moves to the Forgot your password? panel',
    {
      tag: ['@smoke', '@regression', '@login'],
      annotation: { type: 'feature', description: 'Verify clicking Forgot Password navigates to the Forgot your password? panel' },
    },
    async ({ loginPage }) => {
      await test.step('Click the Sign In link', async () => {
        await loginPage.signInLink.click();
      });
      await test.step('Click the Forgot Password link', async () => {
        await loginPage.forgotPasswordLink.click();
      });
      await test.step('Assert that the Forgot your password? panel heading is visible', async () => {
        await expect(loginPage.forgotPasswordPanelHeading).toBeVisible();
      });
      await test.step('Assert that the Forgot your password? panel heading has correct text', async () => {
        await expect(loginPage.forgotPasswordPanelHeading).toContainText('Forgot your password?');
      });
    });

});
