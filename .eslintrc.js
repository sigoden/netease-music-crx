process.env.NODE_ENV = "development";

module.exports = {
  parser: "@babel/eslint-parser",
  extends: ["react-app", "plugin:prettier/recommended"],
  globals: {
    chrome: "readonly",
    globalThis: true,
  },
  ignorePatterns: ["build", "tmp"],
};
