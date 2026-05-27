import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "happy-dom",
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**"],
    // Vitest supports this, but next's TS config may not know it.
    environmentMatchGlobs: [
      ["src/lib/**/*.test.ts", "node"],
      ["src/lib/**/*.test.tsx", "node"],
    ],
  } as unknown as { environment: string },
});
