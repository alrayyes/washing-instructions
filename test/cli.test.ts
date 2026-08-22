import { describe, expect, test } from "bun:test";
import { outputStem, parseArgs } from "../src/cli";

describe("outputStem", () => {
  test("names the PDFs after the input", () => {
    expect(outputStem("data/washy-washy.json")).toBe("washy-washy");
    expect(outputStem("/tmp/my-laundry.JSON")).toBe("my-laundry");
  });

  // Reading the .dist should still write washy-washy-phone.pdf, not
  // washy-washy.json-phone.pdf.
  test("does not let the .dist suffix leak into the filename", () => {
    expect(outputStem("data/washy-washy.json.dist")).toBe("washy-washy");
  });
});

describe("parseArgs", () => {
  test("defaults to the committed config path and out/", () => {
    expect(parseArgs([])).toEqual({ config: "data/washy-washy.json", out: "out" });
  });

  test("takes the config as a positional argument", () => {
    expect(parseArgs(["data/mine.json"]).config).toBe("data/mine.json");
  });

  test("takes --out (or -o)", () => {
    expect(parseArgs(["--out", "dist"]).out).toBe("dist");
    expect(parseArgs(["-o", "dist"]).out).toBe("dist");
  });

  test("rejects a second positional argument", () => {
    expect(() => parseArgs(["a.json", "b.json"])).toThrow(/unexpected argument: b\.json/);
  });

  test("rejects --out with nothing after it", () => {
    expect(() => parseArgs(["--out"])).toThrow(/--out needs a directory/);
  });

  test("--help throws the usage text rather than running", () => {
    expect(() => parseArgs(["--help"])).toThrow(/Usage: bun run generate/);
  });
});
