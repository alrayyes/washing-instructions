import {
  type COLUMNS,
  chartToJson,
  type Instruction,
  instructionsFromRows,
  type Machine,
  type Row,
  rowsFromInstructions,
} from "@washy-washy/core/browser";
import { useEffect, useMemo, useState } from "react";
import { readCustomChart, writeCustomChart } from "../lib/customChart";

const SECTION = "mb-6";
const SECTION_HEADING = "mb-2 text-lg font-bold text-ink";
const CARD = "rounded-lg border border-hairline bg-panel p-4";
const FIELD_LABEL = "text-xs font-semibold tracking-wide text-body uppercase";
const CHIP_LIST = "mt-1 flex flex-wrap gap-1";
const CHIP = "rounded border border-line bg-white px-1.5 py-0.5 text-xs text-body";
const CELL_INPUT =
  "w-full min-w-[8rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-body hover:border-line focus:border-accent focus:bg-white focus:outline-none";
const BUTTON_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const BUTTON_SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const ALERT = "rounded-md border border-no/30 bg-no/5 px-3 py-2 text-sm text-no";

interface Props {
  items: Instruction[];
  machine: Machine;
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

// clothing_type is the card's own title field, drawn separately. A prose
// field spans both grid columns and gets a wrapping textarea instead of a
// single-line input — detergent notes and care instructions run to a full
// sentence, and truncating them silently is worse than the extra height.
const CHART_FIELDS: { key: (typeof COLUMNS)[number]; label: string; prose?: boolean }[] = [
  { key: "detergent", label: "Detergent", prose: true },
  { key: "fabric_softener", label: "Softener" },
  { key: "temperature", label: "Temp" },
  { key: "spin", label: "Spin" },
  { key: "duration", label: "Duration" },
  { key: "program", label: "Programme" },
  { key: "options", label: "Buttons" },
  { key: "ironing", label: "Ironing" },
  { key: "iron_setting", label: "Iron setting" },
  { key: "ironing_notes", label: "Iron notes", prose: true },
  { key: "drying", label: "Drying", prose: true },
  { key: "colour_group", label: "Colour group" },
  { key: "mix_tags", label: "Mix tags" },
  { key: "notes", label: "Notes", prose: true },
];

/**
 * One card per pile, matching `Sheet.tsx`'s read-only cards — fifteen
 * fields across as table columns needed either a fixed-width grid
 * nobody's screen was wide enough for, or a fully custom layout with no
 * precedent elsewhere in the app. Stacking fields inside a card already
 * has one: this is the same shape the main page's cards use, editable.
 *
 * Every field is a plain text input over the exact same string shape
 * `Row`/the CSV/the JSON upload already use — a select per constrained
 * field (temperature, programme, …) would read nicer, but this reuses
 * `instructionsFromRows`'s validation exactly as upload does, with no
 * second parallel implementation deciding what's a valid value.
 */
function ChartCards({
  rows,
  onChange,
}: {
  rows: Row[];
  onChange: (index: number, key: (typeof COLUMNS)[number], value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="chart-cards">
      {rows.map((row, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a chart row has no id of its own, and clothing_type alone isn't guaranteed unique
          key={`${row.clothing_type}-${index}`}
          className={CARD}
        >
          <input
            className={`${CELL_INPUT} text-base font-bold text-ink`}
            type="text"
            name="clothing_type"
            aria-label="Pile"
            value={row.clothing_type}
            onChange={(event) => onChange(index, "clothing_type", event.target.value)}
          />
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            {CHART_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} span={field.prose}>
                {field.prose ? (
                  <textarea
                    className={`${CELL_INPUT} resize-none`}
                    rows={2}
                    name={field.key}
                    value={row[field.key]}
                    onChange={(event) => onChange(index, field.key, event.target.value)}
                  />
                ) : (
                  <input
                    className={CELL_INPUT}
                    type="text"
                    name={field.key}
                    value={row[field.key]}
                    onChange={(event) => onChange(index, field.key, event.target.value)}
                  />
                )}
              </Field>
            ))}
          </div>
        </div>
      ))}
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
        <ChartCards rows={draftRows} onChange={handleCellChange} />
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
