import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'warn',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
    },
  },

  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['vitest.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    ignores: ['node_modules/**', 'coverage/**', '*.zip', '*.crx'],
  },

  prettier,
];
