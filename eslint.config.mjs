import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloud Functions is a separate Node.js package with its own build/tsc —
    // not part of this Next.js app's lint surface.
    "functions/**",
    // Firebase CLI's local deploy staging area (bundled SSR function output,
    // including vendored node_modules) — not source, never lint it.
    ".firebase/**",
  ]),
]);

export default eslintConfig;
