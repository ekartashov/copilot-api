import config from "@echristian/eslint-config"

export default [
  ...config({
    prettier: {
      plugins: ["prettier-plugin-packagejson"],
    },
  }),
  {
    files: ["test/**/*.test.ts", "test/**/*.ts"],
    rules: {
      "max-params": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "max-lines": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "unicorn/prefer-module": "off",
      "unicorn/consistent-function-scoping": "off",
      "no-var": "off",
    },
  },
]
