<!--
Maintainer note (stripped before this file enters context).
Keep this short and only about what the code cannot say for itself. The README
is where the prose explanation lives; this file is the set of traps.
-->

# washy-washy

Reads `data/washy-washy.json` — appliances under `machine`, one row per pile
under `chart` — and renders six PDFs: a single tall page for the phone and an
A4 reference sheet plus detail cards for printing, each in three cuts —
everything, washing only, ironing only. That file is gitignored — one
household's laundry is nobody else's business — so the committed config is
`data/washy-washy.json.dist` and the CLI falls back to it. Tests and CI read
the `.dist`; never point them at the other one.

## Commands

- `bun run generate` — write all six PDFs to `out/`
- `bun run new-config [path]` — scaffold a fresh config (placeholder machine,
  one placeholder pile); default path `data/washy-washy.json`. Refuses to
  overwrite an existing file
- `bun run validate-config [path]` — same validation `generate` does, without
  drawing anything; default path `data/washy-washy.json` (so a fresh clone
  with no file of your own validates the `.dist`)
- `bun run migrate-config` — one-off conversion from the old
  `data/machine.json` + `data/washing-instructions.csv` pair to
  `data/washy-washy.json`
- `bun run examples` — redraw the six PDFs under `docs/` that the README links,
  from the `.dist` config
- `docker build -t washy-washy . && docker run --rm -v "$PWD/out:/out" washy-washy`
  — the same thing without Bun on the host. CI builds and runs it too, so a
  `Dockerfile` that lints and does not work fails there; releases push it to GHCR
- `bun run check` — every linter, `tsc --noEmit` and the tests, in that order
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
- **The appliances are data.** They're the `machine` key of `data/washy-washy.json`,
  and every programme, temperature, spin speed and button in the `chart` key
  is checked against them. The dial angles come from the order of
  `washer.programs`, so a reordered list redraws every card. Fascia labels are
  never translated — `parseMachine`/`parseConfig` in
  `packages/core/src/machine.ts`/`config.ts` only validate; `loadConfig` in
  `src/config.ts` is the Bun-only file-reading adapter around them.
- **`data/machine.json.dist` outlived the old two-file config setup on
  purpose.** It's the shared `DIST_MACHINE` fixture several tests load for a
  realistic `Machine` — unrelated to the CLI's own input, which is
  `data/washy-washy.json`. Don't delete it as a leftover; check what imports
  `DIST_MACHINE` first. There's no schema or validator for it any more —
  it's a fixture, not a file anything else generates or checks.
- **This repo doesn't generate its own JSON Schema for the combined config.**
  `@washy-washy/core` does — `configToJson` leads its output with a
  `$schema` key pointing at the published package's schema on jsDelivr
  (`CONFIG_SCHEMA_URL` in `packages/core/src/config.ts`, mirrored from
  core's own repo). Duplicating schema generation here would split logic
  core already owns across two repos. `bun run validate-config` uses
  `parseConfig` for real semantic validation instead of walking that schema
  — the schema is for editor autocomplete, not a second source of truth.
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
  surface** — chart parsing, mixing rules, machine/schema/config validation.
  This CLI imports it as `@washy-washy/core`, workspace-linked for now;
  [washy-washy-web](https://github.com/alrayyes/washy-washy-web) imports the
  published npm package of the same name. File I/O (`loadConfig`,
  `loadMachine`, reading the CSV) stays in each consumer; core only ever
  takes file contents as a string or a parsed value.
- **A sheet is defined by what it leaves out**, so `test/generate.test.ts`
  inflates the content streams and reads the words back. Adding an iron word to
  the washing sheet fails there, not in review.
- **`biome.json` is strict JSON, not JSONC** — despite `tsconfig.json` and
  `.releaserc.json` tolerating comments elsewhere in this repo, a `//` in
  `biome.json` fails to parse and silently falls back to defaults, which then
  reformats every file in the repo (tabs instead of the configured spaces).
  Explain a rule choice in this file instead of inline there.

## Conventions

- The config is data, not code: adding a pile should never need a code change.
- Care advice is sourced. When you change a wash setting, say in the commit body
  why — the manufacturer, a care label, a test — not just that it seemed better.
- `out/` is generated. Never commit a PDF from it. The six under `docs/` are
  the exception — the README links them — and they are written by
  `bun run examples`, which names the `.dist` config, so your own appliances
  cannot get into them. A test in `test/generate.test.ts` fails while they are
  stale.
