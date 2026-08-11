import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { parseInstructions } from "../src/csv";
import { DIST_MACHINE, loadMachine } from "../src/machine";
import { cardGroups } from "../src/mixing";

// The committed dummy chart, not `data/washing-instructions.csv` — that one is
// gitignored, so on a fresh clone and in CI it is not there to read.
const CSV = "data/washing-instructions.csv.dist";

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
      // Both files named explicitly. The defaults prefer your own chart and
      // your own machine, which is right for a person at a terminal and wrong
      // for a test that has to mean the same thing on every clone.
      cmd: ["bun", "run", "src/cli.ts", CSV, "--out", out, "--machine", DIST_MACHINE],
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
    const cards = cardGroups(
      parseInstructions(await readFile(CSV, "utf8"), await loadMachine(DIST_MACHINE)),
    ).length;

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

  test("says which appliances it drew for", () => {
    expect(stdout).toContain("Generic front loader");
  });

  /**
   * A machine with longer programme names once widened the summary table by
   * enough to push the reference sheet a point past A4, and @react-pdf answers
   * a page it cannot fit with an empty sheet rather than an error. Nothing
   * failed: the page count stayed inside its allowed range and the blank sheet
   * only turned up when someone printed it.
   */
  test("prints no blank pages", async () => {
    const pdf = await PDFDocument.load(await readFile(join(out, "washing-instructions-print.pdf")));

    const ink = pdf.getPages().map((page) => {
      const contents = page.node.get(PDFName.of("Contents"));
      const stream = contents ? pdf.context.lookup(contents) : undefined;
      return stream instanceof PDFRawStream ? stream.contents.length : 0;
    });

    expect(ink.filter((bytes) => bytes < 1000)).toEqual([]);
  });
});

/**
 * The whole point of the machine file: the same chart, a different fascia.
 * Nothing in the code knows what a programme is called.
 */
describe("bun run generate --machine", () => {
  test("draws whatever machine it is given", async () => {
    const dir = await mkdtemp(join(tmpdir(), "machine-"));
    const machine = join(dir, "machine.json");
    const chart = join(dir, "chart.csv");

    await writeFile(
      machine,
      JSON.stringify({
        washer: {
          name: "Zanussi ZWF",
          capacity: "7 kg",
          programs: ["Arrêt", "Coton", "Synthétiques", "Laine"],
          temperatures: ["froid", "30", "40"],
          spins: ["0", "1000"],
          options: ["Prélavage"],
        },
        iron: {
          name: "Calor Pro",
          settings: [
            { key: "1", dots: "•", label: "•", detail: "synthétiques", steam: false },
            { key: "2", dots: "••", label: "••", detail: "laine", steam: true },
          ],
        },
      }),
    );
    await writeFile(
      chart,
      "clothing_type,detergent,fabric_softener,temperature,spin,duration,program,options," +
        "ironing,iron_setting,drying,colour_group,mix_tags,notes\n" +
        "Linge blanc,Lessive,no,40,1000,~2:00,Coton,Prélavage,Fer chaud,2,Étendre,white,,\n" +
        "Pulls,Lessive laine,no,30,0,~0:40,Laine,,Ne pas repasser,1,À plat,any,,\n",
    );

    const result = Bun.spawnSync({
      cmd: ["bun", "run", "src/cli.ts", chart, "--out", dir, "--machine", machine],
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = result.stdout.toString() + result.stderr.toString();

    expect(output).toContain("Zanussi ZWF");
    expect(result.exitCode).toBe(0);
    expect(await Bun.file(join(dir, "chart-print.pdf")).exists()).toBe(true);

    await rm(dir, { recursive: true, force: true });
  }, 120_000);

  test("refuses a chart written for a different machine, and says which value", async () => {
    // A fixture rather than data/machine.json: that one is gitignored, so on a
    // fresh clone loadMachine would fall back to the .dist and this would pass
    // by agreeing with itself.
    const dir = await mkdtemp(join(tmpdir(), "other-"));
    const machine = join(dir, "machine.json");
    await writeFile(
      machine,
      JSON.stringify({
        washer: {
          name: "Some Other Washer",
          capacity: "8 kg",
          programs: ["Uit", "Katoen", "Wol"],
          temperatures: ["koud", "30", "60"],
          spins: ["0", "1200"],
          options: ["Extra spoelen"],
        },
        iron: {
          name: "Some Other Iron",
          settings: [
            { key: "1", dots: "•", label: "•", detail: "", steam: false },
            { key: "2", dots: "••", label: "••", detail: "", steam: true },
          ],
        },
      }),
    );

    const result = Bun.spawnSync({
      cmd: ["bun", "run", "src/cli.ts", CSV, "--out", dir, "--machine", machine],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toMatch(/row 2, column "(program|options)"/);

    await rm(dir, { recursive: true, force: true });
  }, 60_000);
});
