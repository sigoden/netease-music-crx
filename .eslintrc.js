process.env.NODE_ENV = 'development'

module.exports = {
  parser: '@babel/eslint-parser',
  extends: [
    'react-app',
    'standard',
    'standard-jsx',
    'standard-react',
  ],
  globals: {
    chrome: 'readonly',
  },
  ignorePatterns: ['build', 'tmp'],
  rules: {
    'react/prop-types': 0,
    'comma-dangle': ['error', 'always-multiline'],
  },
}
