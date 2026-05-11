pipeline {
    agent any

    // Required Jenkins plugins:
    //   - NodeJS Plugin          → tools block (Node 20)
    //   - HTML Publisher Plugin  → publishHTML steps
    //   - Email Extension Plugin → emailext step
    //   - Credentials Binding    → withCredentials block

    tools {
        nodejs 'NodeJS-20'
    }

    triggers {
        cron('0 6 * * *')
    }

    environment {
        BASE_URL   = 'https://www.henryschein.co.uk'
        DOMAIN     = 'UK Medical'
        HEADLESS   = 'true'
        MAIL_TO    = 'gopikasrip@unitedtechno.com'
        PAGES_URL  = 'https://naveenUT.github.io/Playwright_Claude'
        GH_REPO    = 'https://github.com/NaveenUT/Playwright_Claude.git'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                bat 'npx playwright install chromium --with-deps'
            }
        }

        stage('Smoke Tests') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat 'npm run test:smoke -- --project=chromium'
                }
            }
        }

        stage('Regression Tests') {
            when {
                expression { currentBuild.currentResult == 'SUCCESS' }
            }
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat 'npm run test:regression -- --project=chromium'
                }
            }
        }

        stage('Deploy Reports to GitHub Pages') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    bat '''
                        if exist gh-pages rmdir /s /q gh-pages
                        mkdir gh-pages
                        if exist playwright-report xcopy /E /Y /I playwright-report gh-pages\\playwright-report
                        if exist monocart-report   xcopy /E /Y /I monocart-report   gh-pages\\monocart-report
                        if exist custom-report     xcopy /E /Y /I custom-report     gh-pages\\custom-report
                    '''
                    writeFile file: 'gh-pages/index.html', text: '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Henry Schein – Test Reports</title>
  <style>
    body { font-family: sans-serif; display: flex; flex-direction: column;
           align-items: center; justify-content: center; min-height: 100vh;
           margin: 0; background: #f0f2f5; }
    h1 { color: #1a1a2e; margin-bottom: 2rem; font-size: 1.6rem; }
    .cards { display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center; }
    .card { background: white; border-radius: 12px; padding: 2rem 2.5rem;
            text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.10);
            text-decoration: none; color: #333; transition: transform .2s, box-shadow .2s;
            min-width: 200px; }
    .card:hover { transform: translateY(-5px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .card h2 { margin: 0 0 .5rem; font-size: 1.2rem; color: #1a1a2e; }
    .card p  { margin: 0; color: #777; font-size: .88rem; }
    .badge { display: inline-block; margin-top: 1rem; padding: .3rem .9rem;
             border-radius: 20px; font-size: .78rem; font-weight: bold; }
    .badge-blue   { background: #e3f0ff; color: #1a6fcc; }
    .badge-green  { background: #e3ffe8; color: #1a8c35; }
    .badge-purple { background: #ede9fe; color: #6d28d9; }
  </style>
</head>
<body>
  <h1>Henry Schein – Playwright Test Reports</h1>
  <div class="cards">
    <a class="card" href="custom-report/index.html">
      <h2>Custom Report</h2><p>Charts · Suites · Screenshots · Video · Trace</p>
      <span class="badge badge-purple">Full Custom</span>
    </a>
    <a class="card" href="monocart-report/index.html">
      <h2>Monocart Report</h2><p>Charts · Duration bars · Tag breakdown</p>
      <span class="badge badge-green">With Charts</span>
    </a>
    <a class="card" href="playwright-report/index.html">
      <h2>Playwright Report</h2><p>Trace viewer · Steps · Video · Screenshots</p>
      <span class="badge badge-blue">Detailed Trace</span>
    </a>
  </div>
</body>
</html>'''
                    bat '''
                        cd gh-pages
                        git init
                        git config user.email "jenkins@ci.local"
                        git config user.name "Jenkins CI"
                        git checkout -b gh-pages
                        git add .
                        git commit -m "Deploy reports from Jenkins build #%BUILD_NUMBER%"
                        git push -f https://%GIT_USER%:%GIT_TOKEN%@github.com/NaveenUT/Playwright_Claude.git gh-pages
                    '''
                }
            }
        }

    }

    post {
        always {

            // ── Publish HTML reports in Jenkins sidebar ───────────────────────
            publishHTML(target: [
                allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                reportDir: 'custom-report', reportFiles: 'index.html', reportName: 'Custom Report'
            ])
            publishHTML(target: [
                allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                reportDir: 'monocart-report', reportFiles: 'index.html', reportName: 'Monocart Report'
            ])
            publishHTML(target: [
                allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                reportDir: 'playwright-report', reportFiles: 'index.html', reportName: 'Playwright Report'
            ])

            archiveArtifacts(
                artifacts: 'playwright-report/**,monocart-report/**,custom-report/**,results.json',
                allowEmptyArchive: true
            )

            // ── Parse results.json into summary ───────────────────────────────
            script {
                env.TEST_SUMMARY = 'No results file found (smoke tests may have failed before regression ran).'
                if (fileExists('results.json')) {
                    writeFile file: 'parse-results.js', text: '''
const fs = require("fs");
const r = JSON.parse(fs.readFileSync("results.json", "utf8"));
const stats = r.stats || {};
const passed  = stats.expected  || 0;
const failed  = stats.unexpected || 0;
const flaky   = stats.flaky      || 0;
const skipped = stats.skipped    || 0;
const total   = passed + failed + flaky + skipped;
function collectTests(suites, list) {
  for (const suite of suites || []) {
    for (const test of suite.tests || []) {
      const icon = test.status === "expected" ? "PASS" :
                   test.status === "skipped"  ? "SKIP" : "FAIL";
      list.push(icon + " | " + test.title);
    }
    collectTests(suite.suites, list);
  }
}
const tests = [];
collectTests(r.suites, tests);
const lines = [
  "Total   : " + total,
  "Passed  : " + passed,
  "Failed  : " + (failed + flaky),
  "Skipped : " + skipped,
  "",
  "Test Details:",
  ...tests
];
process.stdout.write(lines.join("\\n"));
'''
                    env.TEST_SUMMARY = bat(returnStdout: true, script: 'node parse-results.js').trim()
                }
            }

            // ── Send email with GitHub Pages links ────────────────────────────
            script {
                try {
                    withCredentials([
                        usernamePassword(credentialsId: 'gmail_credentials', usernameVariable: 'MAIL_USERNAME', passwordVariable: 'MAIL_PASSWORD')
                    ]) {
                        emailext(
                            from   : "Playwright CI <${env.MAIL_USERNAME}>",
                            to     : "${env.MAIL_TO}",
                            subject: "${currentBuild.currentResult == 'SUCCESS' ? 'Playwright Tests Passed' : 'Playwright Tests Failed'} — Build #${env.BUILD_NUMBER}",
                            body   : """Playwright Automation Test Results
===================================

Job          : ${env.JOB_NAME}
Branch       : ${env.GIT_BRANCH ?: 'main'}
Build Number : #${env.BUILD_NUMBER}
Status       : ${currentBuild.currentResult}

Results Summary:
----------------
${env.TEST_SUMMARY}

View Reports (public links — open from any network):
-----------------------------------------------------
Landing Page    : ${env.PAGES_URL}/
Custom Report   : ${env.PAGES_URL}/custom-report/
Monocart Report : ${env.PAGES_URL}/monocart-report/
Playwright      : ${env.PAGES_URL}/playwright-report/

---
This is an automated message from Jenkins."""
                        )
                    }
                } catch (err) {
                    echo "Email skipped: ${err.getMessage()}"
                }
            }

        }
    }
}
