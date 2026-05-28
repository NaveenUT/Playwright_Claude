/**
 * Stability Validator
 * Runs a Playwright tag/grep N times and reports pass rate, flaky tests, and timing.
 *
 * Usage:
 *   node scripts/stability-check.js [iterations] [tag] [project]
 *
 * Examples:
 *   node scripts/stability-check.js 10 @smoke chromium
 *   node scripts/stability-check.js 5 @sanity
 *   node scripts/stability-check.js            (defaults: 10 iterations, @smoke, chromium)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ITERATIONS = parseInt(process.argv[2] || '10', 10);
const TAG        = process.argv[3] || '@smoke';
const PROJECT    = process.argv[4] || 'chromium';

const runStats    = [];
// testTitle → { file: 'cartPage', runs: [{ run: 1, result: 'pass' }, ...] }
const testHistory = {};

console.log(`\n${'═'.repeat(60)}`);
console.log(` Stability Check — ${TAG} | ${PROJECT} | ${ITERATIONS} iterations`);
console.log(`${'═'.repeat(60)}\n`);

for (let i = 1; i <= ITERATIONS; i++) {
  const start = Date.now();
  let exitCode = 0;
  let jsonText = '';

  process.stdout.write(`  Run ${String(i).padStart(2, '0')}/${ITERATIONS}  `);

  try {
    jsonText = execSync(
      `npx playwright test --grep "${TAG}" --project=${PROJECT} --reporter=json`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch (err) {
    exitCode = 1;
    jsonText  = err.stdout || '';
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  let passed = 0, failed = 0, skipped = 0;
  if (jsonText.trim().startsWith('{')) {
    try {
      const r     = JSON.parse(jsonText);
      const stats = r.stats || {};
      passed  = stats.expected  || 0;
      failed  = (stats.unexpected || 0) + (stats.flaky || 0);
      skipped = stats.skipped    || 0;

      // Recursively walk suite tree; top-level suite title = file path
      const collectTests = (suites, fileLabel) => {
        for (const suite of suites || []) {
          // First level: suite.title is the file path e.g. "tests/cartPage/cartPage.spec.ts"
          const label = fileLabel ?? path.basename(suite.title || '').replace(/\.spec\.ts$/i, '');
          for (const spec of suite.specs || []) {
            if (!testHistory[spec.title]) testHistory[spec.title] = { file: label, runs: [] };
            testHistory[spec.title].runs.push({ run: i, result: spec.ok ? 'pass' : 'fail' });
          }
          collectTests(suite.suites, label);
        }
      };
      collectTests(r.suites, null);
    } catch {}
  }

  const icon = exitCode === 0 ? '✅' : '❌';
  console.log(`${icon}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}  (${duration}s)`);
  runStats.push({ run: i, passed, failed, skipped, duration: parseFloat(duration) });
}

// ── Aggregate analysis ────────────────────────────────────────────────────────

const totalPassed = runStats.reduce((s, r) => s + r.passed, 0);
const totalFailed = runStats.reduce((s, r) => s + r.failed, 0);
const totalExec   = totalPassed + totalFailed;
const totalRuns   = ITERATIONS;

const passRate    = totalExec > 0 ? ((totalPassed / totalExec) * 100).toFixed(1) : '0.0';
const avgDuration = (runStats.reduce((s, r) => s + r.duration, 0) / totalRuns).toFixed(1);
const minDuration = Math.min(...runStats.map(r => r.duration)).toFixed(1);
const maxDuration = Math.max(...runStats.map(r => r.duration)).toFixed(1);

const testBreakdown = [];
const flakyTests    = [];
const stablePass    = [];
const stableFail    = [];

for (const [title, data] of Object.entries(testHistory)) {
  const { file, runs } = data;
  const passedIts = runs.filter(o => o.result === 'pass').map(o => o.run);
  const failedIts = runs.filter(o => o.result === 'fail').map(o => o.run);
  const passes    = passedIts.length;
  const fails     = failedIts.length;
  const total     = runs.length;
  const rate      = ((passes / total) * 100).toFixed(0);

  const entry = { title, file, passes, fails, total, passedIts, failedIts, rate };
  testBreakdown.push(entry);

  if (passes > 0 && fails > 0)   flakyTests.push(entry);
  else if (fails === total)       stableFail.push(title);
  else                            stablePass.push(title);
}

// Sort by file, then by TC number within each file
testBreakdown.sort((a, b) => a.file.localeCompare(b.file) || a.title.localeCompare(b.title));
flakyTests.sort((a, b) => a.passes - b.passes);

// ── Console report ────────────────────────────────────────────────────────────

const LINE = '─'.repeat(60);

console.log(`\n${LINE}`);
console.log(` STABILITY REPORT`);
console.log(LINE);
console.log(` Tag             : ${TAG}`);
console.log(` Project         : ${PROJECT}`);
console.log(` Iterations      : ${totalRuns}`);
console.log(` Total executions: ${totalPassed} passed / ${totalFailed} failed (${totalExec} total)`);
console.log(` Test pass rate  : ${passRate}%   (target: >99%)`);
console.log(` Status          : ${parseFloat(passRate) >= 99 ? '✅ STABLE' : parseFloat(passRate) >= 90 ? '⚠️  NEEDS ATTENTION' : '❌ UNSTABLE'}`);
console.log(LINE);
console.log(` TIMING`);
console.log(`   Average : ${avgDuration}s`);
console.log(`   Fastest : ${minDuration}s`);
console.log(`   Slowest : ${maxDuration}s`);
console.log(LINE);
console.log(` TEST CASE BREAKDOWN (${testBreakdown.length} tests)`);

let currentFile = null;
for (const t of testBreakdown) {
  if (t.file !== currentFile) {
    currentFile = t.file;
    console.log(`\n   ── ${t.file} ──`);
  }
  const tcMatch = t.title.match(/^(TC\d+)/i);
  const tcLabel = tcMatch ? tcMatch[1].toUpperCase() : '——';
  console.log(`   ${tcLabel}  ${t.title}`);
  console.log(`         Passed: ${t.passes}/${t.total}  — Iterations: ${t.passedIts.length ? t.passedIts.join(', ') : '—'}`);
  console.log(`         Failed: ${t.fails}/${t.total}  — Iterations: ${t.failedIts.length ? t.failedIts.join(', ') : '—'}`);
}

console.log(`\n${LINE}`);
console.log(` FLAKY TESTS (${flakyTests.length})`);
if (flakyTests.length === 0) {
  console.log('   None — all tests produced consistent results.');
} else {
  for (const t of flakyTests) {
    console.log(`   ⚠️  [${t.file}] ${t.title}`);
    console.log(`        Pass: ${t.passes}/${t.total} (${t.rate}%)  — Iterations: ${t.passedIts.join(', ')}`);
    console.log(`        Fail: ${t.fails}/${t.total}               — Iterations: ${t.failedIts.join(', ')}`);
  }
}
if (stableFail.length > 0) {
  console.log(LINE);
  console.log(` CONSISTENTLY FAILING (${stableFail.length})`);
  for (const t of stableFail) console.log(`   ❌  ${t}`);
}
console.log(LINE);
console.log(` SUMMARY  ${totalPassed} passed  ${totalFailed} failed  across all ${totalRuns} runs`);
console.log(`${LINE}\n`);

// ── JSON report ───────────────────────────────────────────────────────────────

const reportDir = 'stability-report';
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

fs.writeFileSync(
  path.join(reportDir, 'stability-report.json'),
  JSON.stringify({
    tag: TAG, project: PROJECT, iterations: totalRuns,
    passRate: parseFloat(passRate), totalPassed, totalFailed, totalExecutions: totalExec,
    timing: { avg: parseFloat(avgDuration), min: parseFloat(minDuration), max: parseFloat(maxDuration) },
    testBreakdown, flakyTests, stableFailingTests: stableFail, runDetails: runStats,
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

// ── HTML report ───────────────────────────────────────────────────────────────

const statusColor = parseFloat(passRate) >= 99 ? '#22c55e' : parseFloat(passRate) >= 90 ? '#f59e0b' : '#ef4444';
const statusLabel = parseFloat(passRate) >= 99 ? 'STABLE' : parseFloat(passRate) >= 90 ? 'NEEDS ATTENTION' : 'UNSTABLE';

// Format file label nicely: "cartPage" → "Cart Page", "accountDashboard" → "Account Dashboard"
const formatFileName = (f) => f.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

// Group tests by file
const grouped = {};
for (const t of testBreakdown) {
  if (!grouped[t.file]) grouped[t.file] = [];
  grouped[t.file].push(t);
}

// Build grouped HTML rows
const testCaseRows = Object.entries(grouped).map(([file, tests]) => {
  const fileLabel = formatFileName(file);
  const headerRow = `<tr style="background:#0f172a">
    <td colspan="7" style="padding:12px 14px;font-weight:700;font-size:13px;color:#6366f1;letter-spacing:1px;text-transform:uppercase;border-top:2px solid #6366f1">
      ${fileLabel}
    </td>
  </tr>`;

  const testRows = tests.map(t => {
    const col        = t.fails === 0 ? '#22c55e' : t.passes === 0 ? '#ef4444' : '#f59e0b';
    const label      = t.fails === 0 ? 'STABLE'  : t.passes === 0 ? 'FAILING'  : 'FLAKY';
    const passedStr  = t.passedIts.length ? t.passedIts.join(', ') : '—';
    const failedStr  = t.failedIts.length ? t.failedIts.join(', ') : '—';
    const tcMatch    = t.title.match(/^(TC\d+)/i);
    const tcLabel    = tcMatch ? tcMatch[1].toUpperCase() : '—';
    return `<tr>
      <td style="text-align:center;font-weight:700;color:#94a3b8">${tcLabel}</td>
      <td>${t.title}</td>
      <td style="text-align:center;color:#22c55e;font-weight:600">${t.passes}</td>
      <td style="font-size:12px;color:#86efac">${passedStr}</td>
      <td style="text-align:center;color:#ef4444;font-weight:600">${t.fails}</td>
      <td style="font-size:12px;color:#fca5a5">${failedStr}</td>
      <td style="text-align:center"><span style="background:${col};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px">${label}</span></td>
    </tr>`;
  }).join('\n');

  return headerRow + testRows;
}).join('\n');

// Run details rows
const runRows = runStats.map(r => {
  const total = r.passed + r.failed;
  const pct   = total > 0 ? Math.round((r.passed / total) * 100) : 0;
  const col   = r.failed === 0 ? '#22c55e' : pct >= 90 ? '#f59e0b' : '#ef4444';
  return `<tr>
    <td style="text-align:center">${r.run}</td>
    <td style="text-align:center;color:#22c55e;font-weight:600">${r.passed}</td>
    <td style="text-align:center;color:#ef4444;font-weight:600">${r.failed}</td>
    <td style="text-align:center">${r.skipped}</td>
    <td style="text-align:center"><span style="background:${col};color:#fff;padding:2px 10px;border-radius:12px;font-size:12px">${pct}%</span></td>
    <td style="text-align:center">${r.duration}s</td>
  </tr>`;
}).join('\n');

const flakyRows = flakyTests.length === 0
  ? `<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:16px">No flaky tests — all results were consistent</td></tr>`
  : flakyTests.map(t => `<tr>
      <td><span style="color:#64748b;font-size:11px">${formatFileName(t.file)}</span><br>${t.title}</td>
      <td style="text-align:center;color:#22c55e">${t.passes}/${t.total}</td>
      <td style="text-align:center;color:#ef4444">${t.fails}/${t.total}</td>
      <td style="text-align:center"><span style="background:#f59e0b;color:#fff;padding:2px 10px;border-radius:12px;font-size:12px">${t.rate}%</span></td>
    </tr>`).join('\n');

const failRows = stableFail.length === 0
  ? `<tr><td style="text-align:center;color:#6b7280;padding:16px">None</td></tr>`
  : stableFail.map(t => `<tr><td style="color:#ef4444">❌ ${t}</td></tr>`).join('\n');

const xLabels   = runStats.map(r => `'Run ${String(r.run).padStart(2,'0')}'`).join(', ');
const barPassed = runStats.map(r => r.passed).join(', ');
const barFailed = runStats.map(r => r.failed).join(', ');
const lineDur   = runStats.map(r => r.duration).join(', ');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Stability Report — ${TAG} | ${PROJECT}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%); padding: 32px 40px; border-bottom: 1px solid #334155; }
  .header h1 { font-size: 24px; font-weight: 700; color: #f1f5f9; }
  .header p  { color: #94a3b8; margin-top: 4px; font-size: 14px; }
  .content { padding: 32px 40px; max-width: 1300px; margin: 0 auto; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; }
  .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
  .card .value { font-size: 28px; font-weight: 700; }
  .card .sub   { font-size: 12px; color: #64748b; margin-top: 4px; }
  .section { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  .section h2 { font-size: 15px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  @media (max-width: 768px) { .charts { grid-template-columns: 1fr; } .content { padding: 16px; } }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #0f172a; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; padding: 10px 14px; text-align: left; }
  td { padding: 10px 14px; border-top: 1px solid #334155; color: #cbd5e1; word-break: break-word; }
  tr:hover td { background: #243447; }
  .chart-wrap { background: #0f172a; border-radius: 8px; padding: 12px; }
</style>
</head>
<body>

<div class="header">
  <h1>Stability Report</h1>
  <p>${TAG} &nbsp;|&nbsp; ${PROJECT} &nbsp;|&nbsp; ${ITERATIONS} iterations &nbsp;|&nbsp; Generated ${new Date().toLocaleString()}</p>
</div>

<div class="content">

  <div class="cards">
    <div class="card">
      <div class="label">Test Pass Rate</div>
      <div class="value" style="color:${statusColor}">${passRate}%</div>
      <div class="sub">target &gt; 99%</div>
    </div>
    <div class="card">
      <div class="label">Status</div>
      <div class="value" style="font-size:16px;color:${statusColor};padding-top:6px">${statusLabel}</div>
    </div>
    <div class="card">
      <div class="label">Total Passed</div>
      <div class="value" style="color:#22c55e">${totalPassed}</div>
      <div class="sub">across ${totalRuns} runs</div>
    </div>
    <div class="card">
      <div class="label">Total Failed</div>
      <div class="value" style="color:#ef4444">${totalFailed}</div>
      <div class="sub">across ${totalRuns} runs</div>
    </div>
    <div class="card">
      <div class="label">Flaky Tests</div>
      <div class="value" style="color:${flakyTests.length > 0 ? '#f59e0b' : '#22c55e'}">${flakyTests.length}</div>
    </div>
    <div class="card">
      <div class="label">Avg Duration</div>
      <div class="value" style="font-size:22px">${avgDuration}s</div>
      <div class="sub">${minDuration}s – ${maxDuration}s</div>
    </div>
  </div>

  <div class="charts">
    <div class="section">
      <h2>Pass / Fail per Run</h2>
      <div class="chart-wrap"><canvas id="barChart" height="220"></canvas></div>
    </div>
    <div class="section">
      <h2>Run Duration (seconds)</h2>
      <div class="chart-wrap"><canvas id="lineChart" height="220"></canvas></div>
    </div>
  </div>

  <div class="section">
    <h2>Test Case Breakdown — ${testBreakdown.length} Tests across ${Object.keys(grouped).length} Spec Files</h2>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:60px">#</th>
          <th>Test Case</th>
          <th style="text-align:center;width:75px">Passed</th>
          <th style="width:180px">Passed Iterations</th>
          <th style="text-align:center;width:75px">Failed</th>
          <th style="width:180px">Failed Iterations</th>
          <th style="text-align:center;width:95px">Status</th>
        </tr>
      </thead>
      <tbody>${testCaseRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Run Details</h2>
    <table>
      <thead>
        <tr>
          <th style="text-align:center">Run</th>
          <th style="text-align:center">Passed</th>
          <th style="text-align:center">Failed</th>
          <th style="text-align:center">Skipped</th>
          <th style="text-align:center">Pass Rate</th>
          <th style="text-align:center">Duration</th>
        </tr>
      </thead>
      <tbody>${runRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Flaky Tests (${flakyTests.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th style="text-align:center">Passes</th>
          <th style="text-align:center">Failures</th>
          <th style="text-align:center">Pass Rate</th>
        </tr>
      </thead>
      <tbody>${flakyRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Consistently Failing (${stableFail.length})</h2>
    <table>
      <thead><tr><th>Test</th></tr></thead>
      <tbody>${failRows}</tbody>
    </table>
  </div>

</div>

<script>
Chart.defaults.color = '#94a3b8';
new Chart(document.getElementById('barChart'), {
  type: 'bar',
  data: {
    labels: [${xLabels}],
    datasets: [
      { label: 'Passed', data: [${barPassed}], backgroundColor: '#22c55e99', borderColor: '#22c55e', borderWidth: 1 },
      { label: 'Failed', data: [${barFailed}], backgroundColor: '#ef444499', borderColor: '#ef4444', borderWidth: 1 },
    ],
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { stacked: true, ticks: { color: '#64748b', maxRotation: 45 }, grid: { color: '#1e293b' } },
      y: { stacked: true, ticks: { color: '#64748b' }, grid: { color: '#334155' }, beginAtZero: true },
    },
  },
});
new Chart(document.getElementById('lineChart'), {
  type: 'line',
  data: {
    labels: [${xLabels}],
    datasets: [{
      label: 'Duration (s)',
      data: [${lineDur}],
      borderColor: '#6366f1', backgroundColor: '#6366f120',
      tension: 0.4, fill: true,
      pointBackgroundColor: '#6366f1', pointRadius: 4,
    }],
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#64748b', maxRotation: 45 }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#334155' }, beginAtZero: true },
    },
  },
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(reportDir, 'index.html'), html);

console.log(`  Detailed report → ${path.join(reportDir, 'stability-report.json')}`);
console.log(`  HTML report     → ${path.join(reportDir, 'index.html')}`);
console.log(`\n  Open with: npx http-server stability-report -o -p 9326\n`);
