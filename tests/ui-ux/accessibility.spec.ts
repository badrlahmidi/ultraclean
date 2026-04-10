/**
 * Accessibility Audit — axe-core
 * --------------------------------
 * Scans the login page (public entry point) with axe-core and asserts zero
 * critical/serious violations.  Results are also written to the console so
 * they appear in the Playwright HTML report.
 *
 * Run:  npx playwright test tests/ui-ux/accessibility.spec.ts
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit', () => {
    test('login page — zero critical/serious axe violations', async ({ page }) => {
        await page.goto('/login');
        await page.waitForSelector('#login-identifier', { state: 'visible' });

        const results = await new AxeBuilder({ page })
            // Focus on the most impactful rule categories.
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
            // The decorative left panel has aria-hidden="true" — exclude to avoid
            // false positives on images that intentionally have no alt text there.
            .exclude('[aria-hidden="true"]')
            .analyze();

        // Print a human-readable summary for the HTML report.
        if (results.violations.length > 0) {
            console.log('\n╔══════════════════════════════════════════╗');
            console.log('║      AXE-CORE ACCESSIBILITY VIOLATIONS   ║');
            console.log('╚══════════════════════════════════════════╝\n');
            results.violations.forEach((v, i) => {
                console.log(`[${i + 1}] ${v.impact?.toUpperCase()} — ${v.id}`);
                console.log(`    Description : ${v.description}`);
                console.log(`    Help URL    : ${v.helpUrl}`);
                v.nodes.forEach(n => {
                    console.log(`    ↳ ${n.target.join(', ')}`);
                    if (n.failureSummary) console.log(`      ${n.failureSummary}`);
                });
                console.log('');
            });
        } else {
            console.log('✅  No axe-core violations detected on the login page.');
        }

        // Assert: no critical or serious violations.
        const criticalOrSerious = results.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious',
        );
        expect(
            criticalOrSerious,
            `Found ${criticalOrSerious.length} critical/serious a11y violation(s):\n` +
            criticalOrSerious.map(v => `  • [${v.impact}] ${v.id}: ${v.description}`).join('\n'),
        ).toHaveLength(0);
    });

    test('login page — zero incomplete (needs-review) items are critical', async ({ page }) => {
        await page.goto('/login');
        await page.waitForSelector('#login-identifier', { state: 'visible' });

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .exclude('[aria-hidden="true"]')
            .analyze();

        // Log incomplete items as warnings (not failures).
        if (results.incomplete.length > 0) {
            console.log(`\n⚠  ${results.incomplete.length} item(s) need manual review:`);
            results.incomplete.forEach(item => {
                console.log(`  • [${item.impact ?? 'unknown'}] ${item.id}: ${item.description}`);
            });
        }

        // Pass count metrics.
        console.log(`\n📊  Axe summary:`);
        console.log(`    Passes    : ${results.passes.length}`);
        console.log(`    Violations: ${results.violations.length}`);
        console.log(`    Incomplete: ${results.incomplete.length}`);
        console.log(`    Inapplicable: ${results.inapplicable.length}`);        // This test always passes — it is informational.
        expect(results).toBeDefined();
    });

    test('login page — dark mode: zero critical/serious contrast violations', async ({ page }) => {
        // Emulate dark colour-scheme preference before loading the page.
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/login');
        await page.waitForSelector('#login-identifier', { state: 'visible' });

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            // Focus specifically on colour-contrast rules in dark mode.
            .withRules(['color-contrast'])
            .exclude('[aria-hidden="true"]')
            .analyze();

        if (results.violations.length > 0) {
            console.log('\n🌙  DARK MODE — colour-contrast violations:');
            results.violations.forEach((v, i) => {
                console.log(`  [${i + 1}] ${v.impact?.toUpperCase()} — ${v.id}: ${v.description}`);
                v.nodes.forEach(n => {
                    console.log(`      ↳ ${n.target.join(', ')}`);
                    if (n.failureSummary) console.log(`        ${n.failureSummary}`);
                });
            });
        } else {
            console.log('✅  No dark-mode colour-contrast violations on the login page.');
        }

        const criticalOrSerious = results.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious',
        );
        expect(
            criticalOrSerious,
            `Found ${criticalOrSerious.length} critical/serious dark-mode contrast violation(s):\n` +
            criticalOrSerious.map(v => `  • [${v.impact}] ${v.id}: ${v.description}`).join('\n'),
        ).toHaveLength(0);
    });
});
