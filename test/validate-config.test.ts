import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("bun run validate-config", () => {
  // Named explicitly rather than relying on default resolution: a real
  // clone can have its own data/washy-washy.json, and this has to mean the
  // same thing on every machine regardless of whether one exists locally.
  test("accepts the committed .dist", () => {
    const result = Bun.spawnSync({
      cmd: ["bun", "run", "scripts/validate-config.ts", "data/washy-washy.json.dist"],
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
