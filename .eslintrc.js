module.exports = {
  extends: [
    'eslint:recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react/prop-types': 'off',
    'no-undef': 'off',
    'no-unused-vars': 'off'
  },
  env: {
    es6: true,
    node: true
  },
  ignorePatterns: ['node_modules/**/*', 'dist/**/*', '*.js', '*.config.js']
}
