import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    // Only src/ui gets browser globals; src/lib must stay DOM-free.
    files: ['src/ui/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/lib/**/*.js'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['document', 'window', 'navigator'].map((name) => ({
          name,
          message: 'src/lib must stay DOM-free (it runs under node --test); do browser work in src/ui and pass plain data in.',
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Relative paths that climb out of src/lib into ui: ../ui, ../ui/x.js, ../../src/ui/x.js
              regex: '^(?:\\./)?(?:\\.\\./)+(?:src/)?ui(?:/|$)',
              message: 'src/lib must not import from src/ui; ui calls lib, never the reverse.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
];
