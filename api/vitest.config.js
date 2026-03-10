import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["controllers/**", "middleware/**", "lib/**", "validators/**"],
      exclude: ["**/*.spec.js", "tests/**"],
    },
  },
});
