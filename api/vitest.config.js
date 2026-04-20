import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup.js"],
    env: {
      // Required so Stripe controllers initialise with the mock client (stripe.mock.js)
      STRIPE_SECRET_KEY: "sk_test_vitest_placeholder",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["controllers/**", "middleware/**", "lib/**", "validators/**"],
      exclude: ["**/*.spec.js", "tests/**"],
    },
  },
});
