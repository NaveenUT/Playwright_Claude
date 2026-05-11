pipeline {
    agent any

    // Required Jenkins plugins:
    //   - NodeJS Plugin          → tools block (Node 20)
    //   - HTML Publisher Plugin  → publishHTML steps
    //   - Email Extension Plugin → emailext step
    //   - Credentials Binding    → withCredentials block

    tools {
        // Manage Jenkins → Tools → NodeJS installations → Add "NodeJS-20" (version 20.x)
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
        MAIL_TO  = 'gopikasrip@unitedtechno.com'
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
                // catchError lets the pipeline continue to publish reports even if tests fail
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    bat 'npm run test:smoke -- --project=chromium'
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
                    bat 'npm run test:regression -- --project=chromium'
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

            // ── Parse results.json — write helper script then run with node ───
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

            // ── Send email report ─────────────────────────────────────────────
            // Add these 3 Secret Text credentials in Jenkins:
            //   Manage Jenkins → Credentials → Global → Add Credential (Secret text)
            //   IDs: MAIL_USERNAME, MAIL_PASSWORD, MAIL_TO
            script {
                try {
                    withCredentials([
                        usernamePassword(credentialsId: 'gmail_credentials', usernameVariable: 'MAIL_USERNAME', passwordVariable: 'MAIL_PASSWORD')
                    ]) {
                        emailext(
                            from                : "Playwright CI <${env.MAIL_USERNAME}>",
                            to                  : "${env.MAIL_TO}",
                            subject             : "${currentBuild.currentResult == 'SUCCESS' ? 'Playwright Tests Passed' : 'Playwright Tests Failed'} — Build #${env.BUILD_NUMBER}",
                            attachmentsPattern  : 'custom-report/index.html,playwright-report/index.html,monocart-report/index.html',
                            body                : """Playwright Automation Test Results
===================================

Job          : ${env.JOB_NAME}
Branch       : ${env.GIT_BRANCH ?: 'main'}
Build Number : #${env.BUILD_NUMBER}
Status       : ${currentBuild.currentResult}

Results Summary:
----------------
${env.TEST_SUMMARY}

---
Reports are attached to this email.
Open the attached HTML files in your browser to view the full report.

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
