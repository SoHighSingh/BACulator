import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
      // The app loads Prisma's WASM client (for Workers), which ships CommonJS only; tests run on
      // Node, where the regular client is the right one.
      "@prisma/client/wasm": "@prisma/client",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
