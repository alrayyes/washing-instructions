import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedVersion, VALE_VERSION, valeAsset } from "../scripts/vale-release";

describe("valeAsset", () => {
  test("names the release archive for this platform", () => {
    expect(valeAsset("linux", "x64")).toBe(`vale_${VALE_VERSION}_Linux_64-bit.tar.gz`);
    expect(valeAsset("linux", "arm64")).toBe(`vale_${VALE_VERSION}_Linux_arm64.tar.gz`);
    expect(valeAsset("darwin", "x64")).toBe(`vale_${VALE_VERSION}_macOS_64-bit.tar.gz`);
    expect(valeAsset("darwin", "arm64")).toBe(`vale_${VALE_VERSION}_macOS_arm64.tar.gz`);
  });

  test("refuses a platform we have no archive for, naming it", () => {
    expect(() => valeAsset("win32", "x64")).toThrow(/win32-x64/);
    expect(() => valeAsset("linux", "riscv64")).toThrow(/linux-riscv64/);
  });
});

describe("installedVersion", () => {
  test("reports nothing when the binary is absent", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vale-probe-"));
    expect(await installedVersion(join(dir, "vale"))).toBeNull();
  });

  // A Vale binary built for the wrong libc installs perfectly and then cannot
  // start, and the kernel reports that as ENOENT on a file that plainly exists
  // because what exec cannot find is the ELF interpreter. Probing must answer
  // "not installed" rather than throwing a stack trace over it.
  test("reports nothing when the binary is there but will not run", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vale-probe-"));
    const binary = join(dir, "vale");
    await writeFile(binary, "not an executable", { mode: 0o755 });
    expect(await installedVersion(binary)).toBeNull();
  });
});
