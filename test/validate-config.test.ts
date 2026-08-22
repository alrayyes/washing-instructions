import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("bun run validate-config", () => {
  test("accepts the committed .dist by default", () => {
    const result = Bun.spawnSync({
      cmd: ["bun", "run", "scripts/validate-config.ts"],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("data/washy-washy.json.dist is valid");
  });

  test("names the specific field for a broken config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "validate-config-"));
    const path = join(dir, "washy-washy.json");
    await writeFile(path, JSON.stringify({ machine: {} }));

    const result = Bun.spawnSync({
      cmd: ["bun", "run", "scripts/validate-config.ts", path],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("chart is missing");
  });

  test("says which file it could not read", () => {
    const result = Bun.spawnSync({
      cmd: ["bun", "run", "scripts/validate-config.ts", "no/such/config.json"],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("no/such/config.json");
  });
});
