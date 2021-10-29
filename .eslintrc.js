process.env.NODE_ENV = 'development'

module.exports = {
  parser: '@babel/eslint-parser',
  extends: [
    'react-app',
    'standard'
  ],
  globals: {
    chrome: 'readonly'
  },
  ignorePatterns: ['build/**/*']
}
