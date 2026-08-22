import { describe, expect, test } from "bun:test";
import { type Instruction, resolve } from "@washy-washy/core";
import { renderPrint } from "@washy-washy/pdf";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { DIST_MACHINE, loadMachine } from "../src/machine";

function pile(index: number): Instruction {
  return {
    clothingType: `Pile ${index}`,
    detergent: "Colour liquid detergent",
    fabricSoftener: false,
    temperature: "40",
    spin: "1200",
    duration: "~2:15",
    program: "Cottons",
    options: ["Eco"],
    ironing: true,
    ironingNotes: "Steam.",
    ironSetting: "3",
    drying: "Line dry.",
    colourGroup: "colour",
    mixTags: [],
    notes: "",
    referenceName: "",
    referenceLink: "",
  };
}

/** How many bytes of drawing instructions each page carries. */
async function inkPerPage(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => {
    const contents = page.node.get(PDFName.of("Contents"));
    const stream = contents ? pdf.context.lookup(contents) : undefined;
    return stream instanceof PDFRawStream ? stream.contents.length : 0;
  });
}

describe("renderPrint", () => {
  /**
   * Adding a pile is a CSV edit, and it costs the reference sheet a row in the
   * summary table and another in the matrix. Past fifteen or so piles that runs
   * off the bottom of the A4, and @react-pdf answers a page it cannot fit with
   * an almost empty sheet rather than an error.
   */
  test("keeps the reference sheet on one page as piles pile up", async () => {
    const machine = await loadMachine(DIST_MACHINE);
    const items = resolve(Array.from({ length: 24 }, (_, index) => pile(index + 1)));

    const { pdf } = await renderPrint(items, machine);
    expect((await inkPerPage(pdf)).filter((ink) => ink < 1000)).toEqual([]);
  }, 60_000);
});
