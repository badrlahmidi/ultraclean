/**
 * Visual Regression Baseline
 * --------------------------
 * Captures a full-page screenshot of the login page (the app entry point).
 * On the first run this creates the baseline snapshot inside
 * tests/ui-ux/__snapshots__/.  Subsequent runs diff against that baseline.
 *
 * Run:  npx playwright test tests/ui-ux/visual-regression.spec.ts
 * Update baseline:  npx playwright test --update-snapshots
 */
import { test, expect } from '@playwright/test';

test.describe('Visual Regression — Login Page', () => {
    test.beforeEach(async ({ page }) => {
        // Disable CSS animations/transitions so screenshots are deterministic.
        await page.addStyleTag({
            content: `
        *, *::before, *::after {
          animation-duration: 0ms !important;
          transition-duration: 0ms !important;
        }
      `,
        });
    });

    test('login page matches visual baseline (desktop)', async ({ page }) => {
        await page.goto('/login');

        // Wait for the form to be fully rendered.
        await page.waitForSelector('#login-identifier', { state: 'visible' });

        // Hide dynamic content that changes between runs (timestamps, etc.)
        await page.evaluate(() => {
            document.querySelectorAll('[data-testid="timestamp"]').forEach(el => {
                (el as HTMLElement).style.visibility = 'hidden';
            });
        });

        await expect(page).toHaveScreenshot('login-desktop.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.03, // 3 % tolerance for anti-aliasing differences
        });
    });

    test('login page matches visual baseline (mobile)', async ({ page }) => {
        // Simulate a mobile viewport (375 × 812 — iPhone X).
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/login');
        await page.waitForSelector('#login-identifier', { state: 'visible' });

        await expect(page).toHaveScreenshot('login-mobile.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.03,
        });
    });
});
