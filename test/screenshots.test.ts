import { describe, expect, test } from "bun:test";
import { DOCS, inkOf, MANIFEST, type Manifest, pngSize, SHOTS } from "../scripts/screenshots";

/**
 * The screenshots at the top of the README are the first thing anyone sees, and
 * unlike the PDFs beside them nothing used to check they were current. They
 * drifted for three days across three releases.
 *
 * Rasterising needs poppler, so this cannot re-shoot them and compare pixels —
 * CI cannot rasterise a PDF, and a fresh clone has no file timestamps to trust.
 * What it can do is compare the hash each shot recorded of the page it came
 * from against that page as it stands now. Change the chart, run
 * `bun run examples`, and this goes red until `bun run screenshots` has run.
 */
const manifest = (await Bun.file(MANIFEST).json()) as Manifest;

describe("the README screenshots", () => {
  test("the manifest lists exactly the shots that are taken", () => {
    expect(Object.keys(manifest).sort()).toEqual(SHOTS.map((shot) => shot.png).sort());
  });

  for (const shot of SHOTS) {
    describe(shot.png, () => {
      test("is committed", async () => {
        expect(await Bun.file(`${DOCS}/${shot.png}`).exists()).toBe(true);
      });

      test("was shot from the PDF as it stands", async () => {
        expect(manifest[shot.png], `run: bun run screenshots`).toBe(await inkOf(shot));
      });

      /**
       * The README sets a `width=` against these, so a shot taken at the wrong
       * dpi renders at the wrong scale rather than failing outright.
       */
      test("is the size its dpi and crop imply", async () => {
        const size = pngSize(await Bun.file(`${DOCS}/${shot.png}`).bytes());
        if (shot.crop) {
          expect(size).toEqual(shot.crop);
          return;
        }
        // A4 at the shot's dpi, which is what an uncropped page comes out as.
        // Ceil, not round: poppler never drops a partial pixel off the edge.
        expect(size.width).toBe(Math.ceil((595.28 * shot.dpi) / 72));
        expect(size.height).toBe(Math.ceil((841.89 * shot.dpi) / 72));
      });
    });
  }
});
