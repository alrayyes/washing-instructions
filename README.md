<!--
Maintainer note (not rendered): the badge row is deliberately absent. There is
no pipeline, forge release or coverage report to point one at yet, and a badge
reading "unknown" is worse than no badge. Add the row in the same commit that
adds CI.
-->
# Washing instructions

Nobody remembers whether the towels go in at 40 or 60, which button stops the
black t-shirts coming out streaky, or where on the dial "Fijn/Zijde" actually
is. This turns a CSV of laundry piles into two PDFs that answer all of it:

- **`out/washing-instructions-phone.pdf`** — one tall, narrow page you scroll
  through on your phone while standing in front of the machine.
- **`out/washing-instructions-print.pdf`** — an A4 reference sheet to pin next
  to the machine, followed by a full-page card for each pile.

Both are drawn for *specific appliances*: a Bosch Serie 6 VarioPerfect and a
Tefal Easygliss Plus. Every card shows the programme dial with the pointer
where you need to turn it, the temperature and spin values picked out of the
row the display steps through, which of the four option buttons to press, and
the iron's thermostat ring with its steam zone marked. You are not translating
generic advice onto your machine; the drawing *is* your machine.

It also answers the question that actually causes arguments: what can go in
together. Piles are grouped into loads, each card names its bedfellows, and the
printed sheet carries a full compatibility matrix with the reason for every no.

## Requirements

- **[Bun](https://bun.sh) 1.3 or newer** — runtime, package manager and test
  runner. Nothing else is needed; there is no build step and no browser.
- Linux, macOS or WSL. Bun's Windows support should work but is untested here.
- Optional, for the git hooks: nothing extra — `lefthook` and the linters
  install as dev dependencies.

No network access is needed at run time, and no fonts are downloaded: the PDFs
use the Helvetica that every PDF reader already has.

## Installation

```sh
bun install --frozen-lockfile
bunx lefthook install   # only if you intend to commit
```

## Usage

Generate both PDFs from the bundled data:

```sh
bun run generate
```

```text
Read 16 piles from /home/you/washing-instructions/data/washing-instructions.csv
  out/washing-instructions-phone.pdf  one page, 6265 pt tall (10 layout passes)
  out/washing-instructions-print.pdf

Piles that can share a drum:
  White + White Socks
  Coloured + Coloured Socks
  Dark + Black Socks + Denim
  Merino Wool + Cashmere Blend
  Uniqlo Gym Clothes (AIRism) + Uniqlo HEATTECH

Identical in every attribute, so sharing one card:
  Uniqlo Gym Clothes (AIRism) + Uniqlo HEATTECH
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

| Column | What goes in it |
| --- | --- |
| `clothing_type` | What you call the pile — this is the card heading |
| `detergent` | Which detergent and how much |
| `fabric_softener` | `yes` or `no` |
| `temperature` | `koud`, `20`, `30`, `40`, `60` or `90` |
| `spin` | `0`, `400`, `600`, `800`, `1200` or `1400` |
| `duration` | Roughly how long it runs, for planning |
| `program` | A dial position, spelled exactly as on the fascia |
| `options` | Option buttons, pipe-separated; empty for none |
| `ironing` | Prose: how to iron it |
| `iron_setting` | `none`, `min`, `1`, `2`, `3` or `max` |
| `drying` | Prose: how to dry it |
| `colour_group` | `white`, `colour`, `dark`, `sport` or `any` |
| `mix_tags` | Pipe-separated: `lint-shedder`, `lint-magnet`, `dye-bleeder`, `solo` |
| `notes` | Anything else worth knowing |

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
4. Programme, temperature, spin *and* the set of option buttons are identical.

Rule 4 is why White and White Socks share a load but White Towels do not: the
towels want 1400 rpm and an extra rinse, which is a different wash even though
the temperature agrees.

### One card for two piles

Sharing a load still gets you a card each, because the ironing and drying
usually differ — Dark, Black Socks and Denim wash identically but want a
two-dot iron, no iron and a three-dot iron respectively.

When two piles match on *every* attribute, though — detergent, softener,
temperature, spin, programme, buttons, ironing, drying, tags, notes — a card
each would be the same card twice. Those are merged into one card listing both
names, as AIRism and HEATTECH are.

### Retargeting it to different appliances

`src/machine.ts` holds both appliances — the dial labels in physical order, the
temperatures and spin speeds the display offers, the option buttons, and the
iron's thermostat positions. The dial drawings take their angles from the order
of that list, and the CSV validator takes its allowed values from it. Change
that one file and everything follows.

## Development

```sh
bun run check   # biome, markdownlint, tsc --noEmit, then the tests
bun test        # just the tests
```

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

The git hooks (`lefthook.yml`) run the same commands: Biome and markdownlint on
commit, commitlint on the message, typecheck and tests on push.

### Gotchas

- Only Helvetica is embedded, so the PDFs can only render WinAnsi characters.
  `•`, `°`, `—`, `–` are fine; `≈`, `✓` and curly quotes vanish silently. Watch
  this when editing prose in the CSV.
- The phone page's height is *measured*, not chosen: `renderPhone` renders the
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
