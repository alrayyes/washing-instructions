import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { parseInstructions } from "../src/csv";
import { cardGroups } from "../src/mixing";

const CSV = "data/washing-instructions.csv";

/**
 * The outer test: run the tool exactly as a person would and check the two
 * PDFs that come out. Anything below this — parsing, mixing rules, layout —
 * only exists to make this pass.
 */
describe("bun run generate", () => {
  let out: string;
  let exitCode: number;
  let stdout: string;

  beforeAll(async () => {
    out = await mkdtemp(join(tmpdir(), "washing-"));
    const result = Bun.spawnSync({
      cmd: ["bun", "run", "src/cli.ts", CSV, "--out", out],
      stdout: "pipe",
      stderr: "pipe",
    });
    exitCode = result.exitCode;
    stdout = result.stdout.toString() + result.stderr.toString();
  }, 120_000);

  afterAll(async () => {
    await rm(out, { recursive: true, force: true });
  });

  test("exits cleanly", () => {
    expect(stdout).not.toContain("error");
    expect(exitCode).toBe(0);
  });

  test("writes a phone PDF that is one continuous page", async () => {
    const pdf = await PDFDocument.load(await readFile(join(out, "washing-instructions-phone.pdf")));
    expect(pdf.getPageCount()).toBe(1);

    const page = pdf.getPage(0);
    expect(page.getWidth()).toBeCloseTo(244, 0);
    // Tall enough to be a scroll sheet, but bisected down rather than padded.
    expect(page.getHeight()).toBeGreaterThan(page.getWidth() * 8);
  });

  test("writes a printable PDF, every page A4", async () => {
    const pdf = await PDFDocument.load(await readFile(join(out, "washing-instructions-print.pdf")));
    const cards = cardGroups(parseInstructions(await readFile(CSV, "utf8"))).length;

    // The reference sheet, then the cards flowing over as many sheets as they
    // need. Two fit comfortably today, but a wordy row can push that to one.
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1 + Math.ceil(cards / 2));
    expect(pdf.getPageCount()).toBeLessThanOrEqual(1 + cards);

    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28, 0);
      expect(page.getHeight()).toBeCloseTo(841.89, 0);
    }
  });

  test("reports which piles can share a drum", () => {
    expect(stdout).toContain("Piles that can share a drum");
    expect(stdout).toContain("Dark + Black Socks + Denim");
    expect(stdout).toContain("White + White Socks");
  });

  test("reports the piles that collapsed onto one card", () => {
    expect(stdout).toContain("sharing one card");
    expect(stdout).toContain("Merino Wool + Cashmere Blend");
  });
});
