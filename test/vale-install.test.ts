import { describe, expect, test } from "bun:test";
import { VALE_VERSION, valeAsset } from "../scripts/vale-release";

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
