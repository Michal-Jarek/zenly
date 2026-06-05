import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

// Architecture boundary: Prisma and the data layer are reachable only through the business-logic layer.
// This rule is the architectural proof and works independently of eslint-config-next.
const PRISMA_PATH = {
  name: "@prisma/client",
  message: "Prisma client may be imported only inside src/server/data/** (data layer).",
};
const DATA_LAYER_PATTERN = {
  group: ["@/server/data", "@/server/data/*", "@/server/data/**", "**/server/data", "**/server/data/*", "**/server/data/**"],
  message: "The data layer (src/server/data/**) may be imported only by src/server/services/** (business-logic layer).",
};

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "prisma/migrations/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: [PRISMA_PATH], patterns: [DATA_LAYER_PATTERN] }],
    },
  },
  {
    // Data layer is the only place allowed to import @prisma/client.
    files: ["src/server/data/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Services may import the data layer, but never @prisma/client directly.
    files: ["src/server/services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: [PRISMA_PATH] }],
    },
  },
];

export default eslintConfig;
