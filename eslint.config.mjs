import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Security plugin configuration
  {
    plugins: {
      security: (await import("eslint-plugin-security")).default,
    },
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-eval-with-expression": "error",
    },
  },
  // Architecture guardrails (warning-only during migration).
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/lib/providers/*"],
              message:
                "Import provider-backed services from domain/lib modules instead of using providers directly in app/components/hooks.",
            },
          ],
        },
      ],
    },
  },
  // Dev/ops tooling (cache warmers, seeders, design-scrape, importers) under
  // `scripts/` legitimately reads files from computed paths and indexes parsed
  // JSON / config objects by design. These two rules are tuned for
  // request-handling code where inputs can be attacker-controlled; in one-off
  // CLIs the inputs are operator-controlled, so the false positives here add
  // noise without security value.
  {
    files: ["scripts/**/*.{ts,tsx,js,mjs}"],
    rules: {
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
