import globals from 'globals';

export default [
  {
    files: ['app.js', 'sw.js', 'legal.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.serviceworker
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-constant-condition': 'error',
      'valid-typeof': 'error'
    }
  }
];
