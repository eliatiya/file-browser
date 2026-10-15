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
        { name: 'document', message: 'src/lib must be DOM-free; do DOM work in src/ui.' },
        { name: 'window', message: 'src/lib must be DOM-free; do DOM work in src/ui.' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/ui/**', '**/ui'], message: 'src/lib must not import from src/ui.' }] },
      ],
    },
  },
  {
    files: ['tests/**/*.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
];
