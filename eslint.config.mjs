import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "app/generated/**",
    "src/generated/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      // Data-loading effects intentionally synchronize remote state into the UI.
      "react-hooks/set-state-in-effect": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none", vars: "all", varsIgnorePattern: "^_" },
      ],
      "no-duplicate-imports": "error",
      "no-shadow": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "multi-line"],
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      // Keep self-authored UI modules deep but reviewable; generated shadcn files are exempt.
      "max-lines": ["error", { max: 650, skipBlankLines: true, skipComments: true }],
    },
  },
]);
