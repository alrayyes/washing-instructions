import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configFromJson, configToJson } from "@washy-washy/core";
import { skeletonConfig } from "../scripts/new-config";

describe("skeletonConfig", () => {
  test("is a config the parser accepts as-is", () => {
    const config = skeletonConfig();
    expect(() => configFromJson(configToJson(config))).not.toThrow();
  });

  test("has exactly one placeholder pile, not zero", () => {
    // instructionsFromRows refuses an empty chart outright, so a truly
    // empty skeleton would be unloadable the moment it was written.
    expect(skeletonConfig().chart).toHaveLength(1);
  });
});

describe("bun run new-config", () => {
  test("writes a config the CLI can generate from immediately", async () => {
    const dir = await mkdtemp(join(tmpdir(), "new-config-"));
    const path = join(dir, "washy-washy.json");

    const result = Bun.spawnSync({
      cmd: ["bun", "run", "scripts/new-config.ts", path],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(0);
    const written = JSON.parse(await readFile(path, "utf8"));
    expect(written.$schema).toContain("config.schema.json");
    expect(written.chart).toHaveLength(1);
  });

  test("refuses to overwrite an existing file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "new-config-"));
    const path = join(dir, "washy-washy.json");
    await Bun.write(path, "not touched");

    const result = Bun.spawnSync({
      cmd: ["bun", "run", "scripts/new-config.ts", path],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(await readFile(path, "utf8")).toBe("not touched");
  });
});
