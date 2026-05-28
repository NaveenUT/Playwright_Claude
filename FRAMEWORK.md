# Henry Schein – Playwright Automation Framework

## Overview

End-to-end test automation framework for the Henry Schein UK e-commerce platform built with **Playwright** and **TypeScript**. The framework follows the **Page Object Model (POM)** pattern with centralised fixtures, shared helpers, and a tag-based execution strategy.

---

## Folder Structure

```
playwright_prompt_setup/
│
├── pages/                        # Page Object Model layer
│   ├── BasePage.ts               # Base class — navigation, cookies, domain selection
│   ├── HomePage.ts               # Home page locators and methods
│   ├── LoginPage.ts              # Login panel locators and methods
│   ├── SearchPage.ts             # Search page locators and methods
│   ├── CartPage.ts               # Cart / shopping list locators and methods
│   └── accountDashboard.ts       # Account Dashboard locators and methods
│
├── tests/                        # Test suites (one folder per feature)
│   ├── homepage/
│   │   └── homepage.spec.ts
│   ├── login/
│   │   └── login.spec.ts
│   ├── search/
│   │   └── search.spec.ts
│   ├── cartPage/
│   │   └── cartPage.spec.ts
│   └── accountDashboard/
│       └── accountDashboard.spec.ts
│
├── fixtures/
│   └── customFixtures.ts         # Playwright fixture definitions (page object injection)
│
├── helpers/
│   └── loginHelper.ts            # Shared login utility used across test suites
│
├── test-data/
│   ├── testData.ts               # Centralised static test data constants
│   └── credentials.json          # Static fallback login credentials
│
├── utils/
│   ├── config.ts                 # Environment configuration (baseUrl, domain, headless)
│   └── db.ts                     # MS SQL Server credential fetcher with fallback
│
├── reporters/
│   └── customReporter.ts         # Custom HTML reporter with charts and metrics
│
└── playwright.config.ts          # Playwright configuration (browsers, reporters, timeouts)
```

---

## Layer-by-Layer Breakdown

### 1. Configuration — `utils/config.ts` + `playwright.config.ts`

- Reads environment variables from `.env` (`BASE_URL`, `DOMAIN`, `HEADLESS`)
- Runs tests on **Chromium**, **Firefox**, and **WebKit**
- Timeout: 60 seconds per test
- Retries: 1 (both local and CI)
- Screenshots, videos, and traces captured on failure

### 2. Base Page — `pages/BasePage.ts`

All page objects extend `BasePage`. It provides:

| Method | Purpose |
|---|---|
| `navigate(url)` | Goes to URL and automatically calls `acceptCookies()` |
| `acceptCookies()` | Dismisses the Usercentrics cookie banner |
| `selectDomain(domain)` | Selects UK Medical / UK Dental / Ireland Dental |
| `waitForPageLoad()` | Waits for full page load state |
| `setup()` | Called once per test — navigate, accept cookies, select domain |

`setup()` is called automatically by every fixture before each test, so tests start on a fully loaded, domain-selected page with cookies handled.

### 3. Page Objects — `pages/`

Each page object extends `BasePage` and owns the locators and methods for one feature area:

| Page Object | Feature | Key Locators / Methods |
|---|---|---|
| `HomePage` | Home page UI | Header, nav links, hero banner, section locators |
| `LoginPage` | Login panel | `signInLink`, `usernameInput`, `signInButton`, `login()` |
| `SearchPage` | Search | `searchFor()`, `searchWithEnterKey()`, `hasResults()` |
| `CartPage` | Cart / basket | `addFirstProductToCart()`, `clearBasket()`, `clickViewBasket()` |
| `AccountDashboardPage` | Dashboard | `navigateToDashboard()`, `getBudgetFieldValue()`, budget/location/profile locators |

### 4. Fixtures — `fixtures/customFixtures.ts`

Fixtures are Playwright's dependency injection system. Each fixture:
1. Creates the page object
2. Calls `setup()` (navigate + cookies + domain)
3. Hands the ready-to-use object to the test
4. Cleans up after the test

| Fixture | Page Object |
|---|---|
| `homePage` | `HomePage` |
| `loginPage` | `LoginPage` |
| `searchPage` | `SearchPage` |
| `cartPage` | `CartPage` |
| `accountDashboardPage` | `AccountDashboardPage` |

Usage in tests:
```ts
async ({ cartPage, page }) => { ... }
```

### 5. Shared Helper — `helpers/loginHelper.ts`

Eliminates repeated login steps across test suites. Used in `cartPage.spec.ts` and `accountDashboard.spec.ts`.

```ts
// Fetch credentials from DB (fallback: credentials.json)
const cred = await fetchCredentials(1, credentials[0]);

// Perform full login with test.step wrappers
await performLogin(cartPage, cred);
```

| Function | What it does |
|---|---|
| `fetchCredentials(dbId, fallback)` | Queries MS SQL DB, falls back to `credentials.json` if unavailable |
| `performLogin(pageObj, cred)` | Clicks Sign In → fills username/password → asserts login success |

### 6. Test Data — `test-data/`

| File | Purpose |
|---|---|
| `testData.ts` | All static test data (URLs, labels, expected values, item codes) |
| `credentials.json` | Login credentials loaded at collection time for dynamic test generation |

`credentials.json` drives TC01 in `login.spec.ts` — one test is generated per user entry at collection time.

### 7. Database Utility — `utils/db.ts`

- Connects to MS SQL Server (`HS_UserData` database, Windows auth)
- `getLoginCredentials(id)` — fetches a single user's credentials by ID
- Falls back to `credentials.json` if the DB is unreachable (no test failure)

### 8. Test Suites — `tests/`

| Suite | Tests | Fixture Used |
|---|---|---|
| `homepage.spec.ts` | 6 — title, search bar, sign in/up links, nav, cart icon | `homePage` |
| `login.spec.ts` | 5+ — valid login (per user), invalid credentials, forgot username/password | `loginPage` |
| `search.spec.ts` | 4 — valid search, enter key, empty search, special characters | `searchPage` |
| `cartPage.spec.ts` | 5 — view basket, quantity badge, quick order, category products, save to list | `cartPage` |
| `accountDashboard.spec.ts` | 5 — sections visible, budget overview, locations, profile/barcode, shopping baskets | `accountDashboardPage` |

### 9. Tag Strategy

Every test has tags that control which suite it belongs to:

| Tag | Run command | Purpose |
|---|---|---|
| `@sanity` | `npm run test:sanity` | 1 critical test per feature — fastest post-deploy check |
| `@smoke` | `npm run test:smoke` | Critical happy-path tests |
| `@regression` | `npm run test:regression` | Full regression suite (all tests) |
| `@login` | `npm run test:login` | Login feature tests only |
| `@cart` | `npm run test:cart` | Cart feature tests only |
| `@dashboard` | `npm run test:dashboard` | Dashboard tests only |
| `@homepage` | `npm run test:homepage` | Homepage tests only |
| `@search` | `npm run test:search` | Search tests only |

### 10. Reporting

Three reporters run simultaneously after every test execution:

| Reporter | Output | Details |
|---|---|---|
| Playwright HTML | `playwright-report/` | Built-in — full trace, screenshots, videos |
| Monocart | `monocart-report/index.html` | Summary charts and test metadata |
| Custom HTML | `custom-report/index.html` | Pass rate, donut charts, per-suite stats, slow test detection |

View reports:
```bash
npm run test:report      # Opens playwright-report
npm run custom:report    # Serves custom-report on http://localhost:9325
```

---

## Running Tests

```bash
# Run all tests (Chromium + Firefox + WebKit)
npm test

# Run in headed mode
npm run test:headed

# Run by suite
npm run test:sanity       # Fastest — 1 test per feature
npm run test:smoke        # Critical path only
npm run test:regression   # Full suite

# Run by feature
npm run test:login
npm run test:cart
npm run test:dashboard
npm run test:homepage
npm run test:search
```

---

## CI/CD Pipeline

The framework has **two parallel CI/CD pipelines** — GitHub Actions and Jenkins — both running the same tests and publishing reports to the same GitHub Pages URL.

---

### GitHub Actions — `.github/workflows/playwright.yml`

#### Triggers
| Event | When |
|---|---|
| `push` | Every push to `main` branch |
| `pull_request` | Every PR targeting `main` |
| `schedule` | Daily at **6:00 AM IST** (cron: `30 0 * * *`) |

#### Jobs

```
┌─────────────────────────────────────┐
│           Job: test                 │
│  runs-on: ubuntu-latest             │
│                                     │
│  1. Checkout code                   │
│  2. Setup Node.js 24                │
│  3. npm ci                          │
│  4. Install Chromium browser        │
│  5. Run Smoke Tests  (@smoke)       │
│  6. Run Regression Tests (@regression)  ← only if smoke passes
│  7. Parse results.json → summary    │
│  8. Merge reports → gh-pages/       │
│  9. Upload report artifacts (30d)   │
│  10. Upload GitHub Pages artifact   │
└─────────────────────────────────────┘
          │ needs: test
          ▼
┌─────────────────────────────────────┐
│      Job: deploy-report             │
│  Publish reports to GitHub Pages    │
│  URL: github.io/Playwright_Claude   │
└─────────────────────────────────────┘
          │ needs: deploy-report
          ▼
┌─────────────────────────────────────┐
│       Job: send-email               │
│  Send email with:                   │
│  - Pass/Fail status                 │
│  - Test summary (per test result)   │
│  - Public GitHub Pages report links │
└─────────────────────────────────────┘
```

#### Environment Variables (GitHub Secrets / Vars)
| Variable | Purpose |
|---|---|
| `vars.BASE_URL` | Target site URL (default: `https://www.henryschein.co.uk`) |
| `vars.DOMAIN` | Domain selection (default: `UK Medical`) |
| `secrets.MAIL_USERNAME` | Gmail sender address |
| `secrets.MAIL_PASSWORD` | Gmail app password |
| `secrets.MAIL_TO` | Recipient email address |

---

### Jenkins Pipeline — `Jenkinsfile`

#### Required Jenkins Plugins
- **NodeJS Plugin** — provides Node 20 runtime
- **HTML Publisher Plugin** — publishes reports in Jenkins sidebar
- **Email Extension Plugin** — sends result emails
- **Credentials Binding** — injects GitHub token securely

#### Trigger
- Daily at **6:00 AM IST** (cron: `30 0 * * *`)
- Max build history: **30 builds**
- Concurrent builds: **disabled**
- Timeout: **30 minutes**

#### Pipeline Stages

```
┌──────────────────────────────────────┐
│  Stage 1: Checkout                   │
│  Clone repo from SCM                 │
└──────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────┐
│  Stage 2: Install Dependencies       │
│  npm ci                              │
└──────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────┐
│  Stage 3: Install Playwright Browsers│
│  npx playwright install chromium     │
└──────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────┐
│  Stage 4: Smoke Tests                │
│  npm run test:smoke --project=chromium│
└──────────────────────────────────────┘
          │ (only if smoke passes)
          ▼
┌──────────────────────────────────────┐
│  Stage 5: Regression Tests           │
│  npm run test:regression --project=chromium
└──────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────┐
│  Stage 6: Deploy Reports to          │
│  GitHub Pages (gh-pages branch)      │
│  - Copies playwright-report/         │
│  - Copies monocart-report/           │
│  - Copies custom-report/             │
│  - Creates index.html landing page   │
│  - Force-pushes to gh-pages branch   │
└──────────────────────────────────────┘
```

#### Post Actions (always runs)

| Action | Details |
|---|---|
| Publish HTML Reports | All 3 reports linked in Jenkins sidebar |
| Archive Artifacts | `playwright-report/`, `monocart-report/`, `custom-report/`, `results.json` |
| Parse results.json | Generates per-test PASS/FAIL/SKIP summary |
| Send Email | Build status, test summary, public GitHub Pages links |

#### Jenkins Credentials Required
| Credential ID | Type | Used For |
|---|---|---|
| `github-token` | Username + Password | Push reports to gh-pages branch |
| `gmail_credentials` | Username + Password | Send result email via Gmail SMTP |

---

### Published Reports — GitHub Pages

After every pipeline run, all three reports are publicly accessible:

| Report | URL |
|---|---|
| Landing Page | `https://naveenUT.github.io/Playwright_Claude/` |
| Custom Report | `https://naveenUT.github.io/Playwright_Claude/custom-report/` |
| Monocart Report | `https://naveenUT.github.io/Playwright_Claude/monocart-report/` |
| Playwright Report | `https://naveenUT.github.io/Playwright_Claude/playwright-report/` |

---

### Email Notification

Both pipelines send an email after every run containing:
- Job / repository name
- Branch and build number
- Overall status: **PASSED** or **FAILED**
- Per-test breakdown: `PASS | TC01 - ...` / `FAIL | TC02 - ...`
- Direct links to all three published reports

---

## How a Test Flows End-to-End

```
npm run test:dashboard
        │
        ▼
playwright.config.ts  ──► runs on Chromium + Firefox + WebKit
        │
        ▼
customFixtures.ts  ──►  accountDashboardPage fixture created
        │                └── new AccountDashboardPage(page)
        │                └── setup() called:
        │                      ├── navigate(baseUrl)
        │                      ├── acceptCookies()
        │                      ├── selectDomain('UK Medical')
        │                      └── waitForPageLoad()
        ▼
accountDashboard.spec.ts  ──►  test receives ready accountDashboardPage
        │
        ├── fetchCredentials()  ──►  utils/db.ts  (fallback: credentials.json)
        ├── performLogin()      ──►  helpers/loginHelper.ts
        ├── navigateToDashboard()  ──►  navigate('/dashboard') + acceptCookies()
        └── assertions using locators from accountDashboard.ts
        │
        ▼
reporters/customReporter.ts  ──►  custom-report/index.html
playwright HTML reporter     ──►  playwright-report/
monocart reporter            ──►  monocart-report/index.html
```
