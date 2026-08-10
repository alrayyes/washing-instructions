import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve as resolvePath } from "node:path";
import { parseInstructions } from "./csv";
import { cardGroups, loadGroups, resolve } from "./mixing";
import { renderPhone, renderPrint } from "./render";

const DEFAULT_CSV = "data/washing-instructions.csv";
const DEFAULT_OUT = "out";

function usage(): string {
  return [
    "Usage: bun run generate [csv] [--out <dir>]",
    "",
    `  csv          instruction CSV to read (default: ${DEFAULT_CSV})`,
    `  --out <dir>  where the PDFs go (default: ${DEFAULT_OUT})`,
  ].join("\n");
}

interface Args {
  csv: string;
  out: string;
}

export function parseArgs(argv: string[]): Args {
  let csv = DEFAULT_CSV;
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
  if (positional[0] !== undefined) csv = positional[0];
  return { csv, out };
}

async function main(argv: string[]): Promise<void> {
  const { csv, out } = parseArgs(argv);

  const source = await Bun.file(csv).text();
  const items = resolve(parseInstructions(source));

  await mkdir(out, { recursive: true });
  const stem = basename(csv).replace(/\.csv$/i, "");
  const phonePath = join(out, `${stem}-phone.pdf`);
  const printPath = join(out, `${stem}-print.pdf`);

  const [phone, print] = await Promise.all([renderPhone(items), renderPrint(items)]);
  await Promise.all([writeFile(phonePath, phone.pdf), writeFile(printPath, print)]);

  const groups = loadGroups(items).filter((group) => group.length > 1);
  const merged = cardGroups(items).filter((group) => group.length > 1);

  console.log(`Read ${items.length} piles from ${resolvePath(csv)}`);
  console.log(
    `  ${phonePath}  one page, ${Math.round(phone.height)} pt tall ` +
      `(${phone.attempts} layout passes)`,
  );
  console.log(`  ${printPath}`);
  if (groups.length > 0) {
    console.log("\nPiles that can share a drum:");
    for (const group of groups) {
      console.log(`  ${group.map((item) => item.clothingType).join(" + ")}`);
    }
  }
  if (merged.length > 0) {
    console.log("\nSet up identically on both appliances, so sharing one card:");
    for (const group of merged) {
      console.log(`  ${group.map((item) => item.clothingType).join(" + ")}`);
    }
  }
}

if (import.meta.main) {
  main(Bun.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
