import type { Instruction, Machine } from "@washy-washy/core/browser";
import { useEffect, useState } from "react";
import { readCustomChart } from "../lib/customChart";

const SECTION = "mb-6";
const SECTION_HEADING = "mb-2 text-lg font-bold text-ink";
const CARD = "rounded-lg border border-hairline bg-panel p-4";
const FIELD_LABEL = "text-xs font-semibold tracking-wide text-body uppercase";
const CHIP_LIST = "mt-1 flex flex-wrap gap-1";
const CHIP = "rounded border border-line bg-white px-1.5 py-0.5 text-xs text-body";

interface Props {
  items: Instruction[];
  machine: Machine;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
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

const CHART_COLUMNS: { key: keyof Instruction; label: string }[] = [
  { key: "clothingType", label: "Pile" },
  { key: "detergent", label: "Detergent" },
  { key: "fabricSoftener", label: "Softener" },
  { key: "temperature", label: "Temp" },
  { key: "spin", label: "Spin" },
  { key: "duration", label: "Duration" },
  { key: "program", label: "Programme" },
  { key: "options", label: "Buttons" },
  { key: "ironing", label: "Ironing" },
  { key: "ironSetting", label: "Iron setting" },
  { key: "ironingNotes", label: "Iron notes" },
  { key: "drying", label: "Drying" },
  { key: "colourGroup", label: "Colour group" },
  { key: "mixTags", label: "Mix tags" },
  { key: "notes", label: "Notes" },
];

function cell(item: Instruction, key: keyof Instruction): string {
  const value = item[key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

function ChartTable({ items }: { items: Instruction[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full min-w-[60rem] text-left text-sm">
        <thead>
          <tr className="border-b border-hairline bg-panel text-xs text-body uppercase">
            {CHART_COLUMNS.map((column) => (
              <th key={column.key} className="px-3 py-2 font-semibold whitespace-nowrap">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: a chart row has no id of its own, and clothingType alone isn't guaranteed unique
              key={`${item.clothingType}-${index}`}
              className="border-b border-hairline last:border-0 odd:bg-white even:bg-panel/40"
            >
              {CHART_COLUMNS.map((column) => (
                <td key={column.key} className="px-3 py-2 whitespace-nowrap text-body">
                  {cell(item, column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A troubleshooting view: the whole loaded config — machine and chart — in
 * one structured place, rather than reconstructed by eye from the rendered
 * cards. Read-only for now; #74 makes it editable.
 *
 * Reads the same uploaded-chart restoration `SheetViewer` does
 * (`customChart.ts`), so a chart uploaded on the main page shows up here
 * too. The machine itself can't be uploaded yet — nothing in the site does
 * that — so it's always the one this page was built with.
 */
export default function ConfigViewer({ items: bundledItems, machine }: Props) {
  const [customInstructions, setCustomInstructions] = useState<Instruction[] | null>(null);
  // Same hydration marker SheetViewer exposes, and for the same reason: the
  // E2E suite needs a way to know React has attached before it interacts.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCustomInstructions(readCustomChart(machine));
    setHydrated(true);
  }, [machine]);

  const items = customInstructions ?? bundledItems;

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
        <ChartTable items={items} />
      </section>
    </div>
  );
}
