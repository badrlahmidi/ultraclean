import { defineConfig, devices } from '@playwright/test';
import path from 'path';
/**
 * Playwright configuration for RitajPOS UI/UX test suite.
 *
 * Prerequisites:
 *   1. Start the Laravel dev server: php artisan serve
 *   2. Start the Vite asset server:  npm run dev
 *   Then run: npx playwright test
 *
 * The webServer block below will attempt to start `php artisan serve`
 * automatically when you run tests. If your server is already running,
 * Playwright will reuse it (reuseExistingServer: true).
 *
 * Auth setup
 * ----------
 * global.setup.ts runs once before the suite, logs in as admin + caissier,
 * and saves session state to tests/ui-ux/.auth/*.json.
 * Authenticated projects load that state via `storageState` so individual
 * tests never need to go through the login flow.
 */

const ADMIN_AUTH = path.resolve('tests/ui-ux/.auth/admin.json');
const CAISSIER_AUTH = path.resolve('tests/ui-ux/.auth/caissier.json');

export default defineConfig({
    testDir: './tests/ui-ux',
    // Runs once before all tests: logs in and saves session state to .auth/*.json
    globalSetup: './tests/ui-ux/global.setup.ts',
    fullyParallel: false,          // keep sequential — single Laravel server
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ],

    use: {
        baseURL: 'http://127.0.0.1:8000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        locale: 'fr-FR',
        /* Ignore HTTPS errors in local dev (self-signed certs) */
        ignoreHTTPSErrors: true,
    }, projects: [
        /* ── 1. Public / unauthenticated tests ── */
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: /dashboard\.spec|pos-cashier\.spec/,
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
            testIgnore: /dashboard\.spec|pos-cashier\.spec/,
        },

        /* ── 2. Authenticated — Admin (Desktop Chrome) ── */
        {
            name: 'chromium-admin',
            use: {
                ...devices['Desktop Chrome'],
                storageState: ADMIN_AUTH,
            },
            testMatch: /dashboard\.spec\.ts/,
        },

        /* ── 3. Authenticated — Caissier (Desktop Chrome) ── */
        {
            name: 'chromium-caissier',
            use: {
                ...devices['Desktop Chrome'],
                storageState: CAISSIER_AUTH,
            }, testMatch: /pos-cashier\.spec\.ts/,
        },
    ],

    /* Output directories */
    outputDir: 'test-results/',
    snapshotDir: 'tests/ui-ux/__snapshots__',

    /* Automatically start the Laravel dev server before running tests.
       Playwright will wait until port 8000 is ready (timeout: 30 s). */
    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8000',
        url: 'http://127.0.0.1:8000',
        reuseExistingServer: true,
        timeout: 30_000,
    },
});
