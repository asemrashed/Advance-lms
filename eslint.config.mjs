import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
      "src/lib/course-details.ts",
      "src/lib/website-content.ts",
      "src/lib/courses.ts",
      "src/lib/categories.ts",
      "src/app/components/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  /* learning-project dashboard parity — keep source-of-truth code style; mock-only. */
  {
    files: [
      "src/components/dashboard/lp/**/*.{ts,tsx}",
      "src/app/dashboard/parity/**/*.{ts,tsx}",
      "src/components/ui/data-table.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  /* learning-project role-area ports — verbatim UI + mock API; same rules as reference. */
  {
    files: [
      "src/app/student/**/*.{ts,tsx}",
      "src/app/instructor/**/*.{ts,tsx}",
      "src/app/admin/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
