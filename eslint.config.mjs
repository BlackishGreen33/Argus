import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "app/generated/**", "playwright-report/**", "test-results/**"]),
  {
    rules: {
      // Data-loading effects intentionally synchronize remote state into the UI.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
