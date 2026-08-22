/**
 * Re-shoots the PNGs the README shows, from the PDFs under `docs/`.
 *
 * The PDFs already have a staleness test: `test/generate.test.ts` redraws them
 * and compares page by page, so they cannot drift. The screenshots had nothing,
 * and they drifted for three days across three releases before anyone noticed.
 *
 * Rasterising needs poppler, which is a system package rather than a bun one,
 * so this command is not something CI can run. What CI can do is notice that it
 * *should* have been run: every shot records a hash of the PDF page it was
 * taken from, and `test/screenshots.test.ts` checks those against the PDFs as
 * they stand. That needs nothing extra installed, survives a fresh clone in a way file
 * timestamps do not, and fails exactly when someone runs `bun run examples` and
 * forgets this.
 *
 * ImageMagick is deliberately not involved. `pdftoppm` crops on its own with
 * -x/-y/-W/-H, and one dependency is better than two.
 */
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

export const DOCS = "docs";
export const MANIFEST = `${DOCS}/screenshots.json`;

export interface Shot {
  /** The PNG under `docs/`, as the README names it. */
  png: string;
  /** The PDF it comes out of, under `docs/`. */
  pdf: string;
  /** 1-based, the way pdftoppm counts. */
  page: number;
  dpi: number;
  /**
   * Pixels to keep from the top left, for a page too long to show whole. The
   * phone sheet is one continuous page thousands of points tall; the top of it
   * is the part worth a picture.
   */
  crop?: { width: number; height: number };
}

/**
 * 150 dpi over the 244 pt phone page gives 509 px, and 110 dpi over an A4 gives
 * 910×1287. Those are the widths the README's `width=` attributes are set
 * against, so changing a dpi here means changing them there.
 */
export const SHOTS: Shot[] = [
  {
    png: "phone.png",
    pdf: "washy-washy-phone.pdf",
    page: 1,
    dpi: 150,
    crop: { width: 509, height: 1500 },
  },
  {
    png: "phone-washing.png",
    pdf: "washy-washy-phone-washing.pdf",
    page: 1,
    dpi: 150,
    crop: { width: 509, height: 1500 },
  },
  {
    png: "phone-ironing.png",
    pdf: "washy-washy-phone-ironing.pdf",
    page: 1,
    dpi: 150,
    crop: { width: 509, height: 1500 },
  },
  { png: "print.png", pdf: "washy-washy-print.pdf", page: 1, dpi: 110 },
  {
    png: "print-washing.png",
    pdf: "washy-washy-print-washing.pdf",
    page: 1,
    dpi: 110,
  },
  {
    png: "print-ironing.png",
    pdf: "washy-washy-print-ironing.pdf",
    page: 1,
    dpi: 110,
  },
  // The second page of the printable set, where the cards are. The reference
  // sheet on page 1 says what the chart holds; this says what it looks like.
  { png: "print-card.png", pdf: "washy-washy-print.pdf", page: 2, dpi: 110 },
];

/**
 * A hash of what one page of a PDF actually draws.
 *
 * The content stream rather than the file's bytes, for the same reason
 * `test/generate.test.ts` uses it: two runs over the same input number their
 * streams differently and stamp their own creation date, so the file changes
 * when the drawing has not.
 */
export async function pageInk(pdf: Uint8Array, page: number): Promise<string> {
  const doc = await PDFDocument.load(pdf);
  const target = doc.getPages()[page - 1];
  if (!target) throw new Error(`page ${page} does not exist — the PDF has ${doc.getPageCount()}`);
  const stream = doc.context.lookup(target.node.get(PDFName.of("Contents")));
  if (!(stream instanceof PDFRawStream)) throw new Error(`page ${page} draws nothing`);
  return Bun.hash(stream.contents).toString(16);
}

/** What the committed screenshots were taken from, keyed by PNG name. */
export type Manifest = Record<string, string>;

export async function inkOf(shot: Shot): Promise<string> {
  return pageInk(await Bun.file(`${DOCS}/${shot.pdf}`).bytes(), shot.page);
}

/** The PNG's own dimensions, read straight out of the IHDR chunk. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

async function shoot(shot: Shot): Promise<void> {
  const out = `${DOCS}/${shot.png}`;
  const crop = shot.crop
    ? ["-x", "0", "-y", "0", "-W", `${shot.crop.width}`, "-H", `${shot.crop.height}`]
    : [];

  const result = Bun.spawnSync({
    cmd: [
      "pdftoppm",
      "-png",
      "-r",
      `${shot.dpi}`,
      "-f",
      `${shot.page}`,
      "-l",
      `${shot.page}`,
      "-singlefile",
      ...crop,
      `${DOCS}/${shot.pdf}`,
      // pdftoppm appends the extension itself.
      out.replace(/\.png$/, ""),
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(`pdftoppm failed on ${shot.png}: ${result.stderr.toString().trim()}`);
  }
}

if (import.meta.main) {
  if (Bun.which("pdftoppm") === null) {
    console.error(
      "pdftoppm is not installed. It comes with poppler:\n" +
        "  Arch    sudo pacman -S poppler\n" +
        "  Debian  sudo apt install poppler-utils\n" +
        "  macOS   brew install poppler",
    );
    process.exit(1);
  }

  const manifest: Manifest = {};
  for (const shot of SHOTS) {
    await shoot(shot);
    manifest[shot.png] = await inkOf(shot);
    const size = pngSize(await Bun.file(`${DOCS}/${shot.png}`).bytes());
    console.log(
      `  ${DOCS}/${shot.png}  ${size.width}x${size.height}  from ${shot.pdf} p${shot.page}`,
    );
  }

  await Bun.write(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nwrote ${MANIFEST}`);
}
