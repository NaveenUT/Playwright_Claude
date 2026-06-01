import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['monocart-reporter', {
      name: 'Henry Schein Test Report',
      outputFile: 'monocart-report/index.html',
    }],
    ['json', { outputFile: 'results.json' }],
    ['./reporters/customReporter.ts'],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.henryschein.co.uk',
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    // ── Desktop ──────────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/mobile/**/*.spec.ts',
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: '**/mobile/**/*.spec.ts',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: '**/mobile/**/*.spec.ts',
    },

    // ── Mobile ───────────────────────────────────────────────
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
      testMatch: '**/mobile/**/*.spec.ts',
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
      testMatch: '**/mobile/**/*.spec.ts',
    },
    {
      name: 'iPad Pro 11',
      use: { ...devices['iPad Pro 11'] },
      testMatch: '**/mobile/**/*.spec.ts',
    },
  ],
});
