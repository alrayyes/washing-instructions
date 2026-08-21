import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve as resolvePath } from "node:path";
import {
  cardGroups,
  DEFAULT_MACHINE,
  durationsOf,
  loadGroups,
  parseInstructions,
  type ResolvedInstruction,
  resolve,
  type Variant,
} from "@washy-washy/core";
import { renderPhone, renderPrint } from "@washy-washy/pdf";
import { loadMachine } from "./machine";

const DEFAULT_CSV = "data/washing-instructions.csv";
const DEFAULT_OUT = "out";

/**
 * The three cuts of the chart, and what each adds to a filename.
 *
 * Six files out of one run rather than a flag to pick between them: the two
 * halves are pinned in different rooms, so wanting one is not wanting the
 * other instead.
 */
const SHEETS: { variant: Variant; suffix: string }[] = [
  { variant: "full", suffix: "" },
  { variant: "wash", suffix: "-washing" },
  { variant: "iron", suffix: "-ironing" },
];

function usage(): string {
  return [
    "Usage: bun run generate [csv] [--out <dir>] [--machine <file>]",
    "",
    `  csv               instruction CSV to read (default: ${DEFAULT_CSV},`,
    "                    falling back to the committed .dist)",
    `  --out <dir>       where the six PDFs go (default: ${DEFAULT_OUT})`,
    `  --machine <file>  the appliances to draw (default: ${DEFAULT_MACHINE},`,
    "                    falling back to the committed .dist)",
  ].join("\n");
}

/**
 * Which file to actually read. `data/washing-instructions.csv` describes one
 * household's laundry and is gitignored, so a fresh clone has only the .dist
 * beside it — fall back to that rather than failing on a checkout that is
 * perfectly fine. Falling back needs a .dist to exist, so naming a file that
 * simply is not there still fails, which is what you want when you meant your
 * own chart and mistyped it.
 */
export async function resolveCsv(csv: string): Promise<string> {
  if (await Bun.file(csv).exists()) return csv;
  if (await Bun.file(`${csv}.dist`).exists()) return `${csv}.dist`;
  throw new Error(`no such file: ${csv}`);
}

/** What the PDFs are named after. The .dist suffix is not part of the name. */
export function outputStem(csv: string): string {
  return basename(csv)
    .replace(/\.dist$/i, "")
    .replace(/\.csv$/i, "");
}

interface Args {
  csv: string;
  out: string;
  machine: string;
}

export function parseArgs(argv: string[]): Args {
  let csv = DEFAULT_CSV;
  let out = DEFAULT_OUT;
  let machine = DEFAULT_MACHINE;
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    if (argument === "--out" || argument === "-o") {
      const value = argv[index + 1];
      if (value === undefined) throw new Error("--out needs a directory");
      out = value;
      index += 1;
    } else if (argument === "--machine" || argument === "-m") {
      const value = argv[index + 1];
      if (value === undefined) throw new Error("--machine needs a file");
      machine = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      throw new Error(usage());
    } else {
      positional.push(argument);
    }
  }

  if (positional.length > 1) throw new Error(`unexpected argument: ${positional[1]}`);
  if (positional[0] !== undefined) csv = positional[0];
  return { csv, out, machine };
}

async function main(argv: string[]): Promise<void> {
  const { csv: requested, out, machine: machinePath } = parseArgs(argv);
  const csv = await resolveCsv(requested);
  const machine = await loadMachine(machinePath);

  const source = await Bun.file(csv).text();
  const items = resolve(parseInstructions(source, machine));

  await mkdir(out, { recursive: true });
  const stem = outputStem(csv);

  const written = await Promise.all(
    SHEETS.flatMap(({ variant, suffix }) => [
      (async () => {
        const path = join(out, `${stem}-phone${suffix}.pdf`);
        const phone = await renderPhone(items, machine, variant);
        await writeFile(path, phone.pdf);
        return `${path}  one page, ${Math.round(phone.height)} pt tall (${phone.attempts} layout passes)`;
      })(),
      (async () => {
        const path = join(out, `${stem}-print${suffix}.pdf`);
        await writeFile(path, await renderPrint(items, machine, variant));
        return path;
      })(),
    ]),
  );

  const groups = loadGroups(items).filter((group) => group.length > 1);
  const merged = cardGroups(items).filter((group) => group.length > 1);
  const names = (group: ResolvedInstruction[]) =>
    group.map((item) => item.clothingType).join(" + ");

  console.log(`Read ${items.length} piles from ${resolvePath(csv)}`);
  console.log(`  drawn for ${machine.washer.name} · ${machine.iron.name}`);
  for (const line of written) console.log(`  ${line}`);
  if (groups.length > 0) {
    console.log("\nPiles that can share a drum:");
    // Padded so the run times line up, which is the column you read down.
    const width = Math.max(...groups.map((group) => names(group).length));
    for (const group of groups) {
      console.log(`  ${names(group).padEnd(width)}  ${durationsOf(group)}`);
    }
  }
  if (merged.length > 0) {
    console.log("\nSet up identically on both appliances, so sharing one card:");
    for (const group of merged) console.log(`  ${names(group)}`);
  }
}

if (import.meta.main) {
  main(Bun.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
