import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { outputStem, resolveCsv } from "../src/cli";

describe("resolveCsv", () => {
  test("prefers your own file when it is there", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csv-"));
    const mine = join(dir, "washing-instructions.csv");
    await writeFile(mine, "");
    await writeFile(`${mine}.dist`, "");

    expect(await resolveCsv(mine)).toBe(mine);
  });

  // A fresh clone has only the .dist: the real file is gitignored, because it
  // describes one household's laundry and nobody else's.
  test("falls back to the .dist when it is not", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csv-"));
    const mine = join(dir, "washing-instructions.csv");
    await writeFile(`${mine}.dist`, "");

    expect(await resolveCsv(mine)).toBe(`${mine}.dist`);
  });

  test("complains about a named file that is not there, rather than substituting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csv-"));
    await expect(resolveCsv(join(dir, "nope.csv"))).rejects.toThrow(/nope\.csv/);
  });
});

describe("outputStem", () => {
  test("names the PDFs after the input", () => {
    expect(outputStem("data/washing-instructions.csv")).toBe("washing-instructions");
    expect(outputStem("/tmp/my-laundry.CSV")).toBe("my-laundry");
  });

  // Reading the .dist should still write washing-instructions-phone.pdf, not
  // washing-instructions.csv-phone.pdf.
  test("does not let the .dist suffix leak into the filename", () => {
    expect(outputStem("data/washing-instructions.csv.dist")).toBe("washing-instructions");
  });
});
