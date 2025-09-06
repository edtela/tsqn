import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: ["verbose"],
    globals: true,
    environment: "node",
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "tests", "*.config.ts"],
    },
  },
});
