<!--
Maintainer note (not rendered): only the pipeline badge is here because it is
the only thing wired up. Add a release badge in the same commit that adds
semantic-release, and a licence badge when a licence is chosen.
-->

[![pipeline status](https://gitlab.higherlearning.eu/alrayyes/washing-instructions/badges/main/pipeline.svg)](https://gitlab.higherlearning.eu/alrayyes/washing-instructions/-/commits/main)

# Washing instructions

Nobody remembers whether the towels go in at 40 or 60, which button stops the
black t-shirts coming out streaky, or where on the dial "Fijn/Zijde" actually
is. This turns a CSV of laundry piles into two PDFs that answer all of it:

- **`out/washing-instructions-phone.pdf`** — one tall, narrow page you scroll
  through on your phone while standing in front of the machine.
- **`out/washing-instructions-print.pdf`** — an A4 reference sheet to pin next
  to the machine, followed by a full-page card for each pile.

Both are drawn for _specific appliances_: a Bosch Serie 6 VarioPerfect and a
Tefal Easygliss Plus. Every card shows the programme dial with the pointer
where you need to turn it, the temperature and spin values picked out of the
row the display steps through, which of the four option buttons to press, and
the iron's thermostat ring with its steam zone marked. You are not translating
generic advice onto your machine; the drawing _is_ your machine.

It also answers the question that actually causes arguments: what can go in
together. Piles are grouped into loads, each card names its bedfellows, and the
printed sheet carries a full compatibility matrix with the reason for every no.

## Requirements

- **[Bun](https://bun.sh) 1.3 or newer** — runtime, package manager and test
  runner. Nothing else is needed; there is no build step and no browser.
- Linux, macOS or WSL. Bun's Windows support should work but is untested here.
- Optional, for the git hooks: nothing extra — `lefthook` and the linters
  install as dev dependencies. Two of them fetch things over the network on
  installation rather than shipping in the package: Vale pulls its binary, and
  `bun run prose:sync` pulls the style packages it lints against.

No network access is needed at run time, and no fonts are downloaded: the PDFs
use the Helvetica that every PDF reader already has.

## Installation

```sh
bun install --frozen-lockfile
bunx lefthook install   # only if you intend to commit
bun run prose:sync      # only if you intend to commit
```

## Usage

Generate both PDFs from the bundled data:

```sh
bun run generate
```

```text
Read 15 piles from /home/you/washing-instructions/data/washing-instructions.csv
  out/washing-instructions-phone.pdf  one page, 6053 pt tall (10 layout passes)
  out/washing-instructions-print.pdf

Piles that can share a drum:
  White + White Socks
  Coloured + Coloured Socks
  Dark + Black Socks + Denim
  Merino Wool + Cashmere Blend

Set up identically on both appliances, so sharing one card:
  Merino Wool + Cashmere Blend
```

Point it at your own file, or somewhere else for the output:

```sh
bun run generate my-laundry.csv --out ~/Documents
```

The output filenames follow the input, so `my-laundry.csv` gives you
`my-laundry-phone.pdf` and `my-laundry-print.pdf`.

## The CSV

One row per pile, in `data/washing-instructions.csv`. Adding a pile never needs
a code change.

| Column            | What goes in it                                                      |
| ----------------- | -------------------------------------------------------------------- |
| `clothing_type`   | What you call the pile — this is the card heading                    |
| `detergent`       | Which detergent and how much                                         |
| `fabric_softener` | `yes` or `no`                                                        |
| `temperature`     | `koud`, `20`, `30`, `40`, `60` or `90`                               |
| `spin`            | `0`, `400`, `600`, `800`, `1200` or `1400`                           |
| `duration`        | Roughly how long it runs, for planning                               |
| `program`         | A dial position, spelled exactly as on the fascia                    |
| `options`         | Option buttons, pipe-separated; empty for none                       |
| `ironing`         | Prose: how to iron it                                                |
| `iron_setting`    | `none`, `min`, `1`, `2`, `3` or `max`                                |
| `drying`          | Prose: how to dry it                                                 |
| `colour_group`    | `white`, `colour`, `dark`, `sport` or `any`                          |
| `mix_tags`        | Pipe-separated: `lint-shedder`, `lint-magnet`, `dye-bleeder`, `solo` |
| `notes`           | Anything else worth knowing                                          |

Every machine-facing value is checked against what the appliances can actually
be set to, so a typo fails the run rather than producing a PDF that tells you
to turn the dial somewhere it does not go:

```text
row 8, column "program": "Cottons" is not one of Uit, Katoen, Katoen + Voorwas, ...
```

### How "can these wash together" is decided

Two piles may share a drum only when all of these hold. The first one that
fails is the reason shown in the matrix.

1. Neither is tagged `solo`. Raw selvedge and trainers go in alone, full stop.
2. If either is a `lint-shedder`, the other must be too — terry sheds over
   everything, so towels only ever go with towels.
3. Their `colour_group` matches (`any` matches everything).
4. Programme, temperature, spin _and_ the set of option buttons are identical.

Rule 4 is why White and White Socks share a load, but White Towels do not: the
towels want 1400 rpm and an extra rinse, which is a different wash even though
the temperature agrees.

### One card for several piles

Sharing a load still gets you a card each. Dark, Black Socks and Denim wash
identically but want a two-dot iron, no iron and a three-dot iron respectively,
so the iron drawing alone justifies three cards.

Piles merge onto one card when everything you physically _set_ agrees:
programme, temperature, spin, option buttons, whether softener goes in, and
where the iron's thermostat points. Every dial drawing would be the same
drawing, so one card carries all the names — Merino Wool and Cashmere Blend, for
instance.

Prose is deliberately not part of that key. Those two want different detergent
and different drying, and the card lists both lines against the pile they belong
to rather than letting one stand in for the other.

### Retargeting it to different appliances

`src/machine.ts` holds both appliances — the dial labels in physical order, the
temperatures and spin speeds the display offers, the option buttons, and the
iron's thermostat positions. The dial drawings take their angles from the order
of that list, and the CSV validator takes its allowed values from it. Change
that one file and everything follows.

## Development

```sh
bun run check              # every linter, tsc --noEmit, then the tests
bun run format:md          # let Prettier lay the Markdown out
bun run lint:prose:advice  # Vale's style advice, warnings and all
bun test                   # just the tests
```

Two formatters, split by file type and never overlapping. Biome owns everything
it supports; Markdown is the one thing it does not format, so that goes to
Prettier and `.prettierignore` names the file types Prettier must keep its hands
off. Prettier runs before markdownlint, never after — Prettier decides the
layout and markdownlint judges what came out, so the rules the two would argue
over (list markers, list indentation, emphasis characters) are switched off on
markdownlint's side.

### The prose is linted too

The README is the whole manual for this thing, so it gets checked the way the
code does. markdownlint only judges structure — headings, list markers, blank
lines — and happily passes a document that says `an unique setting`. Two more
tiers sit over it, and they are deliberately answered differently. The specimen
in the last sentence is in backticks because otherwise the mechanics tier finds
it, which is the point:

- **Mechanics** — [LTeX+](https://github.com/ltex-plus/ltex-ls-plus) wrapping
  LanguageTool: grammar, spelling, punctuation, the phonetic article. These have
  a right answer, so the `ltex` job blocks the pipeline. It reports findings
  with exit code **3**, not 1, which is worth knowing before you write anything
  that tests for a number. It stays out of the git hooks because it is a 300 MB
  download carrying its own Java runtime; run the same engine in your editor
  over LSP and CI is only the fallback.
- **Style** — [Vale](https://vale.sh) with the Google and proselint packages:
  house voice, wordiness, clichés. This is advice, so the `vale` job is allowed
  to fail and shows warnings without blocking. It is fast, so the commit hook
  runs it too, but only at error level.

`.vale.ini` and `.ltex.json` each say why a rule was turned off. The short
version: spelling belongs to LTeX alone, because two tools underlining the same
word is how you learn to ignore both, and the em dashes and missing serial
commas here are house style rather than mistakes. Product names and Dutch dial
labels go in the dictionaries — `styles/config/vocabularies/House/accept.txt`
and the `dictionary` block in `.ltex.json` — never in an ignore comment buried
in the prose.

### Tests

Tests run at two levels, and skip the ones that cannot fail here. There is no
database, service or deployed system to integrate with, so there is no
container or end-to-end layer:

- **Acceptance** (`test/generate.test.ts`) — runs the CLI the way you would and
  checks the PDFs that come out: the phone sheet is a single continuous page of
  the right width, the printed one is A4 with the reference sheet first, and
  the shared-load summary says what it should.
- **Unit** (`test/csv.test.ts`, `test/mixing.test.ts`) — the validation errors
  and the mixing rules, including that the rules are symmetric and that a group
  only forms when every member is compatible with every other.

### The git hooks

`lefthook.yml` runs the same commands CI does, so the two cannot drift. On
commit, Biome, Prettier and markdownlint fix what they can over the staged files
and restage it, Vale checks the prose for errors, and commitlint reads the
message. On push, every linter runs again in check mode over the whole tree,
followed by the typecheck and the tests — nothing at that point writes, so the
commit you push is the one you reviewed.

### Gotchas

- Only Helvetica is embedded, so the PDFs can only render WinAnsi characters.
  `•`, `°`, `—`, `–` are fine; `≈`, `✓` and curly quotes vanish silently. Watch
  this when editing prose in the CSV.
- The phone page's height is _measured_, not chosen: `renderPhone` renders the
  document repeatedly and bisects until it fits on one page with under 8 pt to
  spare. That is why the run reports a number of layout passes.

## Contributing

Branch, commit under [Conventional Commits](https://www.conventionalcommits.org/),
open a pull request. Run `bun run check` first.

Care advice is sourced, not guessed. If you change a wash setting, say in the
commit body what the source was — a manufacturer's guidance, a care label, or
something you tested — rather than that it seemed better.

## Where the current advice comes from

The bundled data was assembled from manufacturer and trade guidance:
[Which? on wash temperatures](https://www.which.co.uk/reviews/washing-machines/article/washing-machine-temperature-guide-aLiyf2p96y4d),
[Icebreaker on merino](https://eu.icebreaker.com/en-gb/blogs/journal/how-to-wash-merino-wool-jumper),
[Hiut Denim](https://hiutdenim.co.uk/pages/washing-instructions) and
[Blue Owl Workshop](https://www.blueowl.us/blogs/news/how-to-wash-your-raw-denim-selvedge-jeans)
on raw selvedge,
[Peacock Alley on towels](https://www.peacockalley.com/pages/towel-care-guide),
[Tefal's Easygliss Plus manual](https://www.tefal.com/instructions-for-use/csp/1830007452)
for the thermostat markings, and
[Dirty Labs](https://dirtylabs.com/blogs/the-dirt/how-to-wash-your-activewear)
on synthetic activewear.

## Licence

Not yet chosen — add one before this goes anywhere public.
