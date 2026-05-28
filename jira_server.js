import fs from "fs";
import axios from "axios";
import { spawn } from "child_process";
import "dotenv/config";

const JIRA_URL       = process.env.JIRA_URL;
const JIRA_EMAIL     = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY    = process.env.JIRA_PROJECT_KEY;

const AUTH_HEADER = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64")}`;

const jira = axios.create({
  baseURL: `${JIRA_URL}/rest/api/3`,
  headers: {
    Authorization: AUTH_HEADER,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Page registry ─────────────────────────────────────────────────────────────
// Each entry maps a topic to a framework page object.
// knownMembers = all locators + methods that already exist (nothing will be re-added).

const PAGE_REGISTRY = [
  {
    name: "login",
    file: "pages/LoginPage.ts",
    fixture: "loginPage",
    keywords: /login|sign.?in|credential|username|password|forgot/i,
    knownMembers: new Set([
      "setup", "navigate", "waitForPageLoad", "acceptCookies", "selectDomain",
      "login", "isSignInVisible", "page",
      "signInLink", "usernameInput", "passwordInput", "signInButton", "accountMenu",
      "loginErrorMessage", "forgotUsernameLink", "forgotPasswordLink",
      "forgotUsernamePanelHeading", "forgotPasswordPanelHeading",
    ]),
  },
  {
    name: "search",
    file: "pages/SearchPage.ts",
    fixture: "searchPage",
    keywords: /\bsearch\b|query|result/i,
    knownMembers: new Set([
      "setup", "navigate", "waitForPageLoad", "acceptCookies", "selectDomain",
      "searchFor", "searchWithEnterKey", "searchWithEmptyInput",
      "getCurrentUrl", "getResultsCount", "hasResults", "page",
      "searchInput", "searchBtn", "resultItems", "noResultsMessage",
    ]),
  },
  {
    name: "cart",
    file: "pages/CartPage.ts",
    fixture: "cartPage",
    keywords: /cart|basket|order|product|quantity|quick.?order|save.?to.?list/i,
    knownMembers: new Set([
      "setup", "navigate", "waitForPageLoad", "acceptCookies", "selectDomain",
      "login", "clickViewBasket", "clearBasket", "searchFor", "addFirstProductToCart",
      "navigateViaMenu", "selectFilter", "isFilterSectionVisible", "clickFirstProduct",
      "selectProductOption", "setPdpQuantity", "addToCartFromPdp", "goToHomePage",
      "clickSaveToShoppingList", "fillAndSaveShoppingList", "goToMyListsAndFavourites",
      "addItemViaQuickAdd", "page",
      "signInLink", "usernameInput", "passwordInput", "signInButton", "accountMenu",
      "viewBasketButton", "viewBasketTooltipText", "cartQuantityBadge", "cartPageHeading",
      "clearBasketOption", "searchInput", "searchBtn", "firstProductQuantityInput",
      "firstProductAddToBasketBtn", "quickOrderBtn", "itemCodeInput",
      "itemCodeAutocompleteFirstOption", "quickAddQuantityInput", "quickAddToBasketBtn",
      "cartItemCodes", "firstProductLink", "pdpQuantityInput", "pdpAddToCartBtn",
      "cartIconBtn", "saveToShoppingListOption", "saveShoppingListDialog",
      "newListNameInput", "sharingOptionTrigger", "saveListBtn", "product_grid",
    ]),
  },
  {
    name: "dashboard",
    file: "pages/accountDashboard.ts",
    fixture: "accountDashboardPage",
    keywords: /dashboard|account|budget|location|profile|barcode/i,
    knownMembers: new Set([
      "setup", "navigate", "waitForPageLoad", "acceptCookies", "selectDomain",
      "login", "getLocationsAssignedValue", "getBudgetFieldValue",
      "getBudgetFieldValue_locationOverbudget", "getBudgetFieldValue_locationUnderbudget",
      "navigateToDashboard", "page",
      "signInLink", "usernameInput", "passwordInput", "signInButton", "accountMenu",
      "dashboardHeading", "budgetOverviewSection", "locationsSection",
      "profileDetailsSection", "barcodeScannerSection", "totalAssignedLocationsLabel",
      "locationsOverBudgetLabel", "locationsUnderBudgetLabel", "manageBudgetLink",
      "viewLocationsButton", "locationsAssignedLabel", "profileDetailsToggle",
      "profileUsername", "barcodeScannersToggle", "downloadBarcodeSoftwareLink",
      "downloadBarcodeDriversLink", "shoppingBasketsSection", "shoppingBasketsViewAllButton",
      "shoppingBasketsItemCount", "searchInput", "clearBasketLink",
      "addToBasketButton", "product_grids",
    ]),
  },
  {
    name: "home",  // default fallback
    file: "pages/HomePage.ts",
    fixture: "homePage",
    keywords: null,
    knownMembers: new Set([
      "setup", "navigate", "waitForPageLoad", "getTitle", "getUrl", "pause",
      "acceptCookies", "selectDomain", "isCookieBannerVisible", "isDomainModalVisible",
      "searchFor", "getNavLink", "clickNavLink", "isSignInVisible", "page",
    ]),
  },
];

// Pick the best-matching page object from the registry
function detectPage(issueSummary, scenarios) {
  const text = (issueSummary + " " + scenarios.join(" ")).toLowerCase();
  for (const entry of PAGE_REGISTRY) {
    if (entry.keywords && entry.keywords.test(text)) return entry;
  }
  return PAGE_REGISTRY.find((p) => p.name === "home");
}

// Read every `this.xxx =` and `async xxx(` from a page file to list what exists
function getExistingMembers(pageFile) {
  if (!fs.existsSync(pageFile)) return [];
  const content  = fs.readFileSync(pageFile, "utf-8");
  const locators = [...content.matchAll(/this\.(\w+)\s*=/g)].map((m) => m[1]);
  const methods  = [...content.matchAll(/async\s+(\w+)\s*\(/g)].map((m) => m[1]);
  return [...new Set([...locators, ...methods])];
}

// ── Test output folder ────────────────────────────────────────────────────────
const JIRA_TESTS_DIR = "tests/jira";

function testFileExists(issueSummary) {
  const safeName      = issueSummary.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const canonicalPath = `${JIRA_TESTS_DIR}/${safeName}.spec.ts`;

  if (fs.existsSync(canonicalPath)) {
    const content = fs.readFileSync(canonicalPath, "utf-8").trim();
    if (content.startsWith("import")) return { exists: true, path: canonicalPath };
  }

  // Search the whole tests/ tree — catches manually created or ClickUp-generated tests
  function searchDir(dir) {
    if (!fs.existsSync(dir)) return null;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        const found = searchDir(fullPath);
        if (found) return found;
      } else if (entry.name.endsWith(".spec.ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes(issueSummary)) return { exists: true, path: fullPath };
      }
    }
    return null;
  }

  return searchDir("tests") ?? { exists: false, path: canonicalPath };
}

// ── Main poller ───────────────────────────────────────────────────────────────
async function checkTasks() {
  try {
    console.log("Checking Jira issues...");

    const jql      = `project = ${PROJECT_KEY} AND issuetype = Story AND status = "In QA"`;
    const response = await jira.get("/search/jql", {
      params: { jql, fields: "summary,status,subtasks", maxResults: 50 },
    });

    const issues = response.data.issues || [];
    console.log(`   Found ${issues.length} Story issue(s) in "In QA"`);

    for (const issue of issues) {
      const summary  = issue.fields.summary;
      const issueKey = issue.key;
      console.log(`\n   • [${issueKey}] "${summary}"`);

      const { exists, path: specPath } = testFileExists(summary);

      if (exists) {
        // Test exists in tests/jira — check for missing locators/testData
        if (specPath.startsWith(JIRA_TESTS_DIR)) {
          const existingTest = fs.readFileSync(specPath, "utf-8");
          const page         = detectPageFromTest(existingTest);
          const missingLoc   = extractMissingLocators(existingTest, page);
          const { missingKeys } = extractMissingTestDataPaths(existingTest);
          if (missingLoc.length === 0 && missingKeys.length === 0) {
            console.log(`ℹ️  [${issueKey}] test, locators and testData all up to date. Skipping.`);
          } else {
            console.log(`ℹ️  [${issueKey}] test file exists — updating missing locators/testData...`);
            await updatePageObject(existingTest, summary, page);
            await updateTestData(existingTest, summary);
          }
        } else {
          console.log(`ℹ️  [${issueKey}] test already exists at ${specPath}. Skipping.`);
        }
        continue;
      }

      // Fetch subtasks list from the parent issue
      const fullIssue   = await jira.get(`/issue/${issueKey}`, { params: { fields: "summary,status,subtasks" } });
      const subtaskRefs = fullIssue.data.fields.subtasks || [];
      console.log(`   [${issueKey}] has ${subtaskRefs.length} subtask(s):`);

      const subtasks = await Promise.all(
        subtaskRefs.map((sub) =>
          jira
            .get(`/issue/${sub.key}`, { params: { fields: "summary,status,description" } })
            .then((r) => r.data)
        )
      );

      for (const sub of subtasks) {
        console.log(`     • [${sub.key}] "${sub.fields.summary}" — status: "${sub.fields.status.name}"`);
      }

      const doneSubtasks = subtasks.filter((sub) => sub.fields.status.name.toLowerCase() === "done");

      if (doneSubtasks.length === 0) {
        console.log(`   ⏭  [${issueKey}] skipped — no subtasks with status "Done"`);
        continue;
      }

      console.log(`✅ [${issueKey}] — ${doneSubtasks.length} Done subtask(s) found`);
      await generateTest(issue, doneSubtasks);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.response) {
      console.error("   Status :", err.response.status);
      console.error("   Body   :", JSON.stringify(err.response.data, null, 2));
    }
  }
}

// ── ADF → plain text ──────────────────────────────────────────────────────────
function extractAdfText(node) {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  const children = node.content || [];
  const joined   = children.map(extractAdfText).join("");
  return ["paragraph", "heading", "listItem", "bulletList", "orderedList"].includes(node.type)
    ? joined + "\n"
    : joined;
}

// Extract "Test case scenarios" section and optional credentials from ADF description
function extractTestScenarios(adfDescription) {
  const rawText = extractAdfText(adfDescription);
  const lines   = rawText.split("\n").map((l) => l.trim());

  const startIdx = lines.findIndex((l) => /test case scenarios?/i.test(l));
  if (startIdx === -1) return { scenarios: [], credentials: {} };

  const scenarios   = [];
  const credentials = {};
  let inCredentials = false;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (/^credentials?\s*$/i.test(line)) { inCredentials = true; continue; }

    if (inCredentials) {
      const u = line.match(/username\s*[=:]\s*(.+)/i);
      const p = line.match(/password\s*[=:]\s*(.+)/i);
      if (u) credentials.username = u[1].trim();
      if (p) credentials.password = p[1].trim();
    } else {
      const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
      if (cleaned.length > 5) scenarios.push(cleaned);
    }
  }

  return { scenarios, credentials };
}

// ── Claude helpers ────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runClaude(prompt) {
  await sleep(10000);

  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["--print", "--tools", '""', "--no-session-persistence"], {
      shell: true,
      timeout: 600000,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code, signal) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim().slice(0, 300) || `code ${code} signal ${signal}`));
    });
    child.on("error", reject);

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function extractTypeScript(raw) {
  const fenceMatch = raw.match(/```(?:typescript|ts)\r?\n([\s\S]*?)\r?\n```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const plainFence = raw.match(/```\r?\n([\s\S]*?)\r?\n```/);
  if (plainFence && plainFence[1].trimStart().startsWith("import")) return plainFence[1].trim();

  const lines     = raw.split("\n");
  const importIdx = lines.findIndex((l) => l.trimStart().startsWith("import "));
  if (importIdx !== -1) return lines.slice(importIdx).join("\n").trim();

  return null;
}

// ── Locator helpers ───────────────────────────────────────────────────────────

// Detect which page entry is used in an already-generated test file
function detectPageFromTest(testCode) {
  for (const entry of PAGE_REGISTRY) {
    const regex = new RegExp(`\\b${entry.fixture}\\b`);
    if (regex.test(testCode)) return entry;
  }
  return PAGE_REGISTRY.find((p) => p.name === "home");
}

function extractMissingLocators(testCode, pageEntry) {
  const regex = new RegExp(`\\b${pageEntry.fixture}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\b`, "g");
  const found = new Set();
  let m;
  while ((m = regex.exec(testCode)) !== null) {
    if (!pageEntry.knownMembers.has(m[1])) found.add(m[1]);
  }
  if (!fs.existsSync(pageEntry.file)) return [...found];
  const existing = fs.readFileSync(pageEntry.file, "utf-8");
  return [...found].filter((name) => !existing.includes(`this.${name} =`));
}

async function updatePageObject(testCode, issueSummary, pageEntry) {
  const missing = extractMissingLocators(testCode, pageEntry);
  if (missing.length === 0) {
    console.log(`   ✅ All locators already exist in ${pageEntry.file}`);
    return;
  }

  console.log(`   📝 Missing locators in ${pageEntry.file}: ${missing.join(", ")}`);

  const prompt = `You are adding Playwright locators to the Henry Schein UK (henryschein.co.uk) ${pageEntry.name} page object.

Output ONLY in this exact format — no explanations, no markdown, no extra text:

DECLARATIONS:
  readonly locatorName: Locator;
ASSIGNMENTS:
    this.locatorName = page.locator('selector').first();

Rules:
- Selectors: prefer data-test-id, then aria-label, then role+text, then text content, then CSS class
- End each single-element assignment with .first()
- Plural locator names (ending in 's') target multiple elements — omit .first()
- Output ONLY the two sections above, nothing else

Missing locators for task "${issueSummary}":
${missing.map((n) => `- ${n}`).join("\n")}`;

  try {
    const raw = await runClaude(prompt);

    const declMatch   = raw.match(/DECLARATIONS:\r?\n([\s\S]*?)(?=ASSIGNMENTS:)/);
    const assignMatch = raw.match(/ASSIGNMENTS:\r?\n([\s\S]*?)$/);

    if (!declMatch || !assignMatch) {
      console.error("   ❌ Could not parse locator output. Raw:\n" + raw.slice(0, 400));
      return;
    }

    const declarations = declMatch[1].trimEnd();
    const assignments  = assignMatch[1].trimEnd();

    let content = fs.readFileSync(pageEntry.file, "utf-8");

    // Insert declarations before the constructor
    content = content.replace(
      /(\n  constructor\(page: Page\) \{)/,
      `\n  // ${issueSummary}\n${declarations}\n$1`
    );

    // Insert assignments at the end of the constructor body
    const constructorStart = content.indexOf("  constructor(page: Page) {");
    const afterConstructor  = content.indexOf("\n  async ", constructorStart);
    const beforeClose       = content.lastIndexOf("\n  }", afterConstructor);

    content =
      content.slice(0, beforeClose) +
      `\n\n    // ${issueSummary}\n${assignments}` +
      content.slice(beforeClose);

    fs.writeFileSync(pageEntry.file, content);
    console.log(`   ✅ ${pageEntry.file} updated with ${missing.length} new locator(s)`);
  } catch (err) {
    console.error(`   ❌ Failed to update ${pageEntry.file}:`, err.message);
  }
}

// ── Test data helpers ─────────────────────────────────────────────────────────
const TEST_DATA_PATH = "test-data/testData.ts";

function extractMissingTestDataPaths(testCode) {
  const regex = /\bTEST_DATA\.([a-zA-Z_][a-zA-Z0-9_.]*)\b/g;
  const paths = new Set();
  let m;
  while ((m = regex.exec(testCode)) !== null) paths.add(m[1]);

  const existing     = fs.readFileSync(TEST_DATA_PATH, "utf-8");
  const topLevelKeys = new Set([...paths].map((p) => p.split(".")[0]));
  const missingKeys  = [...topLevelKeys].filter((k) => !new RegExp(`\\b${k}\\s*:`).test(existing));

  return { allPaths: [...paths], missingKeys };
}

async function updateTestData(testCode, issueSummary) {
  const { allPaths, missingKeys } = extractMissingTestDataPaths(testCode);

  if (missingKeys.length === 0) {
    console.log("   ✅ All TEST_DATA keys already exist in testData.ts");
    return;
  }

  console.log(`   📝 Missing TEST_DATA keys: ${missingKeys.join(", ")}`);

  const missingPaths   = allPaths.filter((p) => missingKeys.some((k) => p.startsWith(k)));
  const currentContent = fs.readFileSync(TEST_DATA_PATH, "utf-8");

  const prompt = `You are adding test data entries to a Playwright TypeScript testData.ts file for the Henry Schein UK (henryschein.co.uk) website.

Current testData.ts content:
${currentContent}

The following TEST_DATA paths are referenced in a test but do not yet exist:
${missingPaths.map((p) => `- TEST_DATA.${p}`).join("\n")}

Task context: "${issueSummary}"

Output ONLY the TypeScript object entries to insert inside the TEST_DATA = { ... } object.
No import statements, no export keyword, no surrounding braces — just the property entries.
Use realistic placeholder values based on the Henry Schein UK website URLs and content.

Output format example:
  topCategories: {
    diagnosticsUrologyUrl: '/diagnostics-urology',
    paperProductsUrl: '/paper-products',
  },

Output ONLY the missing entries, nothing else.`;

  try {
    const raw = await runClaude(prompt);

    let entries = raw
      .replace(/^```(?:typescript|ts|json)?\r?\n/m, "")
      .replace(/\r?\n```\s*$/m, "")
      .trim();

    let content    = fs.readFileSync(TEST_DATA_PATH, "utf-8");
    const closeIdx = content.lastIndexOf("};");
    if (closeIdx === -1) {
      console.error("   ❌ Could not find end of TEST_DATA in testData.ts");
      return;
    }

    content =
      content.slice(0, closeIdx) +
      `  // ${issueSummary}\n  ${entries}\n` +
      content.slice(closeIdx);

    fs.writeFileSync(TEST_DATA_PATH, content);
    console.log("   ✅ testData.ts updated with new TEST_DATA entries");
  } catch (err) {
    console.error("   ❌ Failed to update testData.ts:", err.message);
  }
}

// ── Test generation ───────────────────────────────────────────────────────────
async function generateTest(parentIssue, subtasks) {
  const summary  = parentIssue.fields.summary;
  const issueKey = parentIssue.key;
  const safeName = summary.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const allScenarios = [];
  let credentials    = {};

  for (const sub of subtasks) {
    const parsed = extractTestScenarios(sub.fields.description);
    allScenarios.push(...parsed.scenarios);
    if (parsed.credentials.username) credentials = parsed.credentials;
  }

  if (allScenarios.length === 0) {
    console.warn(`⚠️  No "Test case scenarios" found in subtask descriptions for [${issueKey}] "${summary}". Skipping.`);
    return;
  }

  // Detect which page object is relevant
  const pageEntry      = detectPage(summary, allScenarios);
  const existingMembers = getExistingMembers(pageEntry.file);

  const testCaseList = allScenarios
    .map((scenario, idx) => `TC${String(idx + 1).padStart(2, "0")} - ${scenario}`)
    .join("\n");

  const credentialsNote = credentials.username
    ? `\nCredentials available:\n  Username: ${credentials.username}\n  Password: ${credentials.password}`
    : "";

  const prompt = `You are a Playwright TypeScript test automation engineer working on the Henry Schein UK (henryschein.co.uk) test framework.

Generate a Playwright TypeScript test file based ONLY on the test cases listed below.
Create exactly one test() block per listed test case — no more, no less.
Return ONLY valid TypeScript code — no markdown, no code fences, no explanations.

== FRAMEWORK RULES ==
1. Import test and expect from '../../fixtures/customFixtures'
2. Import TEST_DATA from '../../test-data/testData' (only if TEST_DATA is referenced)
3. The fixture to use is: ${pageEntry.fixture}
4. Wrap all tests in: test.describe('Henry Schein - ${summary}', () => { ... })
5. Every test() must have:
   - tag array e.g. ['@smoke', '@regression']
   - annotation: { type: 'feature', description: '...' }
   - test.step() for each action and each assertion
6. No hard waits — use expect(locator).toBeVisible(), toHaveURL(), toHaveText(), etc.
7. Use exact TC numbers as given below

== AVAILABLE LOCATORS & METHODS on ${pageEntry.fixture} ==
Use these names exactly — they already exist in ${pageEntry.file}:
${existingMembers.map((m) => `  ${pageEntry.fixture}.${m}`).join("\n")}

If you need a locator or method not in the list above, use a descriptive camelCase name
and it will be added to the page object automatically after generation.

== EXAMPLE ==
import { test, expect } from '../../fixtures/customFixtures';

test.describe('Henry Schein - Feature', () => {
  test('TC01 - Description',
    {
      tag: ['@smoke', '@regression'],
      annotation: { type: 'feature', description: 'What is verified' },
    },
    async ({ ${pageEntry.fixture} }) => {
      await test.step('Action description', async () => {
        await ${pageEntry.fixture}.signInLink.click();
      });
      await test.step('Assertion description', async () => {
        await expect(${pageEntry.fixture}.accountMenu).toBeVisible();
      });
    });
});

== TEST CASES (from Jira [${issueKey}] — generate these exactly) ==
${testCaseList}
${credentialsNote}

Return ONLY the TypeScript code starting with the import lines.`;

  console.log(`🤖 Generating ${allScenarios.length} test case(s) for: [${issueKey}] ${summary}`);
  console.log(`   Page object: ${pageEntry.file} (fixture: ${pageEntry.fixture})`);
  console.log("   Test cases:");
  allScenarios.forEach((s, i) => console.log(`   TC${String(i + 1).padStart(2, "0")} - ${s}`));

  try {
    const raw    = await runClaude(prompt);
    const output = extractTypeScript(raw);

    if (!output) {
      console.error(`❌ Claude did not return valid TypeScript for [${issueKey}]. Raw:\n${raw.slice(0, 300)}`);
      return;
    }

    if (!fs.existsSync(JIRA_TESTS_DIR)) fs.mkdirSync(JIRA_TESTS_DIR, { recursive: true });

    const filePath = `${JIRA_TESTS_DIR}/${safeName}.spec.ts`;
    fs.writeFileSync(filePath, output);
    console.log(`🎉 Test file written → ${filePath}`);

    await updatePageObject(output, summary, pageEntry);
    await updateTestData(output, summary);
  } catch (err) {
    console.error(`❌ Failed to generate test for [${issueKey}] "${summary}":`, err.message);
  }
}

// Run once and exit
checkTasks().then(() => process.exit(0));
