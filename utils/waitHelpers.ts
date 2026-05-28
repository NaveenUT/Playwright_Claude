import { Page, Locator } from '@playwright/test';

/**
 * Wait for network to settle — no new requests for `idleTime` ms.
 * Falls back gracefully if networkidle is never reached within `timeout`.
 */
export async function waitForNetworkSettled(
  page: Page,
  idleTime = 500,
  timeout = 30000,
): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout })
    .catch(() => page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {}));
  if (idleTime > 0) await page.waitForTimeout(idleTime);
}

/**
 * Wait until a locator's bounding box stays the same for `stableDuration` ms.
 * Guards against elements that shift after appearing (animations, reflow).
 */
export async function waitForElementStable(
  locator: Locator,
  stableDuration = 300,
  timeout = 10000,
): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });

  const deadline = Date.now() + timeout;
  let lastBox    = await locator.boundingBox().catch(() => null);

  while (Date.now() < deadline) {
    await locator.page().waitForTimeout(stableDuration);
    const box = await locator.boundingBox().catch(() => null);

    if (
      box && lastBox &&
      box.x === lastBox.x && box.y === lastBox.y &&
      box.width === lastBox.width && box.height === lastBox.height
    ) {
      return;
    }
    lastBox = box;
  }
  throw new Error(`Element did not stabilize within ${timeout}ms`);
}

/**
 * Retry `fn` up to `retries` times with `delayMs` between attempts.
 * Throws the last error if all attempts fail.
 */
export async function retryAction<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastErr!: Error;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err as Error;
      if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/**
 * Click a locator with automatic retry.
 * Handles intercepted clicks (overlays, animations, Angular digest cycles).
 */
export async function retryClick(locator: Locator, retries = 3): Promise<void> {
  await retryAction(async () => {
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await locator.click({ timeout: 5000, force: false });
  }, retries, 800);
}

/**
 * Wait for an Angular app's zone to drain pending async tasks.
 * No-op if the app is not Angular — safe to call on any page.
 */
export async function waitForAngularStable(page: Page, timeout = 10000): Promise<void> {
  await page
    .evaluate(
      (t) =>
        new Promise<void>((resolve) => {
          const win = window as Window & {
            getAllAngularTestabilities?: () => { whenStable: (cb: () => void) => void }[];
          };
          if (!win.getAllAngularTestabilities) { resolve(); return; }
          const testabilities = win.getAllAngularTestabilities();
          if (testabilities.length === 0) { resolve(); return; }
          let pending = testabilities.length;
          const done = () => { if (--pending === 0) resolve(); };
          for (const t of testabilities) t.whenStable(done);
          setTimeout(resolve, t);  // fallback
        }),
      timeout,
    )
    .catch(() => {});
}

/**
 * Collect soft-assertion failures without aborting the test mid-run.
 * Call `softAssert.assert()` at the end to throw all collected failures at once.
 */
export class SoftAssert {
  private failures: string[] = [];

  async check(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.failures.push(`${label}: ${(err as Error).message}`);
    }
  }

  assert(): void {
    if (this.failures.length === 0) return;
    throw new Error(
      `${this.failures.length} soft assertion(s) failed:\n` +
      this.failures.map((f, i) => `  ${i + 1}. ${f}`).join('\n'),
    );
  }

  get failureCount(): number {
    return this.failures.length;
  }
}
