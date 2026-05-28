# webhook-server.js — Code Explanation

## Overview — What this file does

When you run `node webhook-server.js`, it:
1. Connects to **ClickUp API**
2. Finds tasks with status **"In QA"**
3. If subtasks are **"Done"** → generates a **Playwright test file** using Claude AI
4. Also updates **`HomePage.ts`** with locators and **`testData.ts`** with test data

---

## Full Flow

```
ClickUp "In QA" task found
        ↓
Subtasks all "Done"?
        ↓ YES
Extract test scenarios from subtask descriptions
        ↓
Ask Claude to write Playwright tests
        ↓
Save .spec.ts file
        ↓
Ask Claude for missing locators → update HomePage.ts
        ↓
Ask Claude for missing testData → update testData.ts
        ↓
Done ✅
```

---

## Section-by-Section Breakdown

### 1. Imports & Config

```javascript
const API_KEY = process.env.CLICKUP_API_KEY;
const LIST_ID = process.env.CLICKUP_LIST_ID;
```

| Variable | Purpose |
|---|---|
| `API_KEY` | ClickUp personal token (from `.env`) |
| `LIST_ID` | The ClickUp list ID where your tasks live (from `.env`) |

---

### 2. `testFileExists(taskName)`

```javascript
function testFileExists(taskName) {
  const safeName = taskName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filePath = `tests/${safeName}/${safeName}.spec.ts`;
  ...
}
```

- Converts task name to a safe folder/file name
- e.g. `"Dev-02-Create Top Product Category"` → `dev_02_create_top_product_category`
- Checks if a `.spec.ts` file already exists for that task
- Prevents re-generating tests that already exist

---

### 3. `checkTasks()` — Main Function

```
ClickUp API → get all tasks in LIST_ID
      │
      └── filter: parent === null  (only parent tasks, not subtasks)
              │
              └── filter: status === "In QA"
                      │
                      ├── test file already exists?
                      │       ├── YES → check missing locators/testData → update if needed → skip
                      │       └── NO  → fetch subtasks
                      │                     │
                      │                     └── filter: subtask status === "Done"
                      │                               │
                      │                               └── generateTest()
                      └── end
```

---

### 4. `extractTestScenarios(description)`

```javascript
// Input: raw ClickUp task description text
// Output: { scenarios: [...], credentials: { username, password } }
```

- Parses the ClickUp subtask description
- Finds the **"Test case scenarios"** heading
- Collects each scenario line below it as a test case
- Also extracts **Username/Password** if listed under a "Credentials" section

---

### 5. `sleep(ms)`

```javascript
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
```

- Pauses for `ms` milliseconds
- Used between Claude API calls to avoid rate limiting

---

### 6. `runClaude(prompt)`

```javascript
const child = spawn("claude", ["--print", "--tools", '""', "--no-session-persistence"])
```

| Flag | Purpose |
|---|---|
| `--print` | Non-interactive mode — just output the response and exit |
| `--tools ""` | Disables file write tools so Claude only outputs text |
| `--no-session-persistence` | Each call is independent, no memory of previous calls |
| `sleep(10000)` | Waits 10 seconds before each call to prevent rate limiting |

- Calls the **Claude CLI** on your machine
- Sends the prompt via `stdin`
- Returns Claude's response via `stdout`

---

### 7. `extractTypeScript(raw)`

```javascript
function extractTypeScript(raw) {
  // 1. Try ```typescript ... ``` fence
  // 2. Try plain ``` ... ``` fence
  // 3. Find first 'import' line and return everything from there
}
```

- Claude sometimes wraps code in markdown fences
- This function strips the markdown and returns only the TypeScript code

---

### 8. `extractMissingLocators(testCode)` + `updatePageObject()`

```
Scan test file for: homePage.someLocator
        ↓
Check if this.someLocator = already exists in HomePage.ts
        ↓ MISSING
Ask Claude → generate DECLARATIONS + ASSIGNMENTS
        ↓
Insert into HomePage.ts
```

- Finds every `homePage.xxx` reference in the generated test
- Checks which ones are missing from `HomePage.ts`
- Asks Claude to write the Playwright locator for each missing one
- Inserts them into the correct place in `HomePage.ts`

**Output format Claude is asked to return:**

```
DECLARATIONS:
  readonly locatorName: Locator;
ASSIGNMENTS:
    this.locatorName = page.locator('selector').first();
```

---

### 9. `extractMissingTestDataPaths()` + `updateTestData()`

```
Scan test file for: TEST_DATA.someKey.someValue
        ↓
Check if someKey already exists in testData.ts
        ↓ MISSING
Ask Claude → generate test data entries
        ↓
Insert into testData.ts
```

- Finds every `TEST_DATA.xxx` reference in the test file
- Adds missing entries into `testData.ts`

---

### 10. `generateTest(parentTask, subtasks)`

```
Scenarios from subtasks
        ↓
Build numbered TC list (TC01, TC02, TC03 ...)
        ↓
Send prompt to Claude with framework rules + TC list
        ↓
Claude returns TypeScript test file
        ↓
├── Write .spec.ts file
├── updatePageObject() → update HomePage.ts
└── updateTestData()   → update testData.ts
```

---

## File Output Structure

When a new ClickUp task is processed, these files are created/updated:

```
tests/
  dev_02_create_top_product_category/
    dev_02_create_top_product_category.spec.ts   ← generated by Claude

pages/
  HomePage.ts                                     ← new locators inserted

test-data/
  testData.ts                                     ← new TEST_DATA entries inserted
```

---

## Environment Variables Required (`.env`)

```env
CLICKUP_API_KEY=your_clickup_personal_token
CLICKUP_LIST_ID=your_list_numeric_id
```

---

## How to Run

```powershell
node webhook-server.js
```

---

## ClickUp Task Requirements

For the webhook to generate tests, your ClickUp task must be set up like this:

| Field | Required Value |
|---|---|
| Parent task status | `In QA` |
| Subtask status | `Done` |
| Subtask description | Must contain a `Test case scenarios` section |

**Example subtask description format:**

```
Test case scenarios
1. Verify the section is visible on the Home Page
2. Verify the section title is "Top Product Categories"
3. Verify four category containers are displayed

Credentials
Username: Naveenkumar
Password: Welcome@123
```
