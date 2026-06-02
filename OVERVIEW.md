# Henry Schein — Playwright Automation Framework Overview

> A full end-to-end test automation framework built with Playwright + TypeScript covering UI, API, mobile emulation, CI/CD, and stability reporting.

---

## 1. Technology Stack

| Tool | Purpose |
|---|---|
| **Playwright** v1.59 | Browser automation & test runner |
| **TypeScript** | Type-safe test code |
| **Node.js** 20 | Runtime |
| **GitHub Actions** | CI/CD pipeline |
| **GitHub Pages** | Test report hosting |

---

## 2. Framework Architecture — Page Object Model (POM)

```
playwright_prompt_setup/
│
├── pages/                        ← Page Object classes
│   ├── BasePage.ts               ← Base class (navigate, cookies, retry, wait helpers)
│   ├── HomePage.ts               ← Header, search, login panel, footer, mobile nav
│   ├── LoginPage.ts              ← Sign-in flow, forgot username/password
│   ├── SearchPage.ts             ← Search input, results, filters
│   ├── CartPage.ts               ← Basket, quick order, save to list
│   └── accountDashboard.ts       ← Budget, locations, profile, barcode scanners
│
├── tests/                        ← Test suites (spec files)
│   ├── homepage/                 ← TC01–TC06
│   ├── login/                    ← TC01–TC05
│   ├── search/                   ← TC01–TC04
│   ├── cartPage/                 ← TC01–TC05
│   ├── accountDashboard/         ← TC01–TC05
│   ├── API/                      ← TC01–TC25 (Grocery Store API)
│   └── mobile/                   ← TC01–TC10 (3 devices)
│
├── fixtures/
│   └── customFixtures.ts         ← Extended test fixtures (homePage, loginPage, etc.)
│
├── helpers/
│   └── loginHelper.ts            ← Shared login utility (fetchCredentials + performLogin)
│
├── utils/
│   ├── config.ts                 ← ENV config (BASE_URL, DOMAIN, DB credentials)
│   ├── db.ts                     ← MSSQL database connection for credential fetch
│   └── waitHelpers.ts            ← Advanced wait strategies
│
├── test-data/
│   └── testData.ts               ← All test data constants (URLs, labels, credentials)
│
├── reporters/
│   └── customReporter.ts         ← Custom HTML report with stability score + flaky analysis
│
├── scripts/
│   └── stability-check.js        ← Multi-run stability validator with HTML report
│
├── .github/workflows/
│   └── playwright.yml            ← Full CI/CD pipeline
│
├── jira_server.js                ← Jira integration (auto-generate tests from tickets)
└── webhook-server.js             ← ClickUp integration (auto-generate tests from tickets)
```

---

## 3. Test Suites

### 3.1 UI Tests — Henry Schein Website

| Spec File | Tests | Tags | What it covers |
|---|---|---|---|
| `homepage.spec.ts` | TC01–TC06 | `@smoke @homepage @regression @sanity` | Title, search bar, sign in/up links, nav links, cart icon |
| `login.spec.ts` | TC01–TC05 | `@smoke @login @regression @sanity` | Valid login (3 users), invalid credentials, forgot username/password |
| `search.spec.ts` | TC01–TC04 | `@smoke @search @regression @sanity` | Valid search, empty search, special chars, result validation |
| `cartPage.spec.ts` | TC01–TC05 | `@smoke @cart @regression @sanity` | View basket, quantity badge, quick order, top supplies/equipment, save to list |
| `accountDashboard.spec.ts` | TC01–TC05 | `@smoke @dashboard @regression @sanity` | Dashboard sections, budget overview, locations, profile/barcode, shopping baskets |

### 3.2 API Tests — Simple Grocery Store API

**Base URL:** `https://simple-grocery-store-api.click`

| Group | Tests | What it covers |
|---|---|---|
| Basic Flow (TC01–TC15) | 15 tests | Status check, products list/filter/limit, single product, 404, cart CRUD, auth + order CRUD |
| Complex Chain Flow (TC16–TC25) | 10 tests | Multi-step chains where each API response feeds the next request |

**TC16–TC25 Chain examples:**
- TC18: Product search → create cart → add product → verify in cart
- TC20: Add coffee product → replace with dairy product → verify item changed
- TC25: Full E2E: search → cart → order → update name → verify → delete → confirm 404

### 3.3 Mobile Emulation Tests

| Device | Viewport | Tests |
|---|---|---|
| iPhone 14 | 390 × 844 | TC01–TC10 |
| Pixel 7 | 412 × 915 | TC01–TC10 |
| iPad Pro 11 | 834 × 1194 | TC01–TC10 |

**Total: 30 test executions (10 × 3 devices)**

| TC | What it verifies |
|---|---|
| TC01 | Page title correct on mobile |
| TC02 | Hamburger menu visible |
| TC03 | Search bar accepts input |
| TC04 | Sign In accessible after opening mobile nav |
| TC05 | Cart icon visible in header |
| TC06 | Username input accessible after Sign In click |
| TC07 | No horizontal overflow on mobile |
| TC08 | Henry Schein logo visible |
| TC09 | Search results readable without overflow |
| TC10 | Page scrollable and footer reachable |

---

## 4. Tag Strategy

| Tag | Script | Purpose |
|---|---|---|
| `@sanity` | `npm run test:sanity` | 1 critical test per feature — fastest post-deploy check |
| `@smoke` | `npm run test:smoke` | Critical happy-path tests |
| `@regression` | `npm run test:regression` | Full regression suite |
| `@login` | `npm run test:login` | Login feature only |
| `@cart` | `npm run test:cart` | Cart feature only |
| `@dashboard` | `npm run test:dashboard` | Dashboard tests only |
| `@homepage` | `npm run test:homepage` | Homepage tests only |
| `@search` | `npm run test:search` | Search tests only |
| `@api` | — | API tests (Grocery Store) |
| `@mobile` | — | Mobile emulation tests |

---

## 5. Page Objects — Key Locators

### BasePage.ts (inherited by all pages)
- `navigate(url)` — goto + dismiss Angular zone + accept cookies
- `retryClick(locator)` — click with retry on intercepted clicks
- `waitForElementStable(locator)` — waits until element stops moving
- `acceptCookies()` — dismisses OneTrust banner

### HomePage.ts
- `searchInput`, `searchBtn` — search bar
- `signInLink`, `cartIcon`, `signUpLink` — header elements
- `hamburgerMenu`, `logo`, `mobileSignInLink` — mobile-specific
- `footer`, `heroBanner` — page structure
- `usernameInput`, `passwordInput`, `signInButton` — login panel

### LoginPage.ts
- `signInLink`, `usernameInput`, `passwordInput`, `signInButton`
- `forgotUsernameLink`, `forgotPasswordLink`
- `forgotUsernamePanelHeading`, `forgotPasswordPanelHeading`

### SearchPage.ts
- `searchInput`, `searchBtn`, `productResults`, `noResultsMessage`

### CartPage.ts
- `viewBasketBtn`, `basketQuantityBadge`, `quickOrderLink`
- `saveToShoppingListBtn`, `shoppingListDialog`

### AccountDashboardPage.ts
- `budgetOverviewSection`, `locationsSection`, `profileDetailsSection`
- `barcodeScannerSection`, `shoppingBasketsSection`
- `getBudgetFieldValue()` — reads budget field values

---

## 6. Advanced Wait Strategies — `utils/waitHelpers.ts`

| Export | Purpose |
|---|---|
| `waitForNetworkSettled(page)` | Network idle with graceful fallback |
| `waitForElementStable(locator)` | Waits until element bounding box stops changing |
| `retryAction(fn, retries)` | Generic async retry wrapper |
| `retryClick(locator)` | Retry-aware click — handles intercepted clicks |
| `waitForAngularStable(page)` | Drains Angular zone pending tasks |
| `SoftAssert` | Collects failures without stopping mid-test |

---

## 7. Reports

Four reports are generated per run and published to **GitHub Pages**:

### 7.1 Custom Report (`custom-report/index.html`)
- Summary cards: Total, Passed, Failed, Flaky, Skipped, Pass Rate, **Stability Score**
- Suite-by-suite breakdown with screenshots, video, trace links
- **Flaky Test Analysis** section — Intermittent vs Consistently Failing

### 7.2 Monocart Report (`monocart-report/index.html`)
- Charts, duration bars, tag breakdown, timeline view

### 7.3 Playwright HTML Report (`playwright-report/index.html`)
- Built-in Playwright report with trace viewer, step-by-step, video, screenshots

### 7.4 Stability Report (`stability-report/index.html`)
- Runs tests N times and measures consistency
- **Test Case Breakdown table** — grouped by spec file, shows pass/fail per iteration
- Bar chart (passed vs failed per run), line chart (duration trend)
- Flaky tests table, consistently failing tests table

```
npm run stability:check:sanity   # 10 runs × @sanity
npm run stability:check:smoke    # 10 runs × @smoke
node scripts/stability-check.js 3 @smoke chromium   # custom
```

**GitHub Pages landing page:** `https://naveenUT.github.io/Playwright_Claude/`

---

## 8. CI/CD Pipeline — GitHub Actions

**Triggers:** Push to `main`, Pull Request to `main`, Daily schedule at 06:00 AM IST

```
┌─────────────────────────────────────────────┐
│  JOB: test (ubuntu-latest, 60 min timeout)  │
├─────────────────────────────────────────────┤
│ 1. Checkout code                            │
│ 2. Setup Node.js 20                         │
│ 3. npm ci (cached)                          │
│ 4. Cache Playwright browsers (key: OS+lock) │
│ 5. Install system deps (chromium, 10 min)   │
│ 6. Install browser binary if cache miss     │
│ 7. Run @smoke tests                         │
│ 8. Run @regression tests (if smoke passes)  │
│ 9. Run stability check (3× @smoke)          │
│10. Parse test results → job output          │
│11. Parse stability results → job output     │
│12. Copy all reports → gh-pages/             │
│13. Upload artifacts (30-day retention)      │
│14. Upload GitHub Pages artifact             │
└─────────────────────────────────────────────┘
         ↓                    ↓
┌──────────────┐    ┌──────────────────────┐
│ deploy-report │    │     send-email       │
│ GitHub Pages  │    │  Gmail SMTP report   │
└──────────────┘    └──────────────────────┘
```

**Browser caching:** Playwright browsers (~170 MB) are cached by OS + `package-lock.json` hash. Cache hits skip the download entirely (only apt deps reinstalled, ~30s).

**Email includes:**
- Run status, repository, branch, trigger
- Full test results summary (PASS/FAIL per test)
- Stability summary (pass rate, per-test breakdown grouped by spec file)
- Direct links to all 4 reports on GitHub Pages

---

## 9. Integrations

### 9.1 Jira Integration — `jira_server.js`
Automatically generates Playwright test files from Jira tickets.

```
Jira Story → status "In QA"
  └── Subtask → status "Done" + "Test case scenarios" in description
        └── node jira_server.js
              ├── Detects page object from story name (login/cart/dashboard/search/home)
              ├── Reads existing locators from the correct page file
              ├── Sends to Claude → generates test using real locators only
              ├── Writes test → tests/jira/{story-name}.spec.ts
              └── Adds missing locators to the page object
```

**API:** Jira REST API v3 · Basic Auth (`base64(email:token)`) · JQL search

### 9.2 ClickUp Integration — `webhook-server.js`
Same concept as Jira but triggered by ClickUp task status changes to "Done".

---

## 10. Database Integration

Credentials are fetched from an **MSSQL database** at runtime via `helpers/loginHelper.ts`:

```typescript
const creds = await fetchCredentials(username);
// Falls back to testData.ts if DB is unavailable
await performLogin(page, creds.username, creds.password);
```

This means test credentials stay in the database, not hardcoded in test files.

---

## 11. Test Count Summary

| Suite | Spec Files | Test Cases | Browsers/Devices |
|---|---|---|---|
| UI Tests | 5 | 25 | Chromium, Firefox, WebKit |
| API Tests | 1 | 25 | — (HTTP only) |
| Mobile Tests | 1 | 10 × 3 = 30 | iPhone 14, Pixel 7, iPad Pro 11 |
| **Total** | **7** | **80** | **6 projects** |

---

## 12. Running Tests Locally

```bash
# Install
npm ci
npx playwright install chromium --with-deps

# Run by tag
npm run test:smoke        # critical paths
npm run test:sanity       # fastest check
npm run test:regression   # full suite
npm run test:login        # login feature only
npm run test:cart         # cart feature only
npm run test:dashboard    # dashboard only

# Run mobile tests
npx playwright test tests/mobile/ --project="iPhone 14"
npx playwright test tests/mobile/ --project="Pixel 7"
npx playwright test tests/mobile/ --project="iPad Pro 11"

# Run API tests
npx playwright test tests/API/

# Stability check
npm run stability:check:sanity   # 10 × @sanity
npm run stability:check:smoke    # 10 × @smoke

# Open stability report
npx http-server stability-report -o -p 9326

# Open custom report
npm run custom:report
```

---

*Henry Schein Playwright Automation Framework — Built with Claude Code*
