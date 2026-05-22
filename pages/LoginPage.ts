import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly signInLink: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly accountMenu: Locator;
  readonly loginErrorMessage: Locator;
  readonly forgotUsernameLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly forgotUsernamePanelHeading: Locator;
  readonly forgotPasswordPanelHeading: Locator;

  constructor(page: Page) {
    super(page);

    this.signInLink = page.locator('text=Sign In').first();
    this.usernameInput = page.locator('[data-test-id="login.username"], input[name="username"], #username, input[autocomplete="username"]').first();
    this.passwordInput = page.locator('[data-test-id="login.password"], input[name="password"], #password, input[type="password"]').first();
    this.signInButton = page.locator('[data-test-id="sign-in-button"]');
    this.accountMenu = page.locator('[data-test-id="user_details_component_li_32"]');
    this.loginErrorMessage = page.locator('[data-test-id="login.error"], .login-error, [class*="error-message"], [role="alert"]').first();
    this.forgotUsernameLink = page.locator('[data-test-id*="forgot-username-link-text"]');
    this.forgotPasswordLink = page.locator('[data-test-id*="forgot-password-link-text"]');
    this.forgotUsernamePanelHeading = page.locator("//div[@aria-label='Forgot username']");
    this.forgotPasswordPanelHeading = page.locator("//div[@aria-label='Forgot username overlay']")
  }

  async login(username: string, password: string): Promise<void> {
    await this.signInLink.click();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async isSignInVisible(): Promise<boolean> {
    return this.signInLink.isVisible();
  }
}
