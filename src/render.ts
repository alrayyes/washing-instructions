import { renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import { PhoneDocument, PrintDocument } from "./documents";
import type { Machine } from "./machine";
import type { ResolvedInstruction } from "./types";

async function pageCount(pdf: Uint8Array): Promise<number> {
  return (await PDFDocument.load(pdf)).getPageCount();
}

/** Rough first guess at the phone sheet's height, refined by measurement. */
function guessHeight(items: ResolvedInstruction[]): number {
  const prose = items.reduce(
    (total, item) =>
      total + item.detergent.length + item.ironing.length + item.drying.length + item.notes.length,
    0,
  );
  return 260 + items.length * 250 + prose * 0.35;
}

export interface PhoneRender {
  pdf: Uint8Array;
  height: number;
  attempts: number;
}

/**
 * Renders the phone sheet as a single continuous page.
 *
 * There is no way to ask the layout engine how tall the content came out, so
 * the height is found by rendering: grow until it stops spilling onto a second
 * page, then bisect back down until the trailing blank space is under a
 * centimetre. Each pass is a few tens of milliseconds.
 */
export async function renderPhone(
  items: ResolvedInstruction[],
  machine: Machine,
  tolerance = 8,
): Promise<PhoneRender> {
  const render = (height: number) => renderToBuffer(PhoneDocument({ items, height, machine }));
  let attempts = 0;

  const fits = async (height: number) => {
    attempts += 1;
    const pdf = await render(height);
    return { pdf, single: (await pageCount(pdf)) === 1 };
  };

  let tooShort = 0;
  let height = Math.ceil(guessHeight(items));
  let best: { pdf: Uint8Array; height: number } | null = null;

  for (let step = 0; step < 12 && best === null; step += 1) {
    const { pdf, single } = await fits(height);
    if (single) best = { pdf, height };
    else {
      tooShort = height;
      height = Math.ceil(height * 1.35);
    }
  }
  if (best === null) throw new Error("could not fit the phone sheet onto one page");

  let low = tooShort;
  let high = best.height;
  while (high - low > tolerance) {
    const middle = Math.round((low + high) / 2);
    const { pdf, single } = await fits(middle);
    if (single) {
      best = { pdf, height: middle };
      high = middle;
    } else {
      low = middle;
    }
  }

  return { pdf: best.pdf, height: best.height, attempts };
}

export async function renderPrint(
  items: ResolvedInstruction[],
  machine: Machine,
): Promise<Uint8Array> {
  return renderToBuffer(PrintDocument({ items, machine }));
}
