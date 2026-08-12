<!--
Maintainer note (stripped before this file enters context).
Keep this short and only about what the code cannot say for itself. The README
is where the prose explanation lives; this file is the set of traps.
-->

# washing-instructions

Reads `data/washing-instructions.csv` and renders two PDFs: a single tall page
for the phone, and an A4 reference sheet plus detail cards for printing. That
file is gitignored — one household's laundry is nobody else's business — so the
committed chart is `data/washing-instructions.csv.dist` and the CLI falls back
to it. Tests and CI read the `.dist`; never point them at the other one.

## Commands

- `bun run generate` — write both PDFs to `out/`
- `docker build -t washing-instructions . && docker run --rm -v "$PWD/out:/out" washing-instructions`
  — the same thing without Bun on the host. CI builds and runs it too, so a
  `Dockerfile` that lints and does not work fails there; releases push it to GHCR
- `bun run schema` — regenerate `data/washing-instructions.schema.json`; run it after
  touching `src/machine.ts` or a test fails on the stale copy
- `bun run check` — every linter, `tsc --noEmit` and the tests, in that order
- `bun run lint:data` — check the dummy chart against the generated schema
- `bun run format` — Prettier over the Markdown and YAML; it owns those and nothing else
- `bun run prose:sync` — fetch Vale's style packages; needed once before `check` works
- `bun test test/csv.test.ts` — one file, when iterating

## Gotchas

- **Only Helvetica is embedded**, so glyphs are limited to WinAnsi. `•`, `°`,
  `—`, `–` and `'` are safe; `≈`, `✓`, `→` and curly quotes silently drop out of
  the PDF. Check any new prose in the CSV before committing it.
- **The phone page height is measured, not chosen.** `renderPhone` renders the
  document repeatedly and bisects until it fits on one page. Don't replace it
  with a constant — adding a sentence to the CSV would push a card onto page two.
- **The appliances are data.** `data/machine.json.dist` is the committed example
  and `data/machine.json` is yours, gitignored. Every programme, temperature,
  spin speed and button in the CSV is checked against the loaded machine, and
  the dial angles come from the order of `washer.programs`, so a reordered list
  redraws every card. Fascia labels are never translated — `src/machine.ts` only
  loads and validates.
- **Anything that writes a file for the repo must load `DIST_MACHINE`, not
  `DEFAULT_MACHINE`.** The latter prefers your own appliances, so the schema
  generator and the tests would otherwise bake in whatever machine the person
  running them happens to own.
- **`src/mixing.ts` is the only place that decides what can share a drum.** The
  per-card "wash together with" line, the compatibility matrix and the CLI
  summary all read from it, so a rule change lands in all three at once.

## Conventions

- The CSV is data, not code: adding a pile should never need a code change.
- Care advice is sourced. When you change a wash setting, say in the commit body
  why — the manufacturer, a care label, a test — not just that it seemed better.
- `out/` is generated. Never commit a PDF.
