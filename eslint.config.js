// @ts-check
const tseslint = require('typescript-eslint');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const templateParser = require('@angular-eslint/template-parser');

module.exports = tseslint.config(
  {
    ignores: ['dist/', 'coverage/', '.nx/', 'node_modules/', 'functions/lib/'],
  },
  // TypeScript source files
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    plugins: { '@angular-eslint': angular },
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
    },
  },
  // Angular HTML templates
  {
    files: ['src/**/*.html'],
    plugins: { '@angular-eslint/template': angularTemplate },
    languageOptions: { parser: templateParser },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/no-negated-async': 'warn',
    },
  },
);
