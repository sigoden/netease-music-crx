process.env.NODE_ENV = "development";

module.exports = {
  parser: "@babel/eslint-parser",
  extends: ["react-app", "plugin:prettier/recommended"],
  plugins: ["react"],
  globals: {
    chrome: "readonly",
    globalThis: true,
  },
  ignorePatterns: ["build", "tmp"],
  rules: {
    "@typescript-eslint/no-explicit-any": 0,
  },
};
