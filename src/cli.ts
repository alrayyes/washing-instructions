import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve as resolvePath } from "node:path";
import {
  cardGroups,
  durationsOf,
  loadGroups,
  type ResolvedInstruction,
  resolve,
  type Variant,
} from "@washy-washy/core";
import { renderPhone, renderPrint } from "@washy-washy/pdf";
import { loadConfig } from "./config";

const DEFAULT_CONFIG = "data/washy-washy.json";
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
    "Usage: bun run generate [config] [--out <dir>]",
    "",
    `  config            machine+chart config to read (default: ${DEFAULT_CONFIG},`,
    "                    falling back to the committed .dist)",
    `  --out <dir>       where the six PDFs go (default: ${DEFAULT_OUT})`,
  ].join("\n");
}

/** What the PDFs are named after. The .dist suffix is not part of the name. */
export function outputStem(path: string): string {
  return basename(path)
    .replace(/\.dist$/i, "")
    .replace(/\.json$/i, "");
}

interface Args {
  config: string;
  out: string;
}

export function parseArgs(argv: string[]): Args {
  let config = DEFAULT_CONFIG;
  let out = DEFAULT_OUT;
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string;
    if (argument === "--out" || argument === "-o") {
      const value = argv[index + 1];
      if (value === undefined) throw new Error("--out needs a directory");
      out = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      throw new Error(usage());
    } else {
      positional.push(argument);
    }
  }

  if (positional.length > 1) throw new Error(`unexpected argument: ${positional[1]}`);
  if (positional[0] !== undefined) config = positional[0];
  return { config, out };
}

async function main(argv: string[]): Promise<void> {
  const { config: requested, out } = parseArgs(argv);
  const { file, config } = await loadConfig(requested);
  const { machine, chart } = config;
  const items = resolve(chart);

  await mkdir(out, { recursive: true });
  const stem = outputStem(file);
  const dropped = new Set<string>();

  const written = await Promise.all(
    SHEETS.flatMap(({ variant, suffix }) => [
      (async () => {
        const path = join(out, `${stem}-phone${suffix}.pdf`);
        const phone = await renderPhone(items, machine, variant);
        for (const character of phone.dropped) dropped.add(character);
        await writeFile(path, phone.pdf);
        return `${path}  one page, ${Math.round(phone.height)} pt tall (${phone.attempts} layout passes)`;
      })(),
      (async () => {
        const path = join(out, `${stem}-print${suffix}.pdf`);
        const print = await renderPrint(items, machine, variant);
        for (const character of print.dropped) dropped.add(character);
        await writeFile(path, print.pdf);
        return path;
      })(),
    ]),
  );

  const groups = loadGroups(items).filter((group) => group.length > 1);
  const merged = cardGroups(items).filter((group) => group.length > 1);
  const names = (group: ResolvedInstruction[]) =>
    group.map((item) => item.clothingType).join(" + ");

  console.log(`Read ${items.length} piles from ${resolvePath(file)}`);
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
  if (dropped.size > 0) {
    console.log(
      `\nCharacters the font can't render (transliterated or stripped): ${[...dropped].join(" ")}`,
    );
  }
}

if (import.meta.main) {
  main(Bun.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
