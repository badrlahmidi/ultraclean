/**
 * global.setup.ts — Playwright authentication setup
 * ---------------------------------------------------
 * Runs ONCE before the full test suite. Logs in as the admin user and as the
 * caissier user, then saves each browser storage state to a JSON file that
 * authenticated test specs can reuse via `storageState`.
 *
 * This means no test has to go through the login flow — pages are loaded
 * already authenticated, making tests faster and more focused.
 *
 * Output files (git-ignored):
 *   tests/ui-ux/.auth/admin.json
 *   tests/ui-ux/.auth/caissier.json
 */
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
// Storage-state paths consumed by authenticated projects in playwright.config.ts
export const ADMIN_AUTH = path.resolve('tests/ui-ux/.auth/admin.json');
export const CAISSIER_AUTH = path.resolve('tests/ui-ux/.auth/caissier.json');

async function loginAs(
    baseURL: string,
    email: string,
    password: string,
    outputPath: string,
): Promise<void> {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${baseURL}/login`);
    await page.waitForSelector('#login-identifier', { state: 'visible' });

    await page.fill('#login-identifier', email);
    await page.fill('#login-password', password);
    await page.click('button[type="submit"]');

    // Wait until we are no longer on /login (redirect to dashboard).
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15_000 });

    // Persist cookies + localStorage so other test contexts can reuse the session.
    await context.storageState({ path: outputPath });

    await browser.close();
    console.log(`✔  Saved auth state for ${email} → ${outputPath}`);
}

export default async function globalSetup(config: FullConfig) {
    const baseURL = config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:8000';

    // Ensure the output directory exists.
    const authDir = path.resolve('tests/ui-ux/.auth');
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Log in both roles in sequence (single Laravel server, keep it serial).
    // Credentials MUST be provided via environment variables — never hardcode them.
    const adminEmail    = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;
    const caissierEmail    = process.env.TEST_CAISSIER_EMAIL;
    const caissierPassword = process.env.TEST_CAISSIER_PASSWORD;

    if (!adminEmail || !adminPassword || !caissierEmail || !caissierPassword) {
        throw new Error(
            'E2E setup requires TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, ' +
            'TEST_CAISSIER_EMAIL, and TEST_CAISSIER_PASSWORD environment variables. ' +
            'Set them in your CI secrets or export them in your shell before running Playwright.'
        );
    }

    await loginAs(baseURL, adminEmail, adminPassword, ADMIN_AUTH);
    await loginAs(baseURL, caissierEmail, caissierPassword, CAISSIER_AUTH);
}
