import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
    js.configs.recommended,
    jsxA11y.flatConfigs.recommended,
    {
        files: ['resources/js/**/*.{js,jsx}'],
        plugins: {
            react,
            'react-hooks': reactHooks,
            'unused-imports': unusedImports,
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                route: 'readonly', // Ziggy helper
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            // ── React ──────────────────────────────────────────────
            'react/prop-types': 'off', // Using Inertia props, no PropTypes
            'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
            'react/jsx-uses-vars': 'error', // Prevent false positives for JSX component usage

            // ── React Hooks ─────────────────────────────────────────
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // ── Accessibility (jsx-a11y) — warn first, fix progressively ──
            'jsx-a11y/click-events-have-key-events': 'warn',
            'jsx-a11y/no-static-element-interactions': 'warn',
            'jsx-a11y/anchor-is-valid': 'warn',
            'jsx-a11y/label-has-associated-control': ['warn', {
                assert: 'either',
                controlComponents: ['Input', 'Select', 'Textarea', 'Combobox'],
                depth: 3,
            }],
            'jsx-a11y/no-noninteractive-element-interactions': 'warn',
            'jsx-a11y/no-autofocus': 'warn',

            // ── Unused imports (auto-fixable) ──────────────────────
            'unused-imports/no-unused-imports': 'warn',

            // ── General ────────────────────────────────────────────
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
                destructuredArrayIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
    {
        ignores: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/**',
            'storage/**',
            '*.config.js',
            '*.cjs',
        ],
    },
];
