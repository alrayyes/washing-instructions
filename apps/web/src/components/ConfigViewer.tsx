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
const CHECKBOX_INPUT = "size-4 accent-accent";
const CHECKBOX_ROW = "flex items-center gap-1.5 text-sm text-body";

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

function BooleanField({
  checked,
  name,
  onChange,
}: {
  checked: boolean;
  name: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={CHECKBOX_ROW}>
      <input
        className={CHECKBOX_INPUT}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {checked ? "Yes" : "No"}
    </label>
  );
}

function SelectField({
  value,
  name,
  options,
  disabled,
  onChange,
}: {
  value: string;
  name: string;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className={SELECT_INPUT}
      name={name}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {!disabled && value === "" && <option value="" />}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ChecklistField({
  value,
  name,
  options,
  onChange,
}: {
  value: string;
  name: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const selected = new Set(splitPipe(value));
  return (
    <div className="flex flex-col gap-1">
      {options.map((option) => (
        <label key={option} className={CHECKBOX_ROW}>
          <input
            className={CHECKBOX_INPUT}
            type="checkbox"
            name={name}
            value={option}
            checked={selected.has(option)}
            onChange={(event) => {
              const next = new Set(selected);
              if (event.target.checked) next.add(option);
              else next.delete(option);
              onChange([...next].join("|"));
            }}
          />
          {option}
        </label>
      ))}
    </div>
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

/**
 * One card per pile, matching `Sheet.tsx`'s read-only cards — fifteen
 * fields across as table columns needed either a fixed-width grid
 * nobody's screen was wide enough for, or a fully custom layout with no
 * precedent elsewhere in the app. Stacking fields inside a card already
 * has one: this is the same shape the main page's cards use, editable.
 *
 * A widget per field's actual shape — checkbox for a yes/no, select for a
 * value the machine constrains, checklist for a `|`-joined multi-value
 * field — rather than a text input for everything. The constrained fields
 * can't produce an invalid value through this UI at all (the select only
 * ever offers valid ones), which is stricter than `instructionsFromRows`'s
 * own validation; that validation still runs on Save regardless, since a
 * chart edited on this page is the same string shape (`Row`) an upload
 * goes through, and it's the single source of truth for what's valid, not
 * duplicated here.
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
  const stringOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
  const ironSettingOptions = machine.iron.settings.map((s) => ({ value: s.key, label: s.label }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="chart-cards">
      {rows.map((row, index) => {
        const set = (key: (typeof COLUMNS)[number], value: string) => onChange(index, key, value);
        const ironing = row.ironing === "yes";
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a chart row has no id of its own, and clothing_type alone isn't guaranteed unique
            key={`${row.clothing_type}-${index}`}
            className={CARD}
          >
            <input
              className={`${TEXT_INPUT} text-base font-bold text-ink`}
              type="text"
              name="clothing_type"
              aria-label="Pile"
              value={row.clothing_type}
              onChange={(event) => set("clothing_type", event.target.value)}
            />
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <Field label="Detergent" span>
                <ProseField
                  value={row.detergent}
                  name="detergent"
                  onChange={(value) => set("detergent", value)}
                />
              </Field>
              <Field label="Softener">
                <BooleanField
                  checked={row.fabric_softener === "yes"}
                  name="fabric_softener"
                  onChange={(checked) => set("fabric_softener", checked ? "yes" : "no")}
                />
              </Field>
              <Field label="Temp">
                <SelectField
                  value={row.temperature}
                  name="temperature"
                  options={stringOptions(machine.washer.temperatures)}
                  onChange={(value) => set("temperature", value)}
                />
              </Field>
              <Field label="Spin">
                <SelectField
                  value={row.spin}
                  name="spin"
                  options={stringOptions(machine.washer.spins)}
                  onChange={(value) => set("spin", value)}
                />
              </Field>
              <Field label="Duration">
                <TimeField
                  value={row.duration}
                  name="duration"
                  onChange={(value) => set("duration", value)}
                />
              </Field>
              <Field label="Programme">
                <SelectField
                  value={row.program}
                  name="program"
                  options={stringOptions(machine.washer.programs)}
                  onChange={(value) => set("program", value)}
                />
              </Field>
              <Field label="Buttons" span>
                <ChecklistField
                  value={row.options}
                  name="options"
                  options={machine.washer.options}
                  onChange={(value) => set("options", value)}
                />
              </Field>
              <Field label="Ironing">
                <BooleanField
                  checked={ironing}
                  name="ironing"
                  onChange={(checked) => {
                    set("ironing", checked ? "yes" : "no");
                    if (checked && row.iron_setting === "") {
                      set("iron_setting", machine.iron.settings[0]?.key ?? "");
                    } else if (!checked) {
                      set("iron_setting", "");
                    }
                  }}
                />
              </Field>
              <Field label="Iron setting">
                <SelectField
                  value={row.iron_setting}
                  name="iron_setting"
                  options={ironSettingOptions}
                  disabled={!ironing}
                  onChange={(value) => set("iron_setting", value)}
                />
              </Field>
              <Field label="Iron notes" span>
                <ProseField
                  value={row.ironing_notes}
                  name="ironing_notes"
                  onChange={(value) => set("ironing_notes", value)}
                />
              </Field>
              <Field label="Drying" span>
                <ProseField
                  value={row.drying}
                  name="drying"
                  onChange={(value) => set("drying", value)}
                />
              </Field>
              <Field label="Colour group">
                <SelectField
                  value={row.colour_group}
                  name="colour_group"
                  options={stringOptions(colourGroups)}
                  onChange={(value) => set("colour_group", value)}
                />
              </Field>
              <Field label="Mix tags">
                <ChecklistField
                  value={row.mix_tags}
                  name="mix_tags"
                  options={mixTags}
                  onChange={(value) => set("mix_tags", value)}
                />
              </Field>
              <Field label="Notes" span>
                <ProseField
                  value={row.notes}
                  name="notes"
                  onChange={(value) => set("notes", value)}
                />
              </Field>
            </div>
          </div>
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
