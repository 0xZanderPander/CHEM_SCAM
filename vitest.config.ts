import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    // Pinned explicitly rather than left to Vitest's default. Vitest only
    // defaults NODE_ENV to "test" when it is unset, so a developer or CI runner
    // that exports NODE_ENV=production makes the production environment guard
    // in lib/env.ts fire during unrelated route tests and eight suites fail for
    // reasons that have nothing to do with the code under test.
    env: { NODE_ENV: "test" },
  },
});
