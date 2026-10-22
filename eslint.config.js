import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".claude", "cloudflare-env.d.ts", ".next", ".open-next", ".wrangler", ".shots", ".taste-skill", "backups", "public/sw.js", "public/swe-worker-*.js", "motion", "next-env.d.ts"],
  },
  ...nextVitals,
  {
    // React Compiler checks that came with eslint-config-next 16. The app doesn't use the compiler;
    // these flag working patterns (refs read in render, setState in effects). Warn until the
    // night/landing hooks are refactored (HANDOFF lists it as a follow-up).
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    // Tool configs export a bare object by convention.
    files: ["*.config.js", "*.config.mjs"],
    rules: { "import/no-anonymous-default-export": "off" },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
);
