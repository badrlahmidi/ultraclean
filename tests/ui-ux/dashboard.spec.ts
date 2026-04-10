/**
 * dashboard.spec.ts — Admin Dashboard Visual Regression
 * -------------------------------------------------------
 * Runs under the `chromium-admin` project which loads the saved admin
 * storageState, so the page is accessed already authenticated.
 *
 * First run (no baseline):  npx playwright test --project=chromium-admin --update-snapshots
 * Subsequent runs:           npx playwright test --project=chromium-admin
 */
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard — Visual Regression', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the admin dashboard and wait for the KPI grid to render.
        await page.goto('/admin');
        // Wait for at least one StatCard to be visible (the KPI grid).
        await page.waitForSelector('.grid', { state: 'visible' });
        // Give charts / lazy-loaded widgets a moment to settle.
        await page.waitForTimeout(800);
    });

    test('admin dashboard — full-page baseline (desktop)', async ({ page }) => {
        await expect(page).toHaveTitle(/Dashboard Admin/i);

        // Confirm the KPI stats grid is present.
        const kpiGrid = page.locator('.grid').first();
        await expect(kpiGrid).toBeVisible();

        // Full-page screenshot comparison.
        await expect(page).toHaveScreenshot('admin-dashboard-desktop.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            // Mask dynamic elements that change between runs.
            mask: [
                // Ticket counts / revenue numbers (live data)
                page.locator('.text-xl.font-bold'),
                // Recharts SVG (animated, data-driven)
                page.locator('svg.recharts-surface'),
                // Any "time ago" / date stamps
                page.locator('time, [class*="date"], [class*="time"]'),
            ],
        });
    });

    test('admin dashboard — KPI section structure is stable', async ({ page }) => {
        // Assert the four KPI cards are rendered (structural, not visual).
        const statCards = page.locator('.grid').first().locator('> div');
        await expect(statCards).toHaveCount(4);
    });

    test('admin dashboard — navigation sidebar is visible', async ({ page }) => {
        // AppLayout sidebar should be present for authenticated admin.
        const nav = page.locator('nav[aria-label="Navigation principale"]');
        await expect(nav).toBeVisible();
    });

    test('admin dashboard — page title and heading', async ({ page }) => {
        await expect(page).toHaveTitle(/Dashboard Admin/i);
        // The layout renders a title prop — check the document title is set.
        const title = await page.title();
        expect(title).toMatch(/Dashboard|RitajPOS/i);
    });
});
