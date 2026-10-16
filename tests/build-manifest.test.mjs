import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = path.join(root, 'public/build');
const manifest = JSON.parse(readFileSync(path.join(build, 'manifest.json'), 'utf8'));

test('the production manifest includes every Inertia page', () => {
    const pages = readdirSync(path.join(root, 'resources/js/Pages'), { recursive: true })
        .filter(file => file.endsWith('.jsx'));

    assert.ok(pages.length > 0);
    for (const page of pages) {
        const entry = `resources/js/Pages/${page.split(path.sep).join('/')}`;
        assert.ok(manifest[entry], `Missing Vite entry: ${entry}`);
    }
});

test('all manifest assets and imported chunks exist', () => {
    for (const [name, entry] of Object.entries(manifest)) {
        for (const file of [entry.file, ...(entry.css ?? []), ...(entry.assets ?? [])]) {
            assert.ok(existsSync(path.join(build, file)), `Missing asset: ${file} (${name})`);
        }
        for (const dependency of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) {
            assert.ok(manifest[dependency], `Missing chunk: ${dependency} (${name})`);
        }
    }
});
