# Henry Schein – Framework Changes Log

---

## Session 1 — Framework Build & Enhancement

### New Files Created

| File | Description |
|---|---|
| `pages/LoginPage.ts` | Login page object — sign-in link, username/password inputs, forgot username/password locators and methods |
| `helpers/loginHelper.ts` | Shared login utility — `fetchCredentials()` (DB + fallback) and `performLogin()` used across cart and dashboard test suites |
| `tests/login/login.spec.ts` | Login test suite — TC01–TC05 covering valid login, invalid credentials, forgot username/password panels |
| `tests/cartPage/cartPage.spec.ts` | Cart test suite — TC01–TC05 covering view basket, quantity badge, quick order, category products, save to list |
| `tests/accountDashboard/accountDashboard.spec.ts` | Account Dashboard test suite — TC01–TC05 covering sections visible, budget overview, locations, profile/barcode, shopping baskets |
| `FRAMEWORK.md` | Full framework documentation — folder structure, layer breakdown, tag strategy, CI/CD pipelines, report URLs |

---

### Modified Files

#### `pages/BasePage.ts`
- `navigate(url)` now calls `acceptCookies()` after every `page.goto()` — ensures cookie banner is always dismissed on every navigation, not just initial page load

#### `pages/accountDashboard.ts`
- Fixed `getBudgetFieldValue()` locator — uses `.budgetOverView_label` class + `xpath=..` + `.budgetStatus_value1`
- Fixed `getBudgetFieldValue_locationOverbudget()` — uses `.budgetStatus_value3`
- Fixed `getBudgetFieldValue_locationUnderbudget()` — uses `.budgetStatus_value2`

#### `fixtures/customFixtures.ts`
- Added `loginPage` fixture → `LoginPage`
- Added `cartPage` fixture → `CartPage`
- Added `accountDashboardPage` fixture → `AccountDashboardPage`

#### `tests/homepage/homepage.spec.ts`
- TC01 — added `@sanity` tag

#### `tests/search/search.spec.ts`
- TC01 — added `@sanity` tag

#### `tests/cartPage/cartPage.spec.ts`
- Removed `test.only` from TC05 (was silently skipping all other tests)
- Added tags: `@smoke`, `@regression`, `@cart` on all tests; `@sanity` on TC01
- Replaced duplicated login steps with `fetchCredentials()` + `performLogin()` from `loginHelper`

#### `tests/accountDashboard/accountDashboard.spec.ts`
- Removed `test.only` from TC05
- Added tags: `@smoke`, `@regression`, `@dashboard` on all tests; `@sanity` on TC01
- Replaced duplicated login steps with `fetchCredentials()` + `performLogin()` from `loginHelper`
- Renamed describe block from `Dev-07-Account Dashboard Page` → `Account Dashboard Page`

#### `playwright.config.ts`
- Uncommented and enabled Firefox (`Desktop Firefox`) and WebKit (`Desktop Safari`) projects

#### `package.json`
Added new scripts:

| Script | Command |
|---|---|
| `npm run test:login` | Runs all `@login` tagged tests |
| `npm run test:cart` | Runs all `@cart` tagged tests |
| `npm run test:dashboard` | Runs all `@dashboard` tagged tests |
| `npm run test:sanity` | Runs all `@sanity` tagged tests (fastest post-deploy check) |

#### `.env`
Added Jira integration configuration:
```
JIRA_URL=https://naveencres96.atlassian.net
JIRA_EMAIL=naveencres96@gmail.com
JIRA_API_TOKEN=<stored locally>
JIRA_PROJECT_KEY=SCRUM
JIRA_ISSUE_TYPE=Story
JIRA_SUBTASK_TYPE=Subtask
JIRA_TRANSITION_TODO_ID=11
JIRA_TRANSITION_IN_PROGRESS_ID=21
JIRA_TRANSITION_IN_REVIEW_ID=31
JIRA_TRANSITION_DONE_ID=41
JIRA_TRANSITION_IN_QA_ID=42
```

---

### Tag Strategy (Final)

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

---

## Session 2 — Jira Integration

### New Files Created

| File | Description |
|---|---|
| `jira_server.js` | Jira integration server — mirrors `webhook-server.js` but uses Jira REST API v3 with Basic Auth |

### How `jira_server.js` Works

```
Jira Story → status "In QA"
  └── Subtask → status "Done" + description with "Test case scenarios"
        └── node jira_server.js
              ├── Detects correct page object from story name (login → LoginPage, cart → CartPage, etc.)
              ├── Reads all existing locators from the page file
              ├── Sends list to Claude → generates test using only real locators
              ├── Writes test → tests/jira/{story-name}.spec.ts
              ├── Adds any missing locators to the correct page file
              └── Adds any missing TEST_DATA entries to testData.ts
```

**Key differences from `webhook-server.js` (ClickUp):**

| Feature | ClickUp | Jira |
|---|---|---|
| Auth | `Authorization: API_KEY` header | `Authorization: Basic base64(email:token)` |
| API | `/api/v2/list/{id}/task` | `/rest/api/3/search/jql` |
| Description format | Plain text | ADF (Atlassian Document Format — JSON tree) |
| Status filter | Task status field | JQL: `status = "In QA"` |
| Output folder | `tests/{name}/` | `tests/jira/` |

**Smart page detection** — `detectPage()` matches story text against keywords:

| Keyword match | Page Object | Fixture |
|---|---|---|
| login, sign-in, credential, forgot | `LoginPage.ts` | `loginPage` |
| search, query, result | `SearchPage.ts` | `searchPage` |
| cart, basket, order, product, quick order | `CartPage.ts` | `cartPage` |
| dashboard, account, budget, location, profile | `accountDashboard.ts` | `accountDashboardPage` |
| (default) | `HomePage.ts` | `homePage` |

Run:
```bash
node jira_server.js
```

---

## Session 3 — Stability & Performance Enhancement

### New Files Created

| File | Description |
|---|---|
| `utils/waitHelpers.ts` | Advanced wait strategy library |
| `scripts/stability-check.js` | Multi-run stability validator |

---

### `utils/waitHelpers.ts` — Advanced Wait Strategy Library

| Export | Purpose |
|---|---|
| `waitForNetworkSettled(page, idleTime?, timeout?)` | Waits for network idle with graceful fallback to `domcontentloaded` |
| `waitForElementStable(locator, stableDuration?, timeout?)` | Waits until element bounding box stops changing — guards against animations and reflow |
| `retryAction(fn, retries?, delayMs?)` | Generic retry wrapper — runs any async function up to N times with delay |
| `retryClick(locator, retries?)` | Retry-aware click — handles intercepted clicks from overlays or Angular digest cycles |
| `waitForAngularStable(page, timeout?)` | Drains Angular zone pending tasks; no-op on non-Angular pages |
| `SoftAssert` class | Collects multiple assertion failures without stopping the test mid-run; call `.assert()` at the end to throw all at once |

**Usage in tests:**
```ts
import { SoftAssert, retryClick } from '../../utils/waitHelpers';

const soft = new SoftAssert();
await soft.check('heading visible', async () => {
  await expect(homePage.heroBanner).toBeVisible();
});
await soft.check('nav rendered', async () => {
  await expect(homePage.exploreAllMenu).toBeVisible();
});
soft.assert();  // throws combined failure if any check failed
```

---

### `scripts/stability-check.js` — Stability Validator

Runs a test tag N times and measures pass rate, flaky tests, and timing.

```bash
npm run stability:check:sanity   # 10 runs, @sanity, chromium
npm run stability:check:smoke    # 10 runs, @smoke, chromium
node scripts/stability-check.js 20 @login chromium   # custom
```

**Output:**
```
═══ Stability Report ═══
Tag             : @smoke
Project         : chromium
Iterations      : 10
Successful runs : 10 / 10
Pass rate       : 100.0%   (target: >99%)
Status          : ✅ STABLE

TIMING
  Average : 45.2s
  Fastest : 42.1s
  Slowest : 49.8s

FLAKY TESTS (0)
  None — all tests produced consistent results.
```

A JSON report is written to `stability-report/stability-report.json`.

---

### Modified Files

#### `pages/BasePage.ts`
- Added `retryClick(locator, retries?)` — delegates to `waitHelpers.retryClick`
- Added `waitForElementStable(locator, stableDuration?)` — delegates to `waitHelpers.waitForElementStable`
- `navigate()` now calls `waitForAngularStable()` before `acceptCookies()` — lets Angular settle before DOM interaction

#### `playwright.config.ts`

| Setting | Value | Effect |
|---|---|---|
| `expect.timeout` | `10000` ms | `expect(locator).toBeVisible()` waits up to 10s before failing |
| `actionTimeout` | `15000` ms | Each `click()`, `fill()`, etc. waits up to 15s |
| `navigationTimeout` | `30000` ms | Each `goto()` / URL wait allows up to 30s |

#### `package.json`
Added scripts:

| Script | Command |
|---|---|
| `npm run stability:check` | Run `node scripts/stability-check.js` (uses defaults: 10 × @smoke) |
| `npm run stability:check:sanity` | 10 iterations of `@sanity` on Chromium |
| `npm run stability:check:smoke` | 10 iterations of `@smoke` on Chromium |

#### `reporters/customReporter.ts`
Two additions to the custom HTML report:

**Stability Score card** — added to the summary row alongside Total / Passed / Failed / Flaky / Skipped / Pass Rate. Shows percentage of passing tests that needed no retry (green ≥99%, amber ≥90%, red <90%).

**Flaky Test Analysis section** — below the Retried Tests section:
- **Intermittent** — tests that failed on first attempt but passed on retry (true flaky tests)
- **Consistently Failing** — tests that failed on every attempt including retries
- Shows suite name, test name, retry count, and final status for each

---

## Full File Inventory

```
playwright_prompt_setup/
│
├── pages/
│   ├── BasePage.ts             ✏️  retryClick, waitForElementStable, waitForAngularStable in navigate()
│   ├── HomePage.ts
│   ├── LoginPage.ts            ✅  NEW — login locators and methods
│   ├── SearchPage.ts
│   ├── CartPage.ts
│   └── accountDashboard.ts     ✏️  fixed getBudgetFieldValue locators
│
├── tests/
│   ├── homepage/homepage.spec.ts    ✏️  @sanity on TC01
│   ├── login/login.spec.ts          ✅  NEW — TC01–TC05 with @login @smoke @regression @sanity
│   ├── search/search.spec.ts        ✏️  @sanity on TC01
│   ├── cartPage/cartPage.spec.ts    ✏️  tags, removed test.only, loginHelper
│   ├── accountDashboard/            ✏️  tags, removed test.only, loginHelper
│   └── jira/                        ✅  NEW — Jira-generated tests land here
│
├── fixtures/
│   └── customFixtures.ts            ✏️  loginPage, cartPage, accountDashboardPage fixtures added
│
├── helpers/
│   └── loginHelper.ts               ✅  NEW — fetchCredentials + performLogin
│
├── utils/
│   ├── config.ts
│   ├── db.ts
│   └── waitHelpers.ts               ✅  NEW — advanced wait strategy library
│
├── scripts/
│   └── stability-check.js           ✅  NEW — multi-run stability validator
│
├── reporters/
│   └── customReporter.ts            ✏️  stability score card + flaky test analysis section
│
├── webhook-server.js                 (ClickUp integration — unchanged)
├── jira_server.js                    ✅  NEW — Jira integration server
├── playwright.config.ts              ✏️  Firefox/WebKit, expect.timeout, actionTimeout, navigationTimeout
├── package.json                      ✏️  test:login, test:cart, test:dashboard, test:sanity, stability scripts
├── FRAMEWORK.md                      ✅  NEW — full framework documentation
├── CHANGES.md                        ✅  NEW — this file
└── .env                              ✏️  Jira configuration added
```

**Legend:** ✅ New file &nbsp;|&nbsp; ✏️ Modified

---

*Generated: Henry Schein Playwright Automation Framework*
