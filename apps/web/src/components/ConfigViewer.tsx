import {
  type COLUMNS,
  chartToJson,
  colourGroups,
  type Instruction,
  instructionsFromRows,
  type Machine,
  mixTags,
  type Row,
  rowsFromInstructions,
} from "@washy-washy/core/browser";
import { useEffect, useMemo, useState } from "react";
import { readCustomChart, writeCustomChart } from "../lib/customChart";
import { colour } from "../lib/theme";
import { IronDial, ProgramDial } from "./dials";

const SECTION = "mb-6";
const SECTION_HEADING = "mb-2 text-lg font-bold text-ink";
const CARD = "rounded-lg border border-hairline bg-panel p-4";
const FIELD_LABEL = "text-xs font-semibold tracking-wide text-body uppercase";
const CHIP_LIST = "mt-1 flex flex-wrap gap-1";
const CHIP = "rounded border border-line bg-white px-1.5 py-0.5 text-xs text-body";
const TEXT_INPUT =
  "w-full min-w-[8rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-body hover:border-line focus:border-accent focus:bg-white focus:outline-none";
const BUTTON_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const BUTTON_SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const ALERT = "rounded-md border border-no/30 bg-no/5 px-3 py-2 text-sm text-no";

// Matches Sheet.tsx's read-only card exactly (CARD_CLASS/CARD_HEADER_CLASS
// there) — white, not the gray `CARD` panel above, which is this page's own
// machine-summary boxes, a different thing.
const CHART_CARD = "rounded-lg border border-line p-4";
const CHART_CARD_HEADER = "mb-3 flex items-center justify-between gap-2 border-b border-ink pb-1.5";
const SUB_PANEL = "rounded-md border border-hairline bg-panel p-3";
const CHIP_BUTTON = "rounded border px-1.5 py-0.5 text-xs";
const CHIP_BUTTON_ON = "border-accent bg-accent font-bold text-white";
const CHIP_BUTTON_OFF = "border-hairline bg-white text-muted hover:border-line";
const PILL_BUTTON = "rounded px-1.5 py-0.5 text-xs font-bold text-white";

interface Props {
  items: Instruction[];
  machine: Machine;
}

/** Matches Sheet.tsx's `SectionHeading` exactly. */
function SectionHeading({ children }: { children: string }) {
  return (
    <p className="mb-1 text-[0.7rem] font-bold tracking-wide text-muted">
      {children.toUpperCase()}
    </p>
  );
}

function Field({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <p className={FIELD_LABEL}>{label}</p>
      {children}
    </div>
  );
}

function ChipList({ values }: { values: readonly string[] }) {
  return (
    <div className={CHIP_LIST}>
      {values.map((value) => (
        <span key={value} className={CHIP}>
          {value}
        </span>
      ))}
    </div>
  );
}

function WasherCard({ washer }: { washer: Machine["washer"] }) {
  return (
    <div className={CARD}>
      <p className="text-base font-bold text-ink">
        {washer.name} · {washer.capacity}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Programmes">
          <ChipList values={washer.programs} />
        </Field>
        <Field label="Temperatures">
          <ChipList values={washer.temperatures} />
        </Field>
        <Field label="Spin speeds">
          <ChipList values={washer.spins} />
        </Field>
        <Field label="Buttons">
          <ChipList values={washer.options} />
        </Field>
      </div>
    </div>
  );
}

function IronCard({ iron }: { iron: Machine["iron"] }) {
  return (
    <div className={CARD}>
      <p className="text-base font-bold text-ink">{iron.name}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-body uppercase">
              <th className="py-1 pr-3 font-semibold">Setting</th>
              <th className="py-1 pr-3 font-semibold">Dots</th>
              <th className="py-1 pr-3 font-semibold">Detail</th>
              <th className="py-1 font-semibold">Steam</th>
            </tr>
          </thead>
          <tbody>
            {iron.settings.map((setting) => (
              <tr key={setting.key} className="border-b border-hairline last:border-0">
                <td className="py-1 pr-3 font-medium text-ink">{setting.label}</td>
                <td className="py-1 pr-3 text-body">{setting.dots}</td>
                <td className="py-1 pr-3 text-body">{setting.detail}</td>
                <td className="py-1 text-body">{setting.steam ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** "~2:30" -> "02:30" for `<input type="time">`; unparsable/empty -> "". */
function toTimeValue(duration: string): string {
  const match = duration.match(/(\d+):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

/** The reverse of `toTimeValue` — always writes back the "~H:MM" shape every duration in this app already uses. */
function fromTimeValue(value: string): string {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  return `~${Number(hours)}:${minutes}`;
}

function splitPipe(value: string): string[] {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const SELECT_INPUT = `${TEXT_INPUT} bg-white`;

function ProseField({
  value,
  name,
  onChange,
}: {
  value: string;
  name: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      className={`${TEXT_INPUT} resize-none`}
      rows={2}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/**
 * The clickable version of Sheet.tsx's read-only `ChipRow` — same look
 * (selected: filled accent, unselected: outlined), but every chip is a
 * button that sets the field to its own value, single-select.
 */
function ChipSelectRow({
  label,
  name,
  values,
  selected,
  onSelect,
}: {
  label: string;
  name: string;
  values: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mb-1 flex items-start gap-2">
      <span className="w-14 shrink-0 pt-0.5 text-xs text-body">{label}</span>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`chip-${name}-${value}`}
            aria-pressed={value === selected}
            className={`${CHIP_BUTTON} ${value === selected ? CHIP_BUTTON_ON : CHIP_BUTTON_OFF}`}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The `|`-joined multi-value cousin of `ChipSelectRow` — each chip toggles independently. */
function ChipMultiRow({
  label,
  name,
  values,
  selected,
  onToggle,
}: {
  label: string;
  name: string;
  values: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mb-1 flex items-start gap-2">
      <span className="w-14 shrink-0 pt-0.5 text-xs text-body">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`chip-${name}-${value}`}
            aria-pressed={selected.includes(value)}
            className={`${CHIP_BUTTON} ${selected.includes(value) ? CHIP_BUTTON_ON : CHIP_BUTTON_OFF}`}
            onClick={() => onToggle(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The clickable version of Sheet.tsx's `SoftenerBadge` — same pill, toggles on click. */
function PillToggle({
  on,
  onLabel,
  offLabel,
  name,
  onClick,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`toggle-${name}`}
      aria-pressed={on}
      className={PILL_BUTTON}
      style={{ backgroundColor: on ? colour.yes : colour.no }}
      onClick={onClick}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

function TimeField({
  value,
  name,
  onChange,
}: {
  value: string;
  name: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span aria-hidden="true" className="text-body">
        ~
      </span>
      <input
        className={SELECT_INPUT}
        type="time"
        name={name}
        value={toTimeValue(value)}
        onChange={(event) => onChange(fromTimeValue(event.target.value))}
      />
    </div>
  );
}

function EditableSplitField({
  label,
  value,
  name,
  onChange,
}: {
  label: string;
  value: string;
  name: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-2">
      <p className="text-[0.6rem] font-bold tracking-wide text-muted">{label.toUpperCase()}</p>
      <ProseField value={value} name={name} onChange={onChange} />
    </div>
  );
}

/**
 * One card per pile, drawn to look like — and, since this is the same
 * data, double as an editor for — `Sheet.tsx`'s read-only card: the same
 * dial, the same chip rows for the values the machine constrains, the
 * same softener pill. A chip is a button here instead of a `<span>`, and
 * clicking one sets the field to its value; the free-text fields
 * (detergent, notes, …) are the same textarea the previous, plainer
 * version of this page used.
 *
 * The constrained fields (temperature, spin, programme, colour group,
 * iron setting) can't produce an invalid value through this UI at all —
 * the chips only ever offer valid ones. `instructionsFromRows` still
 * validates on Save regardless; it's the single source of truth for
 * what's valid, not duplicated here.
 */
function ChartCards({
  rows,
  machine,
  onChange,
}: {
  rows: Row[];
  machine: Machine;
  onChange: (index: number, key: (typeof COLUMNS)[number], value: string) => void;
}) {
  const { washer, iron } = machine;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="chart-cards">
      {rows.map((row, index) => {
        const set = (key: (typeof COLUMNS)[number], value: string) => onChange(index, key, value);
        const ironing = row.ironing === "yes";
        const position = washer.programs.indexOf(row.program);
        const off = washer.programs[0] ?? "";
        const setting = iron.settings.find((s) => s.key === row.iron_setting);

        return (
          <article
            // biome-ignore lint/suspicious/noArrayIndexKey: a chart row has no id of its own, and clothing_type alone isn't guaranteed unique
            key={`${row.clothing_type}-${index}`}
            className={CHART_CARD}
          >
            <div className={CHART_CARD_HEADER}>
              <input
                className={`${TEXT_INPUT} min-w-0 text-base font-bold text-ink`}
                type="text"
                name="clothing_type"
                aria-label="Pile"
                value={row.clothing_type}
                onChange={(event) => set("clothing_type", event.target.value)}
              />
              <TimeField
                value={row.duration}
                name="duration"
                onChange={(value) => set("duration", value)}
              />
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PillToggle
                on={row.fabric_softener === "yes"}
                onLabel="SOFTENER OK"
                offLabel="NO SOFTENER"
                name="fabric_softener"
                onClick={() => set("fabric_softener", row.fabric_softener === "yes" ? "no" : "yes")}
              />
              <span className="text-xs font-bold text-ink">
                {row.program} {row.temperature === "koud" ? "koud" : `${row.temperature} °C`} ·{" "}
                {row.spin === "0" ? "no spin" : `${row.spin} rpm`}
              </span>
            </div>

            <div className={`flex gap-3 ${SUB_PANEL}`}>
              <div className="w-20 shrink-0 text-center">
                <ProgramDial program={row.program} washer={washer} size={78} />
                <select
                  className="mt-1 w-full rounded border border-transparent bg-transparent px-0 text-center text-xs font-bold text-ink hover:border-line focus:border-accent focus:bg-white focus:outline-none"
                  name="program"
                  aria-label="Programme"
                  value={row.program}
                  onChange={(event) => set("program", event.target.value)}
                >
                  {washer.programs.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
                <p className="text-[0.6rem] text-body">
                  {position} clockwise from {off}
                </p>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <ChipSelectRow
                  label="Temp"
                  name="temperature"
                  values={washer.temperatures}
                  selected={row.temperature}
                  onSelect={(value) => set("temperature", value)}
                />
                <ChipSelectRow
                  label="Spin rpm"
                  name="spin"
                  values={washer.spins}
                  selected={row.spin}
                  onSelect={(value) => set("spin", value)}
                />
                <ChipMultiRow
                  label="Buttons"
                  name="options"
                  values={washer.options}
                  selected={splitPipe(row.options)}
                  onToggle={(value) => {
                    const next = new Set(splitPipe(row.options));
                    if (next.has(value)) next.delete(value);
                    else next.add(value);
                    set("options", [...next].join("|"));
                  }}
                />
              </div>
            </div>

            <EditableSplitField
              label="Detergent"
              value={row.detergent}
              name="detergent"
              onChange={(value) => set("detergent", value)}
            />

            <div className="mt-3">
              <SectionHeading>Iron</SectionHeading>
              <div className={`flex items-center gap-3 ${SUB_PANEL}`}>
                <IronDial
                  setting={row.iron_setting}
                  settings={iron.settings}
                  off={!ironing}
                  size={62}
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PillToggle
                      on={ironing}
                      onLabel="IRONED"
                      offLabel="DO NOT IRON"
                      name="ironing"
                      onClick={() => {
                        set("ironing", ironing ? "no" : "yes");
                        if (!ironing && row.iron_setting === "") {
                          set("iron_setting", iron.settings[0]?.key ?? "");
                        } else if (ironing) {
                          set("iron_setting", "");
                        }
                      }}
                    />
                    {ironing && setting && (
                      <span className="text-xs font-bold text-ink">
                        {setting.label} — {setting.detail}
                      </span>
                    )}
                  </div>
                  {ironing && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {iron.settings.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          data-testid={`chip-iron_setting-${s.key}`}
                          aria-pressed={s.key === row.iron_setting}
                          className={`${CHIP_BUTTON} ${
                            s.key === row.iron_setting ? CHIP_BUTTON_ON : CHIP_BUTTON_OFF
                          }`}
                          onClick={() => set("iron_setting", s.key)}
                        >
                          {s.dots || s.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <ProseField
                    value={row.ironing_notes}
                    name="ironing_notes"
                    onChange={(value) => set("ironing_notes", value)}
                  />
                </div>
              </div>
            </div>

            <EditableSplitField
              label="Drying"
              value={row.drying}
              name="drying"
              onChange={(value) => set("drying", value)}
            />

            <div className="mt-2">
              <p className="text-[0.6rem] font-bold tracking-wide text-muted">COLOUR GROUP</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {colourGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    data-testid={`chip-colour_group-${group}`}
                    aria-pressed={group === row.colour_group}
                    className={`${CHIP_BUTTON} ${
                      group === row.colour_group ? CHIP_BUTTON_ON : CHIP_BUTTON_OFF
                    }`}
                    onClick={() => set("colour_group", group)}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2">
              <p className="text-[0.6rem] font-bold tracking-wide text-muted">MIX TAGS</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {mixTags.map((tag) => {
                  const selected = splitPipe(row.mix_tags);
                  const on = selected.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      data-testid={`chip-mix_tags-${tag}`}
                      aria-pressed={on}
                      className={`${CHIP_BUTTON} ${on ? CHIP_BUTTON_ON : CHIP_BUTTON_OFF}`}
                      onClick={() => {
                        const next = new Set(selected);
                        if (next.has(tag)) next.delete(tag);
                        else next.add(tag);
                        set("mix_tags", [...next].join("|"));
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <EditableSplitField
              label="Notes"
              value={row.notes}
              name="notes"
              onChange={(value) => set("notes", value)}
            />
          </article>
        );
      })}
    </div>
  );
}

/**
 * A troubleshooting view — and, since #74, an editor: the whole loaded
 * config — machine and chart — in one structured place, rather than
 * reconstructed by eye from the rendered cards.
 *
 * Only the chart is editable. Editing the machine itself is out of scope
 * here (#83) — nothing in the site supports uploading or editing a machine
 * yet, so it's always the one this page was built with.
 *
 * Reads the same uploaded-chart restoration `SheetViewer` does
 * (`customChart.ts`), so a chart uploaded (or edited, here) on either page
 * shows up on both.
 */
export default function ConfigViewer({ items: bundledItems, machine }: Props) {
  const [customInstructions, setCustomInstructions] = useState<Instruction[] | null>(null);
  const [draftRows, setDraftRows] = useState<Row[]>(() => rowsFromInstructions(bundledItems));
  const [saveError, setSaveError] = useState<string | null>(null);
  // Same hydration marker SheetViewer exposes, and for the same reason: the
  // E2E suite needs a way to know React has attached before it interacts.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restored = readCustomChart(machine);
    setCustomInstructions(restored);
    setDraftRows(rowsFromInstructions(restored ?? bundledItems));
    setHydrated(true);
    // machine and bundledItems only, not draftRows/customInstructions:
    // this restores once, the same as SheetViewer's mount effect — running
    // it again on every render would stomp an in-progress edit.
  }, [machine, bundledItems]);

  const activeItems = customInstructions ?? bundledItems;
  const downloadHref = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(chartToJson(activeItems))}`,
    [activeItems],
  );

  function handleCellChange(index: number, key: (typeof COLUMNS)[number], value: string) {
    setDraftRows((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function handleSave() {
    try {
      const parsed = instructionsFromRows(draftRows, machine);
      setCustomInstructions(parsed);
      writeCustomChart(parsed);
      setSaveError(null);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  return (
    <div data-hydrated={hydrated}>
      <p className="mb-6 text-sm text-body">
        {customInstructions
          ? "Showing your uploaded chart."
          : "Showing the bundled example chart. It's a generic laundry chart, not your own."}
      </p>

      <section className={SECTION}>
        <h2 className={SECTION_HEADING}>Machine</h2>
        <div className="flex flex-col gap-4">
          <WasherCard washer={machine.washer} />
          <IronCard iron={machine.iron} />
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_HEADING}>Chart — every pile</h2>
        <p className="mb-3 text-xs text-body">
          Every field is editable. Save checks each row against the machine above, the same way an
          upload does — an unknown value is called out by row and column, not silently accepted.
        </p>
        <ChartCards rows={draftRows} machine={machine} onChange={handleCellChange} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className={BUTTON_PRIMARY} onClick={handleSave}>
            Save changes
          </button>
          <a className={BUTTON_SECONDARY} href={downloadHref} download="washing-instructions.json">
            Download this chart as JSON
          </a>
        </div>
        {saveError && (
          <p className={`${ALERT} mt-3`} role="alert">
            Could not save: {saveError}
          </p>
        )}
      </section>
    </div>
  );
}
