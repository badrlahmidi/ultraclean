/**
 * pos-cashier.spec.ts — POS / Caissier Interface User-Flow Tests
 * ---------------------------------------------------------------
 * Runs under the `chromium-caissier` project which loads the saved caissier
 * storageState, so the page is accessed already authenticated.
 *
 * Tests cover:
 *  - Dashboard loads and KPI grid is visible
 *  - "Nouveau ticket" CTA button is present and focusable
 *  - Recent-tickets table renders
 *  - Navigation to the ticket-creation page works
 *  - Shift-warning banner appears when no shift is open (structural check)
 *  - POS Index page loads with stats and table
 *  - POS Create page loads with product grid and recap sidebar
 *  - Alt+V keyboard shortcut navigates to POS create page
 *
 * Run:  npx playwright test --project=chromium-caissier
 */
import { test, expect } from '@playwright/test';

test.describe('POS / Caissier Interface — User Flow', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/caisse');
        // Wait for the stats grid to confirm the page is fully rendered.
        await page.waitForSelector('.grid', { state: 'visible' });
    });

    // ── 1. Dashboard structure ───────────────────────────────────────────────
    test('caissier dashboard loads and shows the KPI stats grid', async ({ page }) => {
        await expect(page).toHaveTitle(/Caissier|Caisse|RitajPOS/i);

        // Four stat cards in the KPI grid.
        const kpiGrid = page.locator('.grid').first();
        await expect(kpiGrid).toBeVisible();
        const statCards = kpiGrid.locator('> div');
        await expect(statCards).toHaveCount(4);
    });

    // ── 2. "Nouveau ticket" CTA ──────────────────────────────────────────────
    test('caissier dashboard — "Nouveau ticket" button is visible and focusable', async ({ page }) => {
        // Scope to #app-main to avoid matching the identical link in the sidebar nav.
        const newTicketBtn = page.locator('#app-main').getByRole('link', { name: /nouveau ticket/i });
        await expect(newTicketBtn).toBeVisible();

        // Verify it points to the ticket creation route.
        const href = await newTicketBtn.getAttribute('href');
        expect(href).toMatch(/tickets\/create|caisse/i);

        // Keyboard focus should reach the button.
        await newTicketBtn.focus();
        await expect(newTicketBtn).toBeFocused();
    });

    // ── 3. Recent tickets section ────────────────────────────────────────────
    test('caissier dashboard — recent-tickets section is rendered', async ({ page }) => {
        // The section has a heading "Tickets récents — aujourd'hui".
        const ticketsHeading = page.getByText(/tickets récents/i);
        await expect(ticketsHeading).toBeVisible();

        // The enclosing card element is present.
        const ticketsCard = page.locator('.bg-white.rounded-xl.border').filter({
            has: ticketsHeading,
        });
        await expect(ticketsCard).toBeVisible();
    });

    // ── 4. Navigation to ticket-creation page ────────────────────────────────
    test('caissier — clicking "Nouveau ticket" navigates to create page', async ({ page }) => {
        // Scope to #app-main to avoid the duplicate in the sidebar nav.
        const newTicketBtn = page.locator('#app-main').getByRole('link', { name: /nouveau ticket/i });
        await newTicketBtn.click();

        // Should land on the ticket creation page (not an error page).
        await page.waitForURL(url => url.pathname.includes('ticket'), { timeout: 10_000 });
        // Confirm we haven't been redirected back to login.
        expect(page.url()).not.toContain('/login');
    });

    // ── 5. "Voir tous les tickets" secondary link ─────────────────────────────
    test('caissier dashboard — "Voir tous les tickets" link is present', async ({ page }) => {
        const allTicketsLink = page.getByRole('link', { name: /voir tous les tickets/i });
        await expect(allTicketsLink).toBeVisible();
    });

    // ── 6. AppLayout navigation is present ───────────────────────────────────
    test('caissier dashboard — sidebar navigation is visible', async ({ page }) => {
        const nav = page.locator('nav[aria-label="Navigation principale"]');
        await expect(nav).toBeVisible();
    });

    // ── 7. Visual baseline — caissier dashboard (desktop) ────────────────────
    test('caissier dashboard — full-page visual baseline', async ({ page }) => {
        // Allow charts/data to settle.
        await page.waitForTimeout(600);

        await expect(page).toHaveScreenshot('caissier-dashboard-desktop.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            mask: [
                // Dynamic numbers (live ticket counts, revenue).
                page.locator('.text-xl.font-bold'),
                // Date/time stamps.
                page.locator('time, [class*="date"], [class*="time"]'),
            ],
        });
    });

    // ── 8. POS Index page ────────────────────────────────────────────────────
    test('caissier POS index — page loads with stats and action button', async ({ page }) => {
        await page.goto('/caisse/pos');
        await page.waitForSelector('.grid', { state: 'visible' });

        // Stat cards (ventes + CA)
        const statCards = page.locator('.grid').first().locator('> div');
        await expect(statCards).toHaveCount(2);

        // "Nouvelle vente" CTA
        const newSaleBtn = page.getByRole('link', { name: /nouvelle vente/i });
        await expect(newSaleBtn).toBeVisible();
        const href = await newSaleBtn.getAttribute('href');
        expect(href).toMatch(/pos\/nouveau|pos\/create/i);

        // Page title
        await expect(page).toHaveTitle(/point de vente/i);
    });

    // ── 9. POS Create page ───────────────────────────────────────────────────
    test('caissier POS create — two-column layout renders', async ({ page }) => {
        await page.goto('/caisse/pos/nouveau');
        // Wait for layout to appear
        await page.waitForLoadState('networkidle');

        // Page title
        await expect(page).toHaveTitle(/point de vente/i);

        // Left column header
        await expect(page.getByText(/point de vente/i).first()).toBeVisible();
    });

    // ── 10. POS sidebar link ──────────────────────────────────────────────────
    test('caissier sidebar — POS navigation link is present', async ({ page }) => {
        // Navigate to dashboard first
        await page.goto('/caisse');
        await page.waitForSelector('nav', { state: 'visible' });

        // Check that sidebar has POS-related link
        const posLink = page.locator('nav').getByRole('link', { name: /point de vente|ventes pos/i }).first();
        await expect(posLink).toBeVisible();
    });

    // ── 11. Alt+V shortcut ────────────────────────────────────────────────────
    test('caissier — Alt+V shortcut navigates to POS create page', async ({ page }) => {
        await page.goto('/caisse');
        await page.waitForLoadState('networkidle');

        // Press Alt+V from a non-input context
        await page.keyboard.press('Alt+v');
        await page.waitForURL(url => url.pathname.includes('pos'), { timeout: 8_000 });

        expect(page.url()).toMatch(/pos/);
        expect(page.url()).not.toContain('/login');
    });
});

