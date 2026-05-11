pipeline {
    agent any

    // Required Jenkins plugins:
    //   - NodeJS Plugin          → tools block (Node 24)
    //   - HTML Publisher Plugin  → publishHTML steps
    //   - Email Extension Plugin → emailext step
    //   - Credentials Binding    → withCredentials block

    tools {
        // Go to: Manage Jenkins → Tools → NodeJS installations
        // Add installation named exactly "NodeJS-20" with version 20.x
        nodejs 'NodeJS-20'
    }

    triggers {
        // Daily at 06:00 UTC — mirrors GitHub Actions schedule
        cron('0 6 * * *')
    }

    environment {
        BASE_URL = 'https://www.henryschein.co.uk'
        DOMAIN   = 'UK Medical'
        HEADLESS = 'true'
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
                sh 'npm ci'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                sh 'npx playwright install chromium --with-deps'
            }
        }

        stage('Smoke Tests') {
            steps {
                // catchError lets the pipeline continue to publish reports even if tests fail
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh 'npm run test:smoke -- --project=chromium'
                }
            }
        }

        stage('Regression Tests') {
            // Only runs if Smoke Tests passed — mirrors `if: success()` in GitHub Actions
            when {
                expression { currentBuild.currentResult == 'SUCCESS' }
            }
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    sh 'npm run test:regression -- --project=chromium'
                }
            }
        }

    }

    post {
        always {

            // ── Publish HTML reports (appear in Jenkins build sidebar) ────────
            publishHTML(target: [
                allowMissing         : true,
                alwaysLinkToLastBuild: true,
                keepAll              : true,
                reportDir            : 'custom-report',
                reportFiles          : 'index.html',
                reportName           : 'Custom Report'
            ])
            publishHTML(target: [
                allowMissing         : true,
                alwaysLinkToLastBuild: true,
                keepAll              : true,
                reportDir            : 'monocart-report',
                reportFiles          : 'index.html',
                reportName           : 'Monocart Report'
            ])
            publishHTML(target: [
                allowMissing         : true,
                alwaysLinkToLastBuild: true,
                keepAll              : true,
                reportDir            : 'playwright-report',
                reportFiles          : 'index.html',
                reportName           : 'Playwright Report'
            ])

            // ── Archive report folders as downloadable build artifacts ────────
            archiveArtifacts(
                artifacts        : 'playwright-report/**,monocart-report/**,custom-report/**,results.json',
                allowEmptyArchive: true
            )

            // ── Parse results.json into a summary (same logic as GitHub Actions) ──
            script {
                env.TEST_SUMMARY = 'No results file found (smoke tests may have failed before regression ran).'
                if (fileExists('results.json')) {
                    env.TEST_SUMMARY = sh(returnStdout: true, script: '''
node -e "
const fs = require('fs');
const r = JSON.parse(fs.readFileSync('results.json', 'utf8'));
const stats = r.stats || {};
const passed  = stats.expected  || 0;
const failed  = stats.unexpected || 0;
const flaky   = stats.flaky      || 0;
const skipped = stats.skipped    || 0;
const total   = passed + failed + flaky + skipped;

function collectTests(suites, list) {
  for (const suite of suites || []) {
    for (const test of suite.tests || []) {
      const icon = test.status === 'expected' ? 'PASS' :
                   test.status === 'skipped'  ? 'SKIP' : 'FAIL';
      list.push(icon + ' | ' + test.title);
    }
    collectTests(suite.suites, list);
  }
}
const tests = [];
collectTests(r.suites, tests);

const lines = [
  'Total   : ' + total,
  'Passed  : ' + passed,
  'Failed  : ' + (failed + flaky),
  'Skipped : ' + skipped,
  '',
  'Test Details:',
  ...tests
];
process.stdout.write(lines.join('\\n'));
"
''').trim()
                }
            }

            // ── Send email report (mirrors GitHub Actions send-email job) ─────
            // Store these 3 values in Jenkins credentials as Secret Text:
            //   Credential ID: MAIL_USERNAME  → your Gmail address
            //   Credential ID: MAIL_PASSWORD  → your Gmail App Password
            //   Credential ID: MAIL_TO        → recipient email address
            withCredentials([
                string(credentialsId: 'MAIL_USERNAME', variable: 'MAIL_USERNAME'),
                string(credentialsId: 'MAIL_PASSWORD', variable: 'MAIL_PASSWORD'),
                string(credentialsId: 'MAIL_TO',       variable: 'MAIL_TO')
            ]) {
                emailext(
                    from    : "Playwright CI <${env.MAIL_USERNAME}>",
                    to      : "${env.MAIL_TO}",
                    subject : "${currentBuild.currentResult == 'SUCCESS' ? 'Playwright Tests Passed' : 'Playwright Tests Failed'} — Build #${env.BUILD_NUMBER}",
                    body    : """Playwright Automation Test Results
===================================

Job          : ${env.JOB_NAME}
Branch       : ${env.GIT_BRANCH ?: 'main'}
Build Number : #${env.BUILD_NUMBER}
Status       : ${currentBuild.currentResult}
Build URL    : ${env.BUILD_URL}

Results Summary:
----------------
${env.TEST_SUMMARY}

View Reports:
-------------
Custom Report   : ${env.BUILD_URL}Custom_Report/
Monocart Report : ${env.BUILD_URL}Monocart_Report/
Playwright      : ${env.BUILD_URL}Playwright_Report/

---
This is an automated message from Jenkins."""
                )
            }

        }
    }
}
