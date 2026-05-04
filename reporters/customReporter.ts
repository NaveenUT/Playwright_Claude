import {
  Reporter,
  TestCase,
  TestResult,
  FullConfig,
  FullResult,
  Suite,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

interface TestEntry {
  name: string;
  suite: string;
  status: string;
  duration: number;
  tags: string[];
  error: string;
  errorExpected: string;
  errorReceived: string;
  errorLocation: string;
  errorLineNumber: number;
  errorCodeLine: string;
  errorFileName: string;
  browser: string;
  retryCount: number;
  screenshot: string;
  videoAbsPath: string;
  videoRelPath: string;
  traceAbsPath: string;
  traceRelPath: string;
}

class CustomReporter implements Reporter {
  private resultsMap = new Map<string, TestEntry>();
  private startTime: number = Date.now();

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
  }

  private parseError(result: TestResult): Pick<TestEntry,
    'error' | 'errorExpected' | 'errorReceived' | 'errorLocation' |
    'errorLineNumber' | 'errorCodeLine' | 'errorFileName'> {
    const rawMessage = result.errors?.[0]?.message ?? '';
    const rawStack   = result.errors?.[0]?.stack   ?? '';

    const error = rawMessage.split('\n').find(l => l.trim().length > 0) ?? '';
    const lines = rawMessage.split('\n');
    const errorExpected = lines.find(l => l.trim().startsWith('Expected'))?.trim() ?? '';
    const errorReceived = lines.find(l => l.trim().startsWith('Received'))?.trim() ?? '';

    const errorLocation = rawStack
      .split('\n')
      .find(l => (l.includes('.spec.ts') || l.includes('.test.ts')) && !l.includes('node_modules'))
      ?.trim() ?? '';

    let errorLineNumber = 0;
    let errorCodeLine   = '';
    let errorFileName   = '';
    const pathMatch = errorLocation.match(/([^\s()]+\.(?:spec|test)\.ts):(\d+):\d+/);
    if (pathMatch) {
      const rawPath   = pathMatch[1].trim();
      const filePath  = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
      errorLineNumber = parseInt(pathMatch[2], 10);
      errorFileName   = path.basename(filePath);
      try {
        const src = fs.readFileSync(filePath, 'utf8');
        errorCodeLine = src.split('\n')[errorLineNumber - 1]?.trim() ?? '';
      } catch {}
    }
    return { error, errorExpected, errorReceived, errorLocation, errorLineNumber, errorCodeLine, errorFileName };
  }

  private extractScreenshot(result: TestResult): string {
    const att = result.attachments.find(a => a.name === 'screenshot');
    if (!att) return '';
    if (att.body) return att.body.toString('base64');
    if (att.path) {
      try { return fs.readFileSync(att.path).toString('base64'); } catch {}
    }
    return '';
  }

  private extractVideoAbsPath(result: TestResult): string {
    const att = result.attachments.find(a => a.name === 'video');
    return att?.path ?? '';
  }

  private extractTraceAbsPath(result: TestResult): string {
    const att = result.attachments.find(a => a.name === 'trace');
    return att?.path ?? '';
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const tags    = test.tags ?? [];
    const browser = test.parent?.project()?.name ?? 'unknown';
    const suite   = test.parent?.title ?? '';
    const parsed       = this.parseError(result);
    const screenshot   = this.extractScreenshot(result);
    const videoAbsPath = this.extractVideoAbsPath(result);
    const traceAbsPath = this.extractTraceAbsPath(result);
    const existing = this.resultsMap.get(test.id);

    if (existing) {
      existing.status      = result.status;
      existing.duration    = Math.round(result.duration / 1000);
      existing.retryCount  = result.retry;
      if (screenshot)   existing.screenshot   = screenshot;
      if (videoAbsPath) existing.videoAbsPath = videoAbsPath;
      if (traceAbsPath) existing.traceAbsPath = traceAbsPath;
      Object.assign(existing, parsed);
    } else {
      this.resultsMap.set(test.id, {
        name: test.title,
        suite,
        status: result.status,
        duration: Math.round(result.duration / 1000),
        tags,
        browser,
        retryCount: 0,
        screenshot,
        videoAbsPath,
        videoRelPath: '',
        traceAbsPath,
        traceRelPath: '',
        ...parsed,
      });
    }
  }

  onEnd(_result: FullResult): void {
    const results = Array.from(this.resultsMap.values());

    // Copy videos and traces before HTML is built so rel paths are populated
    const outDir        = path.join(process.cwd(), 'custom-report');
    const videosDir     = path.join(outDir, 'videos');
    const tracesDir     = path.join(outDir, 'traces');
    const traceViewerSrc = path.join(
      path.dirname(require.resolve('playwright-core')),
      'lib/vite/traceViewer'
    );
    const traceViewerDst = path.join(outDir, 'trace-viewer');

    if (!fs.existsSync(outDir))         fs.mkdirSync(outDir,        { recursive: true });
    if (!fs.existsSync(videosDir))      fs.mkdirSync(videosDir,     { recursive: true });
    if (!fs.existsSync(tracesDir))      fs.mkdirSync(tracesDir,     { recursive: true });
    if (!fs.existsSync(traceViewerDst)) {
      fs.cpSync(traceViewerSrc, traceViewerDst, { recursive: true });
    }
    for (const r of results) {
      if (r.videoAbsPath && fs.existsSync(r.videoAbsPath)) {
        const filename = path.basename(r.videoAbsPath);
        fs.copyFileSync(r.videoAbsPath, path.join(videosDir, filename));
        r.videoRelPath = `videos/${filename}`;
      }
      if (r.traceAbsPath && fs.existsSync(r.traceAbsPath)) {
        const filename = path.basename(r.traceAbsPath);
        fs.copyFileSync(r.traceAbsPath, path.join(tracesDir, filename));
        r.traceRelPath = `traces/${filename}`;
      }
    }

    const totalDuration = Math.round((Date.now() - this.startTime) / 1000);
    const passed  = results.filter((r: TestEntry) => r.status === 'passed').length;
    const failed  = results.filter((r: TestEntry) => r.status === 'failed').length;
    const skipped = results.filter((r: TestEntry) => r.status === 'skipped').length;
    const flaky   = results.filter((r: TestEntry) => r.status === 'flaky').length;
    const total   = results.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const statusIcon = (_s: string) => '';

    const statusBadge = (s: string) => {
      const map: Record<string, string> = {
        passed:  'badge-pass',
        failed:  'badge-fail',
        flaky:   'badge-flaky',
        skipped: 'badge-skip',
      };
      return map[s] ?? 'badge-skip';
    };

    const stripAnsi = (str: string) =>
      str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '').replace(/\x1B\][^\x07]*\x07/g, '');

    const tagHtml = (tags: string[]) =>
      tags.map((t: string) => `<span class="tag">${t.replace('@', '')}</span>`).join(' ');

    const getSuggestion = (error: string): string => {
      const e = error.toLowerCase();
      if (e.includes('tobevisible'))   return 'Verify the locator is correct and the element exists in the DOM. It may be hidden, removed, or behind another element.';
      if (e.includes('tohavetext'))    return 'Check the expected text matches exactly, including whitespace and casing.';
      if (e.includes('tocontain'))     return 'Ensure the expected substring exists in the actual value.';
      if (e.includes('toequal'))       return 'The expected and actual values do not match. Verify the assertion value is correct.';
      if (e.includes('tohaveurl'))     return 'Verify the page navigated to the correct URL after the action.';
      if (e.includes('tohaveattribute')) return 'Check the attribute name and expected value on the element.';
      if (e.includes('timeout'))       return 'The element or condition was not met within the timeout. Consider increasing timeout or checking page load speed.';
      if (e.includes('locator'))       return 'The locator did not find a matching element. Update the selector to match the current DOM structure.';
      return 'Review the test logic, assertion values, and ensure the page state is correct before this step.';
    };

    // Group results by suite and sort each suite's tests by name ascending
    const suiteMap = new Map<string, TestEntry[]>();
    for (const r of results) {
      if (!suiteMap.has(r.suite)) suiteMap.set(r.suite, []);
      suiteMap.get(r.suite)!.push(r);
    }
    for (const tests of suiteMap.values()) {
      tests.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    }

    let globalIndex = 0;
    const rows = Array.from(suiteMap.entries()).map(([suiteName, suiteTests]) => {
      const testRows = suiteTests.map(r => {
        const i = globalIndex++;
        const cleanError = stripAnsi(r.error);
        const failedLine = r.errorLineNumber
          ? `Line ${r.errorLineNumber}  —  ${r.errorCodeLine}  —  ${r.errorFileName}`
          : '';
        return `
        <tr class="row-${r.status}" onclick="toggleError(${i})">
          <td>${statusIcon(r.status)} <span class="${statusBadge(r.status)}">${r.status.toUpperCase()}</span></td>
          <td class="test-name">${r.name}</td>
          <td>${tagHtml(r.tags)}</td>
          <td><span class="browser-badge">${r.browser}</span></td>
          <td class="duration">${r.duration}s</td>
        </tr>
        ${cleanError ? `
        <tr class="error-row" id="err-${i}" style="display:none">
          <td colspan="5">
            <div class="error-block">
              <div class="error-line"><span class="error-label">Assertion</span><span class="error-value">${cleanError}</span></div>
              ${r.errorExpected ? `<div class="error-line"><span class="error-label">Expected</span><span class="error-value expected">${stripAnsi(r.errorExpected)}</span></div>` : ''}
              ${r.errorReceived ? `<div class="error-line"><span class="error-label">Received</span><span class="error-value received">${stripAnsi(r.errorReceived)}</span></div>` : ''}
              ${failedLine ? `<div class="error-line"><span class="error-label">Failed At</span><span class="error-value">${failedLine}</span></div>` : ''}
              ${(r.screenshot || r.videoRelPath || r.traceRelPath) ? `
              <div class="media-row">
                ${r.screenshot ? `
                <div class="media-item">
                  <div class="media-label">Screenshot</div>
                  <img class="screenshot-thumb" src="data:image/png;base64,${r.screenshot}" onclick="openLightbox(this.src)" title="Click to enlarge" />
                </div>` : ''}
                ${r.videoRelPath ? `
                <div class="media-item">
                  <div class="media-label">Video</div>
                  <div class="video-thumb-wrap" onclick="openVideoModal('${r.videoRelPath}')" title="Click to play">
                    <video class="video-thumb" muted preload="metadata">
                      <source src="${r.videoRelPath}" type="video/webm">
                    </video>
                    <div class="play-btn">&#9654;</div>
                  </div>
                </div>` : ''}
                ${r.traceRelPath ? `
                <div class="media-item">
                  <div class="media-label">Trace</div>
                  <div class="trace-wrap">
                    <a class="trace-btn" href="trace-viewer/index.html?trace=../${r.traceRelPath}" target="_blank" title="Open trace viewer">
                      <span class="trace-icon">&#128269;</span> VIEW TRACE
                    </a>
                    <div class="trace-hint">Run: <code>npm run custom:report</code></div>
                  </div>
                </div>` : ''}
              </div>` : ''}
            </div>
          </td>
        </tr>` : ''}`;
      }).join('');

      return `
      <tr class="suite-header-row">
        <td colspan="5">${suiteName}</td>
      </tr>
      ${testRows}`;
    }).join('');

    const totalTestDuration = results.reduce((sum: number, r: TestEntry) => sum + r.duration, 0);
    const avgTime = total > 0 ? Math.round(totalTestDuration / total) : 0;
    const slowTests = results
      .filter((r: TestEntry) => r.duration > avgTime)
      .sort((a: TestEntry, b: TestEntry) => b.duration - a.duration);

    const slowBySuite = new Map<string, TestEntry[]>();
    for (const r of slowTests) {
      if (!slowBySuite.has(r.suite)) slowBySuite.set(r.suite, []);
      slowBySuite.get(r.suite)!.push(r);
    }
    const slowRows = Array.from(slowBySuite.entries()).map(([suite, tests]) => `
      <div class="slow-suite-header">${suite}</div>
      ${tests.map(r => `
      <div class="slow-row">
        <span class="slow-name">${r.name}</span>
        <span class="slow-duration ${r.duration > avgTime * 2 ? 'very-slow' : ''}">${r.duration}s</span>
      </div>`).join('')}`).join('');

    // Retried tests
    const retriedTests = results.filter((r: TestEntry) => r.retryCount > 0);
    const retryRows = retriedTests.map((r: TestEntry) => `
      <tr>
        <td class="retry-suite">${r.suite}</td>
        <td class="retry-name">${r.name}</td>
        <td><span class="retry-count-badge">${r.retryCount}×</span></td>
        <td>${statusIcon(r.status)} <span class="${statusBadge(r.status)}">${r.status.toUpperCase()}</span></td>
        <td class="retry-error">
          ${stripAnsi(r.error) || '—'}
          ${r.errorLineNumber ? `<div class="retry-failed-at">Line ${r.errorLineNumber} — ${r.errorCodeLine} — ${r.errorFileName}</div>` : ''}
        </td>
        <td class="retry-suggestion">${r.error ? getSuggestion(stripAnsi(r.error)) : '—'}</td>
      </tr>`).join('');

    // Suite-wise pass/fail percentages for bar chart
    const suiteBarLabels = JSON.stringify(Array.from(suiteMap.keys()));
    const suitePassPct   = JSON.stringify(Array.from(suiteMap.values()).map(tests => {
      const p = tests.filter(t => t.status === 'passed').length;
      return Math.round((p / tests.length) * 100);
    }));
    const suiteFailPct   = JSON.stringify(Array.from(suiteMap.values()).map(tests => {
      const f = tests.filter(t => t.status === 'failed' || t.status === 'flaky').length;
      return Math.round((f / tests.length) * 100);
    }));


    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Henry Schein – Test Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #f0f2f5; color: #1a1a2e; }

    /* Header */
    .header { background: linear-gradient(135deg, rgb(20, 116, 165) 0%, rgb(13, 80, 115) 100%);
               color: white; padding: 1.5rem 2rem; display: flex;
               align-items: center; justify-content: space-between; }
    .header h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: 0.5px; }
    .header .meta { font-size: 0.85rem; opacity: 0.85; text-align: right; }
    .header .meta span { display: block; }

    /* Summary cards */
    .summary { display: flex; gap: 1rem; padding: 1.5rem 2rem; flex-wrap: wrap; }
    .card { background: white; border-radius: 12px; padding: 1.2rem 1.8rem;
             flex: 1; min-width: 140px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);
             border-top: 4px solid #e5e7eb; text-align: center;
             cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
    .card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.13); }

    .card.total  { border-top-color: #6366f1; }
    .card.pass   { border-top-color: #22c55e; }
    .card.fail   { border-top-color: #ef4444; }
    .card.flaky  { border-top-color: #f59e0b; }
    .card.skip   { border-top-color: #94a3b8; }
    .card.rate   { border-top-color: #0ea5e9; }
    .card .num   { font-size: 2.4rem; font-weight: 800; line-height: 1; }
    .card .label { font-size: 0.78rem; color: #64748b; margin-top: 0.3rem;
                    text-transform: uppercase; letter-spacing: 0.5px; }
    .card.total .num  { color: #6366f1; }
    .card.pass  .num  { color: #22c55e; }
    .card.fail  .num  { color: #ef4444; }
    .card.flaky .num  { color: #f59e0b; }
    .card.skip  .num  { color: #94a3b8; }
    .card.rate  .num  { color: #0ea5e9; }

    /* Charts row */
    .charts { display: flex; gap: 1.5rem; padding: 0 2rem 1.5rem; flex-wrap: wrap; }
    .chart-box { background: white; border-radius: 12px; padding: 1.5rem;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .chart-box h3 { font-size: 0.95rem; color: #374151; margin-bottom: 1rem;
                     font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .chart-donut { flex: 0 0 280px; }
    .chart-bar   { flex: 1; min-width: 300px; }
    .perf-row    { padding: 0 2rem 1.5rem; }
    .perf-box    { width: 100%; }
    .perf-stats  { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
    .perf-stat   { background: #f8fafc; border-radius: 8px; padding: 0.8rem 1.2rem; flex: 1; text-align: center; }
    .perf-stat .pnum  { font-size: 1.8rem; font-weight: 800; color: #6366f1; }
    .perf-stat .plabel{ font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .slow-list   { display: flex; flex-direction: column; gap: 0.4rem; max-height: 220px; overflow-y: auto; }
    .slow-header { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;
                    letter-spacing: 0.5px; margin-bottom: 0.5rem; }
    .slow-suite-header { font-size: 0.75rem; font-weight: 700; color: rgb(20, 116, 165);
                          text-transform: uppercase; letter-spacing: 0.5px;
                          padding: 0.5rem 0 0.25rem; margin-top: 0.25rem; }
    .slow-row    { display: flex; justify-content: space-between; align-items: center;
                    background: #fff7ed; border-left: 3px solid #f97316; border-radius: 4px;
                    padding: 0.45rem 0.75rem; font-size: 0.83rem; margin-bottom: 0.3rem; margin-left: 0.75rem; }
    .slow-name   { color: #1e293b; flex: 1; margin-right: 1rem; }
    .slow-duration       { font-weight: 700; color: #ea580c; }
    .slow-duration.very-slow { color: #b91c1c; }

    /* Table */
    .table-section { padding: 0 2rem 2rem; }
    .table-section h2 { font-size: 1rem; font-weight: 600; color: #374151;
                         text-transform: uppercase; letter-spacing: 0.5px;
                         margin-bottom: 1rem; }
    .table-wrap { background: white; border-radius: 12px;
                   box-shadow: 0 2px 8px rgba(0,0,0,0.07); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    thead tr { background: #1a1a2e; color: white; }
    thead th { padding: 0.85rem 1rem; text-align: left; font-weight: 600;
                font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #f1f5f9; cursor: pointer;
                transition: background 0.15s; }
    tbody tr:hover { background: #f8fafc; }
    tbody tr:last-child { border-bottom: none; }
    td { padding: 0.8rem 1rem; vertical-align: middle; }
    .test-name { font-weight: 500; color: #1e293b; max-width: 320px; }
    .suite-header-row td { background: rgb(20, 116, 165); color: white;
                            font-weight: 700; font-size: 0.82rem; padding: 0.6rem 1rem;
                            letter-spacing: 0.4px; text-transform: uppercase; }
    .duration { font-weight: 600; color: #475569; text-align: right; }

    /* Badges */
    .badge-pass  { background: #dcfce7; color: #15803d; padding: 2px 8px;
                    border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .badge-fail  { background: #fee2e2; color: #b91c1c; padding: 2px 8px;
                    border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .badge-flaky { background: #fef3c7; color: #b45309; padding: 2px 8px;
                    border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .badge-skip  { background: #f1f5f9; color: #64748b; padding: 2px 8px;
                    border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .tag { background: #ede9fe; color: #6d28d9; padding: 2px 7px;
            border-radius: 20px; font-size: 0.72rem; margin-right: 3px; }
    .browser-badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px;
                      border-radius: 20px; font-size: 0.72rem; font-weight: 600; }

    /* Error row */
    .error-row td { padding: 0 1rem 0.9rem; }
    .error-block { background: #fff8f8; border: 1px solid #fecaca;
                    border-left: 4px solid #ef4444; border-radius: 6px;
                    padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .error-line  { display: flex; align-items: baseline; gap: 0.75rem; font-size: 0.83rem; }
    .error-label { min-width: 80px; font-weight: 700; font-size: 0.72rem; text-transform: uppercase;
                    letter-spacing: 0.5px; color: #6b7280; }
    .error-value { font-family: monospace; color: #1e293b; word-break: break-all; }
    .error-value.expected { color: #15803d; }
    .error-value.received { color: #b91c1c; }

    /* Media row */
    .media-row  { display: flex; gap: 1.5rem; margin-top: 0.75rem; flex-wrap: wrap; align-items: flex-start; }
    .media-item { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .media-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 0.6px; color: #64748b; }

    /* Screenshot */
    .screenshot-thumb { width: 220px; height: 130px; border-radius: 6px;
                         border: 2px solid #fecaca; cursor: pointer; object-fit: cover;
                         transition: transform 0.15s, box-shadow 0.15s; }
    .screenshot-thumb:hover { transform: scale(1.03); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }

    /* Video */
    .video-thumb-wrap { position: relative; width: 220px; height: 130px; border-radius: 6px;
                         border: 2px solid #bfdbfe; cursor: pointer; overflow: hidden;
                         transition: transform 0.15s, box-shadow 0.15s; }
    .video-thumb-wrap:hover { transform: scale(1.03); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
    .video-thumb { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
    .play-btn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
                 background: rgba(0,0,0,0.35); color: white; font-size: 2.2rem;
                 transition: background 0.15s; }
    .video-thumb-wrap:hover .play-btn { background: rgba(0,0,0,0.55); }

    /* Trace */
    .trace-wrap  { display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
                    width: 220px; height: 130px; justify-content: center;
                    border: 2px solid #d1d5db; border-radius: 6px; background: #f8fafc; }
    .trace-btn   { display: flex; align-items: center; gap: 0.4rem; background: #1e293b;
                    color: white; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.82rem;
                    font-weight: 700; text-decoration: none; letter-spacing: 0.5px;
                    transition: background 0.15s; cursor: pointer; }
    .trace-btn:hover { background: rgb(20, 116, 165); }
    .trace-icon  { font-size: 1rem; }
    .trace-hint  { font-size: 0.68rem; color: #94a3b8; text-align: center; line-height: 1.5; padding: 0 0.5rem; }
    .trace-hint code { background: #e2e8f0; padding: 1px 4px; border-radius: 3px;
                        font-family: monospace; color: #0f172a; font-size: 0.65rem; }

    /* Lightbox (image) */
    .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.88);
                 z-index: 9999; align-items: center; justify-content: center; cursor: zoom-out; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 90vw; max-height: 88vh; border-radius: 8px;
                     box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
    .lightbox-close { position: absolute; top: 1.2rem; right: 1.5rem; color: white;
                       font-size: 2rem; cursor: pointer; line-height: 1; font-weight: 300; }

    /* Video modal */
    .video-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.88);
                    z-index: 9999; align-items: center; justify-content: center; }
    .video-modal.active { display: flex; }
    .video-modal video { max-width: 90vw; max-height: 85vh; border-radius: 8px;
                          box-shadow: 0 8px 40px rgba(0,0,0,0.6); outline: none; }
    .video-modal-close { position: absolute; top: 1.2rem; right: 1.5rem; color: white;
                          font-size: 2rem; cursor: pointer; line-height: 1; font-weight: 300; }

    /* Retry section */
    .retry-section { padding: 0 2rem 2rem; }
    .retry-section h2 { font-size: 1rem; font-weight: 600; color: #374151;
                         text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1rem; }
    .retry-table-wrap { background: white; border-radius: 12px;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.07); overflow: hidden; }
    .retry-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .retry-table thead tr { background: #1a1a2e; color: white; }
    .retry-table thead th { padding: 0.75rem 1rem; text-align: left; font-weight: 600;
                             font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .retry-table tbody tr { border-bottom: 1px solid #f1f5f9; }
    .retry-table tbody tr:last-child { border-bottom: none; }
    .retry-table td { padding: 0.75rem 1rem; vertical-align: top; }
    .retry-suite      { color: #64748b; font-size: 0.8rem; }
    .retry-name       { font-weight: 600; color: #1e293b; }
    .retry-count-badge { background: #fef3c7; color: #b45309; padding: 2px 8px;
                          border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
    .retry-error      { font-family: monospace; font-size: 0.78rem; color: #b91c1c;
                         word-break: break-word; }
    .retry-failed-at  { margin-top: 0.4rem; font-size: 0.75rem; color: #475569;
                         font-family: monospace; }
    .retry-suggestion { font-size: 0.8rem; color: #1d4ed8; font-style: italic; }
    .no-retry         { padding: 1.2rem; text-align: center; color: #94a3b8; font-size: 0.85rem; }

    /* Footer */
    .footer { text-align: center; padding: 1.5rem; font-size: 0.8rem; color: #94a3b8; }
  </style>
</head>
<body>

<div class="header">
  <div>
    <h1>Henry Schein — Automation Test Report</h1>
    <div style="font-size:0.82rem;opacity:0.8;margin-top:4px">UK Medical · Playwright + TypeScript</div>
  </div>
  <div class="meta">
    <span>Run Date: ${new Date().toLocaleString('en-GB')}</span>
    <span>Total Duration: ${totalDuration}s</span>
  </div>
</div>

<!-- Summary Cards -->
<div class="summary">
  <div class="card total" onclick="scrollToResults()" title="View all tests">
    <div class="num">${total}</div>
    <div class="label">Total Tests</div>
  </div>
  <div class="card pass" onclick="openFilter('passed')" title="View passed tests">
    <div class="num">${passed}</div>
    <div class="label">Passed</div>
  </div>
  <div class="card fail" onclick="openFilter('failed')" title="View failed tests">
    <div class="num">${failed}</div>
    <div class="label">Failed</div>
  </div>
  <div class="card flaky" onclick="openFilter('flaky')" title="View flaky tests">
    <div class="num">${flaky}</div>
    <div class="label">Flaky</div>
  </div>
  <div class="card skip" onclick="openFilter('skipped')" title="View skipped tests">
    <div class="num">${skipped}</div>
    <div class="label">Skipped</div>
  </div>
  <div class="card rate" onclick="scrollToResults()" title="View all tests">
    <div class="num">${passRate}%</div>
    <div class="label">Pass Rate</div>
  </div>
</div>

<!-- Charts Row: Donut + Suite Bar -->
<div class="charts">
  <div class="chart-box chart-donut">
    <h3>Result Breakdown</h3>
    <canvas id="donutChart"></canvas>
  </div>
  <div class="chart-box chart-bar">
    <h3>Suite Pass / Fail %</h3>
    <canvas id="suiteBarChart"></canvas>
  </div>
</div>

<!-- Performance Summary Row -->
<div class="perf-row">
  <div class="chart-box perf-box">
    <h3>Performance Summary</h3>
    <div class="perf-stats">
      <div class="perf-stat">
        <div class="pnum">${totalTestDuration}s</div>
        <div class="plabel">Total Time</div>
      </div>
      <div class="perf-stat">
        <div class="pnum">${avgTime}s</div>
        <div class="plabel">Avg per Test</div>
      </div>
      <div class="perf-stat">
        <div class="pnum">${slowTests.length}</div>
        <div class="plabel">Above Average</div>
      </div>
    </div>
    <div class="slow-header">Tests above average (>${avgTime}s)</div>
    <div class="slow-list">
      ${slowRows || '<div style="color:#94a3b8;font-size:0.83rem">All tests within average time</div>'}
    </div>
  </div>
</div>

<!-- Test Results Table -->
<div class="table-section" id="test-results">
  <h2>Test Results</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Test Name</th>
          <th>Tags</th>
          <th>Browser</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</div>

<!-- Retried Test Cases -->
<div class="retry-section">
  <h2>Retried Test Cases</h2>
  <div class="retry-table-wrap">
    ${retriedTests.length === 0
      ? '<div class="no-retry">No test cases were retried in this run.</div>'
      : `<table class="retry-table">
          <thead>
            <tr>
              <th>Suite</th>
              <th>Test Case</th>
              <th>Retries</th>
              <th>Final Result</th>
              <th>Error</th>
              <th>Suggestion</th>
            </tr>
          </thead>
          <tbody>${retryRows}</tbody>
        </table>`}
  </div>
</div>

<!-- Lightbox (image) -->
<div class="lightbox" id="lightbox" onclick="closeLightbox()">
  <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
  <img id="lightbox-img" src="" alt="Screenshot" onclick="event.stopPropagation()" />
</div>

<!-- Video Modal -->
<div class="video-modal" id="video-modal" onclick="closeVideoModal()">
  <span class="video-modal-close" onclick="closeVideoModal()">&times;</span>
  <video id="modal-video" controls onclick="event.stopPropagation()">
    <source id="modal-video-src" src="" type="video/webm">
  </video>
</div>

<div class="footer">Generated by Custom Reporter · Henry Schein Automation Framework · ${new Date().getFullYear()}</div>

<script>
  // Donut Chart
  new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Passed', 'Failed', 'Flaky', 'Skipped'],
      datasets: [{
        data: [${passed}, ${failed}, ${flaky}, ${skipped}],
        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#94a3b8'],
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }
      },
      cutout: '68%',
    }
  });


  // Suite Pass/Fail Bar Chart
  new Chart(document.getElementById('suiteBarChart'), {
    type: 'bar',
    data: {
      labels: ${suiteBarLabels},
      datasets: [
        {
          label: 'Passed %',
          data: ${suitePassPct},
          backgroundColor: '#22c55e',
          borderRadius: 5,
        },
        {
          label: 'Failed %',
          data: ${suiteFailPct},
          backgroundColor: '#ef4444',
          borderRadius: 5,
        }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 }, padding: 16 } },
        datalabels: { display: false },
        tooltip: {
          callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.raw + '%' }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' },
              grid: { color: '#f1f5f9' } }
      }
    }
  });

  // Toggle error message on row click
  function toggleError(i) {
    const el = document.getElementById('err-' + i);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.add('active');
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.getElementById('lightbox-img').src = '';
  }

  function openVideoModal(src) {
    const video = document.getElementById('modal-video');
    document.getElementById('modal-video-src').src = src;
    video.load();
    video.play();
    document.getElementById('video-modal').classList.add('active');
  }

  function closeVideoModal() {
    const video = document.getElementById('modal-video');
    video.pause();
    video.currentTime = 0;
    document.getElementById('modal-video-src').src = '';
    document.getElementById('video-modal').classList.remove('active');
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLightbox(); closeVideoModal(); }
  });

  // Card navigation
  function scrollToResults() {
    document.getElementById('test-results').scrollIntoView({ behavior: 'smooth' });
  }

  function openFilter(status) {
    window.open(status + '.html', '_blank');
  }
</script>
</body>
</html>`;

    fs.writeFileSync(path.join(outDir, 'index.html'), html);

    // Generate per-status pages
    const statusMeta: { key: string; label: string; color: string }[] = [
      { key: 'passed',  label: 'Passed',  color: '#22c55e' },
      { key: 'failed',  label: 'Failed',  color: '#ef4444' },
      { key: 'flaky',   label: 'Flaky',   color: '#f59e0b' },
      { key: 'skipped', label: 'Skipped', color: '#94a3b8' },
    ];

    for (const { key, label, color } of statusMeta) {
      const filtered = results.filter((r: TestEntry) => r.status === key);

      const fSuiteMap = new Map<string, TestEntry[]>();
      for (const r of filtered) {
        if (!fSuiteMap.has(r.suite)) fSuiteMap.set(r.suite, []);
        fSuiteMap.get(r.suite)!.push(r);
      }
      for (const tests of fSuiteMap.values()) {
        tests.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      }

      let fIdx = 0;
      const fRows = Array.from(fSuiteMap.entries()).map(([suiteName, suiteTests]) => {
        const testRows = suiteTests.map(r => {
          const i = fIdx++;
          const cleanError = stripAnsi(r.error);
          const failedLine = r.errorLineNumber
            ? `Line ${r.errorLineNumber}  —  ${r.errorCodeLine}  —  ${r.errorFileName}`
            : '';
          return `
          <tr class="row-${r.status}" onclick="toggleError(${i})">
            <td><span class="${statusBadge(r.status)}">${r.status.toUpperCase()}</span></td>
            <td class="test-name">${r.name}</td>
            <td>${tagHtml(r.tags)}</td>
            <td><span class="browser-badge">${r.browser}</span></td>
            <td class="duration">${r.duration}s</td>
          </tr>
          ${cleanError ? `
          <tr class="error-row" id="err-${i}" style="display:none">
            <td colspan="5">
              <div class="error-block">
                <div class="error-line"><span class="error-label">Assertion</span><span class="error-value">${cleanError}</span></div>
                ${r.errorExpected ? `<div class="error-line"><span class="error-label">Expected</span><span class="error-value expected">${stripAnsi(r.errorExpected)}</span></div>` : ''}
                ${r.errorReceived ? `<div class="error-line"><span class="error-label">Received</span><span class="error-value received">${stripAnsi(r.errorReceived)}</span></div>` : ''}
                ${failedLine ? `<div class="error-line"><span class="error-label">Failed At</span><span class="error-value">${failedLine}</span></div>` : ''}
                ${(r.screenshot || r.videoRelPath || r.traceRelPath) ? `
                <div class="media-row">
                  ${r.screenshot ? `<div class="media-item"><div class="media-label">Screenshot</div><img class="screenshot-thumb" src="data:image/png;base64,${r.screenshot}" onclick="openLightbox(this.src)" title="Click to enlarge" /></div>` : ''}
                  ${r.videoRelPath ? `<div class="media-item"><div class="media-label">Video</div><div class="video-thumb-wrap" onclick="openVideoModal('${r.videoRelPath}')" title="Click to play"><video class="video-thumb" muted preload="metadata"><source src="${r.videoRelPath}" type="video/webm"></video><div class="play-btn">&#9654;</div></div></div>` : ''}
                  ${r.traceRelPath ? `<div class="media-item"><div class="media-label">Trace</div><div class="trace-wrap"><a class="trace-btn" href="trace-viewer/index.html?trace=../${r.traceRelPath}" target="_blank"><span class="trace-icon">&#128269;</span> VIEW TRACE</a><div class="trace-hint">Run: <code>npm run custom:report</code></div></div></div>` : ''}
                </div>` : ''}
              </div>
            </td>
          </tr>` : ''}`;
        }).join('');
        return `
        <tr class="suite-header-row"><td colspan="5">${suiteName}</td></tr>
        ${testRows}`;
      }).join('');

      const statusPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${label} Tests – Henry Schein</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #f0f2f5; color: #1a1a2e; }
    .header { background: linear-gradient(135deg, rgb(20,116,165) 0%, rgb(13,80,115) 100%);
               color: white; padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 1.4rem; font-weight: 700; letter-spacing: 0.5px; }
    .header .sub { font-size: 0.82rem; opacity: 0.8; margin-top: 4px; }
    .back-btn { color: #93c5fd; text-decoration: none; font-weight: 600; padding: 0.4rem 1rem;
                 border: 1px solid #93c5fd; border-radius: 6px; font-size: 0.85rem; transition: background 0.15s; white-space: nowrap; }
    .back-btn:hover { background: rgba(147,197,253,0.15); }
    .status-bar { padding: 1.2rem 2rem; }
    .status-badge { display: inline-flex; align-items: center; gap: 0.75rem; background: white;
                     border-radius: 10px; padding: 0.7rem 1.4rem; box-shadow: 0 2px 8px rgba(0,0,0,0.07);
                     border-left: 4px solid ${color}; }
    .status-count { font-size: 1.8rem; font-weight: 800; color: ${color}; line-height: 1; }
    .status-label { font-size: 0.82rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .table-section { padding: 0 2rem 2rem; }
    .table-wrap { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    thead tr { background: #1a1a2e; color: white; }
    thead th { padding: 0.85rem 1rem; text-align: left; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s; }
    tbody tr:hover { background: #f8fafc; }
    tbody tr:last-child { border-bottom: none; }
    td { padding: 0.8rem 1rem; vertical-align: middle; }
    .test-name { font-weight: 500; color: #1e293b; max-width: 320px; }
    .suite-header-row td { background: rgb(20,116,165); color: white; font-weight: 700; font-size: 0.82rem; padding: 0.6rem 1rem; letter-spacing: 0.4px; text-transform: uppercase; }
    .duration { font-weight: 600; color: #475569; text-align: right; }
    .badge-pass  { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .badge-fail  { background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .badge-flaky { background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .badge-skip  { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .tag { background: #ede9fe; color: #6d28d9; padding: 2px 7px; border-radius: 20px; font-size: 0.72rem; margin-right: 3px; }
    .browser-badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
    .error-row td { padding: 0 1rem 0.9rem; }
    .error-block { background: #fff8f8; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 6px; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .error-line  { display: flex; align-items: baseline; gap: 0.75rem; font-size: 0.83rem; }
    .error-label { min-width: 80px; font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    .error-value { font-family: monospace; color: #1e293b; word-break: break-all; }
    .error-value.expected { color: #15803d; }
    .error-value.received { color: #b91c1c; }
    .media-row  { display: flex; gap: 1.5rem; margin-top: 0.75rem; flex-wrap: wrap; align-items: flex-start; }
    .media-item { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .media-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; }
    .screenshot-thumb { width: 220px; height: 130px; border-radius: 6px; border: 2px solid #fecaca; cursor: pointer; object-fit: cover; transition: transform 0.15s; }
    .screenshot-thumb:hover { transform: scale(1.03); }
    .video-thumb-wrap { position: relative; width: 220px; height: 130px; border-radius: 6px; border: 2px solid #bfdbfe; cursor: pointer; overflow: hidden; transition: transform 0.15s; }
    .video-thumb-wrap:hover { transform: scale(1.03); }
    .video-thumb { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
    .play-btn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); color: white; font-size: 2.2rem; }
    .trace-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 220px; height: 130px; justify-content: center; border: 2px solid #d1d5db; border-radius: 6px; background: #f8fafc; }
    .trace-btn  { display: flex; align-items: center; gap: 0.4rem; background: #1e293b; color: white; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; text-decoration: none; transition: background 0.15s; }
    .trace-btn:hover { background: rgb(20,116,165); }
    .trace-icon { font-size: 1rem; }
    .trace-hint { font-size: 0.68rem; color: #94a3b8; text-align: center; line-height: 1.5; }
    .trace-hint code { background: #e2e8f0; padding: 1px 4px; border-radius: 3px; font-family: monospace; color: #0f172a; font-size: 0.65rem; }
    .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 9999; align-items: center; justify-content: center; cursor: zoom-out; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 90vw; max-height: 88vh; border-radius: 8px; }
    .lightbox-close { position: absolute; top: 1.2rem; right: 1.5rem; color: white; font-size: 2rem; cursor: pointer; }
    .video-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 9999; align-items: center; justify-content: center; }
    .video-modal.active { display: flex; }
    .video-modal video { max-width: 90vw; max-height: 85vh; border-radius: 8px; outline: none; }
    .video-modal-close { position: absolute; top: 1.2rem; right: 1.5rem; color: white; font-size: 2rem; cursor: pointer; }
    .no-tests { padding: 3rem; text-align: center; color: #94a3b8; font-size: 1rem; }
    .footer { text-align: center; padding: 1.5rem; font-size: 0.8rem; color: #94a3b8; }
  </style>
</head>
<body>

<div class="header">
  <div>
    <h1>Henry Schein — ${label} Tests</h1>
    <div class="sub">UK Medical · Playwright + TypeScript</div>
  </div>
  <a href="index.html" class="back-btn">← Back to Full Report</a>
</div>

<div class="status-bar">
  <div class="status-badge">
    <span class="status-count">${filtered.length}</span>
    <span class="status-label">${label} Tests</span>
  </div>
</div>

<div class="table-section">
  <div class="table-wrap">
    ${filtered.length === 0
      ? `<div class="no-tests">No ${label.toLowerCase()} tests in this run.</div>`
      : `<table>
          <thead>
            <tr>
              <th>Status</th><th>Test Name</th><th>Tags</th><th>Browser</th><th>Duration</th>
            </tr>
          </thead>
          <tbody>${fRows}</tbody>
        </table>`}
  </div>
</div>

<div class="lightbox" id="lightbox" onclick="closeLightbox()">
  <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
  <img id="lightbox-img" src="" alt="" onclick="event.stopPropagation()" />
</div>
<div class="video-modal" id="video-modal" onclick="closeVideoModal()">
  <span class="video-modal-close" onclick="closeVideoModal()">&times;</span>
  <video id="modal-video" controls onclick="event.stopPropagation()">
    <source id="modal-video-src" src="" type="video/webm">
  </video>
</div>

<div class="footer">Generated by Custom Reporter · Henry Schein Automation Framework · ${new Date().getFullYear()}</div>

<script>
  function toggleError(i) {
    const el = document.getElementById('err-' + i);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
  function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.add('active');
  }
  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.getElementById('lightbox-img').src = '';
  }
  function openVideoModal(src) {
    const v = document.getElementById('modal-video');
    document.getElementById('modal-video-src').src = src;
    v.load(); v.play();
    document.getElementById('video-modal').classList.add('active');
  }
  function closeVideoModal() {
    const v = document.getElementById('modal-video');
    v.pause(); v.currentTime = 0;
    document.getElementById('modal-video-src').src = '';
    document.getElementById('video-modal').classList.remove('active');
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLightbox(); closeVideoModal(); }
  });
</script>
</body>
</html>`;

      fs.writeFileSync(path.join(outDir, `${key}.html`), statusPageHtml);
    }

    console.log('\n📊 Custom report generated → custom-report/index.html\n');
  }
}

export default CustomReporter;
