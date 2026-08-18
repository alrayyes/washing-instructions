<!--
Maintainer note (stripped before this file enters context).
Keep this short and only about what the code cannot say for itself. The README
is where the prose explanation lives; this file is the set of traps.
-->

# washy-washy

Reads `data/washing-instructions.csv` and renders six PDFs: a single tall page
for the phone and an A4 reference sheet plus detail cards for printing, each in
three cuts — everything, washing only, ironing only. That file is gitignored —
one household's laundry is nobody else's business — so the committed chart is
`data/washing-instructions.csv.dist` and the CLI falls back to it. Tests and CI
read the `.dist`; never point them at the other one.

## Commands

- `bun run generate` — write all six PDFs to `out/`
- `bun run examples` — redraw the six PDFs under `docs/` that the README links,
  from the `.dist` chart and the `.dist` machine
- `docker build -t washy-washy . && docker run --rm -v "$PWD/out:/out" washy-washy`
  — the same thing without Bun on the host. CI builds and runs it too, so a
  `Dockerfile` that lints and does not work fails there; releases push it to GHCR
- `bun run schema` — regenerate `data/washing-instructions.schema.json`; run it after
  touching `packages/core/src/machine.ts` or a test fails on the stale copy
- `bun run check` — every linter, `tsc --noEmit` and the tests, in that order
- `bun run lint:data` — check the dummy chart against the generated schema
- `bun run lint:machine` — check the dummy machine against `data/machine.schema.json`
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
  redraws every card. Fascia labels are never translated — `parseMachine` in
  `packages/core/src/machine.ts` only validates; `loadMachine` in
  `src/machine.ts` is the Bun-only file-reading adapter around it.
- **Anything that writes a file for the repo must load `DIST_MACHINE`, not
  `DEFAULT_MACHINE`.** The latter prefers your own appliances, so the schema
  generator and the tests would otherwise bake in whatever machine the person
  running them happens to own.
- **`packages/core/src/mixing.ts` is the only place that decides what can share
  a drum.** The per-card "wash together with" line, the compatibility matrix and
  the CLI summary all read from it, so a rule change lands in all three at once.
  It also owns how each sheet cuts the chart into cards: `cardGroups` for the
  full one, `washGroups` with the thermostat dropped, `ironGroups` with nothing
  else kept.
- **`packages/core` is a Bun workspace with no Bun/Node-only APIs in its public
  surface** — chart parsing, mixing rules, machine/schema validation. Both the
  CLI (`src/`) and, eventually, `apps/web` import it as `@washy-washy/core`.
  File I/O (`loadMachine`, reading the CSV) stays in each consumer; core only
  ever takes file contents as a string or a parsed value.
- **A sheet is defined by what it leaves out**, so `test/generate.test.ts`
  inflates the content streams and reads the words back. Adding an iron word to
  the washing sheet fails there, not in review.

## Conventions

- The CSV is data, not code: adding a pile should never need a code change.
- Care advice is sourced. When you change a wash setting, say in the commit body
  why — the manufacturer, a care label, a test — not just that it seemed better.
- `out/` is generated. Never commit a PDF from it. The two under `docs/` are
  the exception — the README links them — and they are written by
  `bun run examples`, which names both `.dist` files, so your own appliances
  cannot get into them. A test in `test/generate.test.ts` fails while they are
  stale.
