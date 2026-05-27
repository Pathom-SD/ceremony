import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("package-lock.json", () => {
  it("stays in sync with package.json so npm ci works in Docker", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    for (const args of [["ci", "--dry-run"], ["ci", "--dry-run", "--omit=dev"]] as const) {
      const result = spawnSync("npm", [...args], {
        cwd: root,
        shell: true,
        encoding: "utf8",
      });
      expect(result.status, `${args.join(" ")}: ${result.stderr || result.stdout}`).toBe(0);
    }
  });
});
