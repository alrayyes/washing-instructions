<!--
Maintainer note (stripped before this file enters context).
Keep this short and only about what the code cannot say for itself. The README
is where the prose explanation lives; this file is the set of traps.
-->

# washing-instructions

Reads `data/washing-instructions.csv` and renders two PDFs: a single tall page
for the phone, and an A4 reference sheet plus detail cards for printing.

## Commands

- `bun run generate` — write both PDFs to `out/`
- `bun run check` — Biome, Prettier, markdownlint, `tsc --noEmit` and the tests, in that order
- `bun run format:md` — Prettier over the Markdown; it owns `*.md` and nothing else
- `bun test test/csv.test.ts` — one file, when iterating

## Gotchas

- **Only Helvetica is embedded**, so glyphs are limited to WinAnsi. `•`, `°`,
  `—`, `–` and `'` are safe; `≈`, `✓`, `→` and curly quotes silently drop out of
  the PDF. Check any new prose in the CSV before committing it.
- **The phone page height is measured, not chosen.** `renderPhone` renders the
  document repeatedly and bisects until it fits on one page. Don't replace it
  with a constant — adding a sentence to the CSV would push a card onto page two.
- **`src/machine.ts` is the authority on the appliances.** Every programme,
  temperature, spin speed and button in the CSV is checked against it, and the
  dial drawings derive their angles from the order of `washer.programs`.
  Retargeting to a different machine means editing that file only.
- **`src/mixing.ts` is the only place that decides what can share a drum.** The
  per-card "wash together with" line, the compatibility matrix and the CLI
  summary all read from it, so a rule change lands in all three at once.

## Conventions

- The CSV is data, not code: adding a pile should never need a code change.
- Care advice is sourced. When you change a wash setting, say in the commit body
  why — the manufacturer, a care label, a test — not just that it seemed better.
- `out/` is generated. Never commit a PDF.
