import fs from "fs";
import axios from "axios";
import { spawn } from "child_process";
import "dotenv/config";

const API_KEY = process.env.CLICKUP_API_KEY;
const LIST_ID = process.env.CLICKUP_LIST_ID;

function testFileExists(taskName) {
  const safeName = taskName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filePath = `tests/${safeName}/${safeName}.spec.ts`;
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8").trim();
  return content.startsWith("import");
}

async function checkTasks() {
  try {
    console.log("Checking ClickUp tasks...");

    const response = await axios.get(
      `https://api.clickup.com/api/v2/list/${LIST_ID}/task`,
      { headers: { Authorization: API_KEY }, params: { subtasks: true, include_closed: true } }
    );

    const tasks = response.data.tasks || [];
    console.log(`   Found ${tasks.length} task(s) in list`);

    // Only look at parent tasks (parent === null)
    const parentTasks = tasks.filter((t) => t.parent === null);
    console.log(`   ${parentTasks.length} parent task(s):`);
    for (const t of parentTasks) {
      console.log(`     • "${t.name}" — status: "${t.status.status}"`);
    }

    for (const task of parentTasks) {
      const status = task.status.status.toLowerCase();

      if (status !== "in qa") {
        console.log(`   ⏭  "${task.name}" skipped — status is "${task.status.status}" (need "In QA")`);
        continue;
      }

      if (testFileExists(task.name)) {
        const safeName = task.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const existingTest = fs.readFileSync(`tests/${safeName}/${safeName}.spec.ts`, "utf-8");
        const missingLoc = extractMissingLocators(existingTest);
        const { missingKeys } = extractMissingTestDataPaths(existingTest);
        if (missingLoc.length === 0 && missingKeys.length === 0) {
          console.log(`ℹ️  "${task.name}" — test, locators and testData all up to date. Skipping.`);
          continue;
        }
        console.log(`ℹ️  "${task.name}" — test file exists, updating missing locators/testData...`);
        await updatePageObject(existingTest, task.name);
        await updateTestData(existingTest, task.name);
        continue;
      }

      const subtaskResponse = await axios.get(
        `https://api.clickup.com/api/v2/task/${task.id}?include_subtasks=true`,
        { headers: { Authorization: API_KEY } }
      );

      const subtasks = subtaskResponse.data.subtasks || [];
      console.log(`   "${task.name}" has ${subtasks.length} subtask(s):`);
      for (const s of subtasks) {
        console.log(`     • "${s.name}" — status: "${s.status.status}"`);
      }

      const doneSubtasks = subtasks.filter(
        (sub) => sub.status.status.toLowerCase() === "done"
      );

      if (doneSubtasks.length === 0) {
        console.log(`   ⏭  "${task.name}" skipped — no subtasks with status "Done"`);
        continue;
      }

      console.log(`✅ "${task.name}" — ${doneSubtasks.length} Done subtask(s) found`);

      // Fetch full details of each Done subtask to get their descriptions
      const fullSubtasks = await Promise.all(
        doneSubtasks.map((sub) =>
          axios
            .get(`https://api.clickup.com/api/v2/task/${sub.id}`, {
              headers: { Authorization: API_KEY },
            })
            .then((r) => r.data)
        )
      );

      await generateTest(task, fullSubtasks);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.response) {
      console.error("   Status :", err.response.status);
      console.error("   Body   :", JSON.stringify(err.response.data, null, 2));
    }
  }
}

// Extract "Test case scenarios" section and credentials from plain-text ClickUp description
function extractTestScenarios(rawDescription) {
  // ClickUp descriptions come as plain text with \n line breaks
  const lines = (rawDescription || "")
    .replace(/<[^>]*>/g, " ")   // strip any HTML just in case
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.trim());

  // Find the "Test case scenarios" heading line
  const startIdx = lines.findIndex((l) =>
    /test case scenarios?/i.test(l)
  );
  if (startIdx === -1) return { scenarios: [], credentials: {} };

  const scenarios = [];
  const credentials = {};
  let inCredentials = false;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Detect "Credentials" heading
    if (/^credentials?\s*$/i.test(line)) {
      inCredentials = true;
      continue;
    }

    if (inCredentials) {
      const u = line.match(/username\s*[=:]\s*(.+)/i);
      const p = line.match(/password\s*[=:]\s*(.+)/i);
      if (u) credentials.username = u[1].trim();
      if (p) credentials.password = p[1].trim();
    } else {
      // Strip optional leading number "1. " or "1) "
      const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
      if (cleaned.length > 5) scenarios.push(cleaned);
    }
  }

  return { scenarios, credentials };
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runClaude(prompt) {
  // Pause between calls to avoid back-to-back rate limiting
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
      else {
        const detail = stderr.trim().slice(0, 300) || `code ${code} signal ${signal}`;
        reject(new Error(detail));
      }
    });
    child.on("error", reject);

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Extract the TypeScript code block from whatever Claude returns.
// Claude sometimes outputs markdown summaries or approval prompts around the code.
function extractTypeScript(raw) {
  // 1. Code fence with typescript/ts tag
  const fenceMatch = raw.match(/```(?:typescript|ts)\r?\n([\s\S]*?)\r?\n```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // 2. Plain code fence
  const plainFence = raw.match(/```\r?\n([\s\S]*?)\r?\n```/);
  if (plainFence && plainFence[1].trimStart().startsWith("import")) return plainFence[1].trim();

  // 3. Find first 'import' line and return everything from there
  const lines = raw.split("\n");
  const importIdx = lines.findIndex((l) => l.trimStart().startsWith("import "));
  if (importIdx !== -1) return lines.slice(importIdx).join("\n").trim();

  return null;
}

const PAGE_OBJECT_PATH = "pages/HomePage.ts";

const KNOWN_PAGE_METHODS = new Set([
  "setup", "navigate", "waitForPageLoad", "getTitle", "getUrl", "pause",
  "acceptCookies", "selectDomain", "isCookieBannerVisible", "isDomainModalVisible",
  "searchFor", "getNavLink", "clickNavLink", "isSignInVisible",
  "page",  // Playwright Page object fixture — not a locator
]);

function extractMissingLocators(testCode) {
  const regex = /\bhomePage\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const found = new Set();
  let m;
  while ((m = regex.exec(testCode)) !== null) {
    if (!KNOWN_PAGE_METHODS.has(m[1])) found.add(m[1]);
  }
  const existing = fs.readFileSync(PAGE_OBJECT_PATH, "utf-8");
  return [...found].filter((name) => !existing.includes(`this.${name} =`));
}

async function updatePageObject(testCode, taskName) {
  const missing = extractMissingLocators(testCode);
  if (missing.length === 0) {
    console.log("   ✅ All locators already exist in HomePage.ts");
    return;
  }

  console.log(`   📝 Missing locators: ${missing.join(", ")}`);

  const prompt = `You are adding Playwright locators to the Henry Schein UK (henryschein.co.uk) HomePage page object.

Output ONLY in this exact format — no explanations, no markdown, no extra text:

DECLARATIONS:
  readonly locatorName: Locator;
ASSIGNMENTS:
    this.locatorName = page.locator('selector').first();

Rules:
- Selectors: prefer data-test-id, then aria-label, then role+text, then text content, then CSS class
- End each single-element assignment with .first()
- Plural locator names (ending in 's' like shopNowButtons, categoryContainers) target multiple — omit .first()
- Output ONLY the two sections above, nothing else

Missing locators for task "${taskName}":
${missing.map((n) => `- ${n}`).join("\n")}`;

  try {
    const raw = await runClaude(prompt);

    const declMatch = raw.match(/DECLARATIONS:\r?\n([\s\S]*?)(?=ASSIGNMENTS:)/);
    const assignMatch = raw.match(/ASSIGNMENTS:\r?\n([\s\S]*?)$/);

    if (!declMatch || !assignMatch) {
      console.error("   ❌ Could not parse locator output. Raw:\n" + raw.slice(0, 400));
      return;
    }

    const declarations = declMatch[1].trimEnd();
    const assignments = assignMatch[1].trimEnd();

    let content = fs.readFileSync(PAGE_OBJECT_PATH, "utf-8");

    // Insert declarations before constructor with a section comment
    content = content.replace(
      /(\n  constructor\(page: Page\) \{)/,
      `\n  // ${taskName}\n${declarations}\n$1`
    );

    // Insert assignments at end of constructor body (just before its closing })
    // The constructor is always followed by the first method (async or getter)
    const constructorStart = content.indexOf("  constructor(page: Page) {");
    const afterConstructor = content.indexOf("\n  async ", constructorStart);
    const beforeClose = content.lastIndexOf("\n  }", afterConstructor);

    content =
      content.slice(0, beforeClose) +
      `\n\n    // ${taskName}\n${assignments}` +
      content.slice(beforeClose);

    fs.writeFileSync(PAGE_OBJECT_PATH, content);
    console.log(`   ✅ HomePage.ts updated with ${missing.length} new locator(s)`);
  } catch (err) {
    console.error("   ❌ Failed to update HomePage.ts:", err.message);
  }
}

const TEST_DATA_PATH = "test-data/testData.ts";

function extractMissingTestDataPaths(testCode) {
  const regex = /\bTEST_DATA\.([a-zA-Z_][a-zA-Z0-9_.]*)\b/g;
  const paths = new Set();
  let m;
  while ((m = regex.exec(testCode)) !== null) paths.add(m[1]);

  const existing = fs.readFileSync(TEST_DATA_PATH, "utf-8");
  // A path is "missing" if its top-level key isn't declared in TEST_DATA
  const topLevelKeys = new Set([...paths].map((p) => p.split(".")[0]));
  const missingKeys = [...topLevelKeys].filter((k) => !new RegExp(`\\b${k}\\s*:`).test(existing));

  return {
    allPaths: [...paths],
    missingKeys,
  };
}

async function updateTestData(testCode, taskName) {
  const { allPaths, missingKeys } = extractMissingTestDataPaths(testCode);

  if (missingKeys.length === 0) {
    console.log("   ✅ All TEST_DATA keys already exist in testData.ts");
    return;
  }

  console.log(`   📝 Missing TEST_DATA keys: ${missingKeys.join(", ")}`);

  const missingPaths = allPaths.filter((p) => missingKeys.some((k) => p.startsWith(k)));
  const currentContent = fs.readFileSync(TEST_DATA_PATH, "utf-8");

  const prompt = `You are adding test data entries to a Playwright TypeScript testData.ts file for the Henry Schein UK (henryschein.co.uk) website.

Current testData.ts content:
${currentContent}

The following TEST_DATA paths are referenced in a test but do not yet exist:
${missingPaths.map((p) => `- TEST_DATA.${p}`).join("\n")}

Task context: "${taskName}"

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

    // Strip any markdown fences
    let entries = raw.replace(/^```(?:typescript|ts|json)?\r?\n/m, "").replace(/\r?\n```\s*$/m, "").trim();

    // Find insertion point: just before the closing }; of TEST_DATA
    let content = fs.readFileSync(TEST_DATA_PATH, "utf-8");
    const closeIdx = content.lastIndexOf("};");
    if (closeIdx === -1) {
      console.error("   ❌ Could not find end of TEST_DATA in testData.ts");
      return;
    }

    content =
      content.slice(0, closeIdx) +
      `  // ${taskName}\n  ${entries}\n` +
      content.slice(closeIdx);

    fs.writeFileSync(TEST_DATA_PATH, content);
    console.log(`   ✅ testData.ts updated with new TEST_DATA entries`);
  } catch (err) {
    console.error("   ❌ Failed to update testData.ts:", err.message);
  }
}

async function generateTest(parentTask, subtasks) {
  const safeName = parentTask.name
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

  // Collect all unique test scenarios + credentials across all done subtasks
  const allScenarios = [];
  let credentials = {};

  for (const sub of subtasks) {
    const parsed = extractTestScenarios(sub.description);
    allScenarios.push(...parsed.scenarios);
    if (parsed.credentials.username) credentials = parsed.credentials;
  }

  if (allScenarios.length === 0) {
    console.warn(`⚠️  No "Test case scenarios" found in subtask descriptions for "${parentTask.name}". Skipping.`);
    return;
  }

  // Build numbered TC list for the prompt
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
2. Import TEST_DATA from '../../test-data/testData'
3. Fixtures: homePage, searchPage — each calls setup() which navigates to baseURL, accepts cookies, selects domain
4. Wrap all tests in: test.describe('Henry Schein - ${parentTask.name}', () => { ... })
5. Every test() must have:
   - tag array e.g. ['@smoke', '@regression']
   - annotation: { type: 'feature', description: '...' }
   - test.step() for each action and each assertion
6. No hard waits — use expect(locator).toBeVisible(), toHaveURL(), toHaveText(), etc.
7. Use exact TC numbers as given below

== EXAMPLE ==
import { test, expect } from '../../fixtures/customFixtures';
import { TEST_DATA } from '../../test-data/testData';

test.describe('Henry Schein - Feature', () => {
  test('TC01 - Description',
    {
      tag: ['@smoke', '@regression'],
      annotation: { type: 'feature', description: 'What is verified' },
    },
    async ({ homePage }) => {
      await test.step('Action description', async () => {
        await homePage.signInLink.click();
      });
      await test.step('Assertion description', async () => {
        await expect(homePage.someLocator).toBeVisible();
      });
    });
});

== TEST CASES (from ClickUp subtask — generate these exactly) ==
${testCaseList}
${credentialsNote}

Return ONLY the TypeScript code starting with the import lines.`;

  console.log(`🤖 Generating ${allScenarios.length} test case(s) for: ${parentTask.name}`);
  console.log("   Test cases:");
  allScenarios.forEach((s, i) =>
    console.log(`   TC${String(i + 1).padStart(2, "0")} - ${s}`)
  );

  try {
    const raw = await runClaude(prompt);
    const output = extractTypeScript(raw);

    if (!output) {
      console.error(`❌ Claude did not return valid TypeScript for "${parentTask.name}". Raw output:\n${raw.slice(0, 300)}`);
      return;
    }

    const dir = `tests/${safeName}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = `${dir}/${safeName}.spec.ts`;
    fs.writeFileSync(filePath, output);
    console.log(`🎉 Test file written → ${filePath}`);

    await updatePageObject(output, parentTask.name);
    await updateTestData(output, parentTask.name);
  } catch (err) {
    console.error(`❌ Failed to generate test for "${parentTask.name}":`, err.message);
  }
}

// Run once and exit
checkTasks().then(() => process.exit(0));
