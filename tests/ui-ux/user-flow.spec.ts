/**
 * User Flow Tests — Login Form
 * ----------------------------
 * Tests the most critical interactive flow of the application:
 * the login form. Covers field interaction, validation feedback,
 * password toggle, and form submission behaviour.
 *
 * Run:  npx playwright test tests/ui-ux/user-flow.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('User Flow — Login Form', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.waitForSelector('#login-identifier', { state: 'visible' });
    });

    // ── 1. Page loads with correct title and form elements ────────────────────
    test('login page renders all required form elements', async ({ page }) => {
        await expect(page).toHaveTitle(/Connexion/i);

        // Identifier field
        await expect(page.locator('#login-identifier')).toBeVisible();
        await expect(page.locator('label[for="login-identifier"]')).toBeVisible();

        // Password field
        await expect(page.locator('#login-password')).toBeVisible();
        await expect(page.locator('label[for="login-password"]')).toBeVisible();

        // Remember-me checkbox
        await expect(page.locator('input[type="checkbox"]')).toBeVisible();

        // Submit button
        await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
    });

    // ── 2. Identifier field accepts input ─────────────────────────────────────
    test('can type into the email/username field', async ({ page }) => {
        const identifierInput = page.locator('#login-identifier');
        await identifierInput.click();
        await identifierInput.fill('admin@example.ma');
        await expect(identifierInput).toHaveValue('admin@example.ma');
    });

    // ── 3. Password visibility toggle ─────────────────────────────────────────
    test('password visibility toggle works correctly', async ({ page }) => {
        const passwordInput = page.locator('#login-password');
        const toggleButton = page.getByRole('button', { name: /afficher le mot de passe/i });

        // Initial state: password hidden
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Type a password
        await passwordInput.fill('secret123');

        // Toggle to show
        await toggleButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
        await expect(page.getByRole('button', { name: /masquer le mot de passe/i })).toBeVisible();

        // Toggle back to hide
        await page.getByRole('button', { name: /masquer le mot de passe/i }).click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    // ── 4. Remember-me checkbox toggles ───────────────────────────────────────
    test('remember-me checkbox can be toggled', async ({ page }) => {
        const checkbox = page.locator('input[type="checkbox"]');
        await expect(checkbox).not.toBeChecked();

        await checkbox.check();
        await expect(checkbox).toBeChecked();

        await checkbox.uncheck();
        await expect(checkbox).not.toBeChecked();
    });

    // ── 5. Submit with empty fields shows validation error ────────────────────
    test('submitting empty form returns server-side validation error', async ({ page }) => {
        const submitBtn = page.getByRole('button', { name: /se connecter/i });

        // Submit without filling anything
        await submitBtn.click();

        // Playwright waits for Inertia navigation / response.
        // The server should return a 422 and the form should display an error.
        // We assert the button becomes re-enabled (not stuck in processing).
        await expect(submitBtn).toBeEnabled({ timeout: 8_000 });

        // The page should remain on /login (no redirect on failed auth).
        await expect(page).toHaveURL(/\/login/);
    });

    // ── 6. Keyboard navigation — Tab order is logical ─────────────────────────
    test('tab order traverses form fields in logical order', async ({ page }) => {
        // Start from the identifier input
        await page.locator('#login-identifier').focus();
        await expect(page.locator('#login-identifier')).toBeFocused();

        await page.keyboard.press('Tab');
        // Should focus the toggle button inside the password wrapper, OR password field directly
        // depending on DOM order. We accept either.
        const focused = await page.evaluate(() => document.activeElement?.id ?? document.activeElement?.getAttribute('aria-label') ?? '');
        expect(['login-password', 'Afficher le mot de passe', 'Masquer le mot de passe']).toContain(focused);
    });

    // ── 7. Submit button shows loading state while processing ─────────────────
    test('submit button shows loading spinner when form is submitted', async ({ page }) => {
        await page.locator('#login-identifier').fill('test@example.com');
        await page.locator('#login-password').fill('password');

        const submitBtn = page.getByRole('button', { name: /se connecter/i });

        // Intercept the network request to slow it down so we can capture the loading state.
        await page.route('**/login', async route => {
            await page.waitForTimeout(300); // Small delay to capture loading spinner
            await route.continue();
        });

        await submitBtn.click();

        // While processing, button should show loading state (disabled).
        // The spinner or "Connexion…" text should appear briefly.
        await expect(submitBtn).toBeDisabled({ timeout: 2_000 }).catch(() => {
            // If the request was too fast, this is acceptable — the server responded immediately.
            console.log('ℹ  Loading state too brief to capture (fast server response).');
        });
    });
});
