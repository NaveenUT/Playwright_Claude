import { test, expect, type Locator } from '@playwright/test';
import { getLoginCredentials, type LoginCredentials } from '../utils/db';

interface LoginLocators {
  signInLink: Locator;
  usernameInput: Locator;
  passwordInput: Locator;
  signInButton: Locator;
  accountMenu: Locator;
}

export async function fetchCredentials(dbId: number, staticCred: LoginCredentials): Promise<LoginCredentials> {
  let cred = staticCred;
  await test.step(`Fetch credentials for user id=${dbId} from DB (fallback: credentials.json)`, async () => {
    try {
      cred = await getLoginCredentials(dbId);
    } catch {
      // DB unavailable — using static fallback from credentials.json
    }
  });
  return cred;
}

export async function performLogin(pageObj: LoginLocators, cred: LoginCredentials): Promise<void> {
  await test.step('Click the Sign In link', async () => {
    await pageObj.signInLink.click();
  });
  await test.step(`Enter username: ${cred.username}`, async () => {
    await pageObj.usernameInput.fill(cred.username);
  });
  await test.step('Enter password', async () => {
    await pageObj.passwordInput.fill(cred.password);
  });
  await test.step('Click the Sign In button', async () => {
    await pageObj.signInButton.click();
  });
  await test.step('Assert that the user is logged in successfully', async () => {
    await expect(pageObj.accountMenu).toBeVisible();
  });
}
