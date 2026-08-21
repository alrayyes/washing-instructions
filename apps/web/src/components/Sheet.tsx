import {
  canMix,
  cardGroups,
  durationsOf,
  formatTemperature,
  ironGroups,
  ironSetting,
  ironSettingKeys,
  loadGroups,
  type Machine,
  type ResolvedInstruction,
  type Variant,
  washGroups,
} from "@washy-washy/core/browser";
import { colour } from "../lib/theme";
import { IronDial, ProgramDial } from "./dials";

const SUBTITLE: Record<Variant, string> = {
  full: "Scroll for the pile you are holding.",
  wash: "Getting it into the machine. Ironing is on the other sheet.",
  iron: "At the board. Washing is on the other sheet.",
};

/** What makes an ironing card unique — see `packages/pdf`'s `documents.tsx`. */
function ironCardKey(item: ResolvedInstruction): string {
  return item.ironing ? item.ironSetting : "do-not-iron";
}

function sheetGroups(
  items: ResolvedInstruction[],
  machine: Machine,
  variant: Variant,
): ResolvedInstruction[][] {
  if (variant === "wash") return washGroups(items);
  if (variant === "iron") return ironGroups(items, ironSettingKeys(machine));
  return cardGroups(items);
}

function SectionHeading({ children }: { children: string }) {
  return (
    <p className="mb-1 text-[0.7rem] font-bold tracking-wide text-muted">
      {children.toUpperCase()}
    </p>
  );
}

function Masthead({ machine, subtitle }: { machine: Machine; subtitle: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-xl font-bold text-ink sm:text-2xl">Washing instructions</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      <p className="text-sm text-muted">
        {machine.washer.name}, {machine.washer.capacity} · {machine.iron.name}
      </p>
    </header>
  );
}

function Loads({ items }: { items: ResolvedInstruction[] }) {
  const groups = loadGroups(items);

  return (
    <section className="mb-4">
      <SectionHeading>Loads — one line, one wash</SectionHeading>
      <div className="rounded-md border border-hairline px-3">
        {groups.map((group, index) => {
          const first = group[0] as ResolvedInstruction;
          return (
            <div
              key={first.clothingType}
              className={`flex items-start gap-2 py-2 ${
                index === groups.length - 1 ? "" : "border-b border-hairline"
              }`}
            >
              <span className="w-18 shrink-0 text-xs font-bold text-accent">
                {first.program} {formatTemperature(first.temperature)}
              </span>
              <span
                className={`flex-1 text-sm ${
                  group.length > 1 ? "font-bold text-ink" : "text-body"
                }`}
              >
                {group.map((item) => item.clothingType).join("  +  ")}
                {group.length === 1 ? "   (on its own)" : ""}
              </span>
              <span className="shrink-0 text-xs text-muted">{durationsOf(group)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Legend({ machine, variant }: { machine: Machine; variant: Variant }) {
  const { washer } = machine;
  const off = washer.programs[0] ?? "";
  const example = washer.programs[1] ?? off;
  const hottest = machine.iron.settings[machine.iron.settings.length - 1]?.key ?? "";

  return (
    <div className="mb-4 flex items-center gap-3 rounded-md bg-panel p-3">
      <div className="w-18 shrink-0 text-center">
        {variant === "iron" ? (
          <IronDial setting={hottest} settings={machine.iron.settings} size={54} />
        ) : (
          <ProgramDial program={example} washer={washer} size={54} />
        )}
        <p className="mt-1 text-[0.65rem] text-body">
          {variant === "iron" ? "thermostat" : "programme"}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-body">
        {variant === "iron" ? (
          <>
            The ring is the iron's thermostat as it sits on the dial, and the red pointer is where
            to turn it. The blue band is the zone where it makes steam; a setting below it is a dry
            iron. A crossed-out ring means leave the iron in the cupboard.
          </>
        ) : (
          <>
            The dials are drawn as they sit on the machine: twelve o'clock is {off}, and the red
            pointer is where to turn it. Chips show every value the display steps through, filled in
            on the one you want.
            {variant === "full" && " On the iron, the blue band is the zone where it makes steam."}
          </>
        )}
      </p>
    </div>
  );
}

function ChipRow({
  label,
  values,
  selected,
}: {
  label: string;
  values: readonly string[];
  selected: readonly string[];
}) {
  return (
    <div className="mb-1 flex items-start gap-2">
      <span className="w-14 shrink-0 pt-0.5 text-xs text-body">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => {
          const on = selected.includes(value);
          return (
            <span
              key={value}
              className={`rounded border px-1.5 py-0.5 text-xs ${
                on
                  ? "border-accent bg-accent font-bold text-white"
                  : "border-hairline bg-white text-muted"
              }`}
            >
              {value}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ControlPanel({ item, machine }: { item: ResolvedInstruction; machine: Machine }) {
  const { washer } = machine;
  const position = washer.programs.indexOf(item.program);
  const off = washer.programs[0] ?? "";

  return (
    <div className="flex gap-3 rounded-md border border-hairline bg-panel p-3">
      <div className="w-20 shrink-0 text-center">
        <ProgramDial program={item.program} washer={washer} size={78} />
        <p className="mt-1 text-xs font-bold text-ink">{item.program}</p>
        <p className="text-[0.6rem] text-body">
          {position} clockwise from {off}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <ChipRow label="Temp" values={washer.temperatures} selected={[item.temperature]} />
        <ChipRow label="Spin rpm" values={washer.spins} selected={[item.spin]} />
        <ChipRow label="Buttons" values={washer.options} selected={item.options} />
      </div>
    </div>
  );
}

function IronPanel({ items, machine }: { items: ResolvedInstruction[]; machine: Machine }) {
  const item = items[0] as ResolvedInstruction;
  const setting = item.ironing ? ironSetting(machine, item.ironSetting) : undefined;

  return (
    <div className="flex items-center gap-3 rounded-md border border-hairline bg-panel p-3">
      <IronDial
        setting={item.ironSetting}
        settings={machine.iron.settings}
        off={!item.ironing}
        size={62}
      />
      <div className="flex-1">
        <p className="text-sm font-bold text-ink">
          {setting ? `${setting.label} — ${setting.detail}` : "Do not iron"}
        </p>
        {setting && (
          <p className="mt-0.5 text-xs text-body">
            {setting.steam ? "inside the steam zone" : "below the steam zone — dry iron only"}
          </p>
        )}
        <Prose items={items} pick={(entry) => entry.ironingNotes} className="mt-1" />
      </div>
    </div>
  );
}

function Prose({
  items,
  pick,
  emphasis = false,
  className = "",
}: {
  items: ResolvedInstruction[];
  pick: (item: ResolvedInstruction) => string;
  emphasis?: boolean;
  className?: string;
}) {
  const values = items.map(pick);
  const textClass = `text-sm leading-relaxed ${emphasis ? "font-bold text-ink" : "text-body"}`;

  if (values.every((value) => value === "")) return null;

  if (values.every((value) => value === values[0])) {
    return <p className={`${textClass} ${className}`}>{values[0]}</p>;
  }

  const speaking = items.filter((_, index) => values[index] !== "");

  return (
    <div className={className}>
      {speaking.map((item, index) => (
        <p key={item.clothingType} className={`${textClass} ${index === 0 ? "" : "mt-0.5"}`}>
          <span className="font-bold text-ink">{item.clothingType}: </span>
          {pick(item)}
        </p>
      ))}
    </div>
  );
}

function SplitField({
  label,
  items,
  pick,
  emphasis = false,
}: {
  label: string;
  items: ResolvedInstruction[];
  pick: (item: ResolvedInstruction) => string;
  emphasis?: boolean;
}) {
  if (items.every((item) => pick(item) === "")) return null;

  return (
    <div className="mt-2">
      <p className="text-[0.6rem] font-bold tracking-wide text-muted">{label.toUpperCase()}</p>
      <Prose items={items} pick={pick} emphasis={emphasis} />
    </div>
  );
}

function Field({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="mt-2">
      <p className="text-[0.6rem] font-bold tracking-wide text-muted">{label.toUpperCase()}</p>
      <p className={`text-sm leading-relaxed ${emphasis ? "font-bold text-ink" : "text-body"}`}>
        {value}
      </p>
    </div>
  );
}

function SoftenerBadge({ on }: { on: boolean }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: on ? colour.yes : colour.no }}
    >
      {on ? "SOFTENER OK" : "NO SOFTENER"}
    </span>
  );
}

const CARD_CLASS = "rounded-lg border border-line p-4";
const CARD_HEADER_CLASS = "mb-3 flex items-center justify-between gap-2 border-b border-ink pb-1.5";

function Card({
  group,
  index,
  variant,
  machine,
}: {
  group: ResolvedInstruction[];
  index: number;
  variant: Variant;
  machine: Machine;
}) {
  const item = group[0] as ResolvedInstruction;
  const heading = group.map((member) => member.clothingType).join(" + ");
  const names = new Set(group.map((member) => member.clothingType));
  const together = group.every((a) => group.every((b) => a === b || canMix(a, b)));
  const alsoWith = item.mixesWith.filter(
    (name) => !names.has(name) && group.every((member) => member.mixesWith.includes(name)),
  );

  return (
    <article className={CARD_CLASS}>
      <div className={CARD_HEADER_CLASS}>
        <h3 className="text-base font-bold text-ink">
          {index}. {heading}
        </h3>
        <span className="shrink-0 text-xs font-bold text-accent">{durationsOf(group)}</span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <SoftenerBadge on={item.fabricSoftener} />
        <span className="text-xs font-bold text-ink">
          {item.program} {item.temperature === "koud" ? "koud" : `${item.temperature} °C`} ·{" "}
          {item.spin === "0" ? "no spin" : `${item.spin} rpm`}
        </span>
      </div>

      <ControlPanel item={item} machine={machine} />

      <SplitField label="Detergent" items={group} pick={(member) => member.detergent} />

      {variant !== "wash" && (
        <div className="mt-3">
          <SectionHeading>Iron</SectionHeading>
          <IronPanel items={group} machine={machine} />
        </div>
      )}

      <SplitField label="Drying" items={group} pick={(member) => member.drying} />
      <Field
        label="Wash together with"
        value={
          group.length > 1 && together
            ? `each other${alsoWith.length > 0 ? `, and ${alsoWith.join(", ")}` : ""}`
            : group.length > 1
              ? "same settings, but wash these separately — see the matrix"
              : alsoWith.length > 0
                ? alsoWith.join(", ")
                : "nothing else — wash alone"
        }
        emphasis
      />
      <SplitField label="Notes" items={group} pick={(member) => member.notes} />
    </article>
  );
}

function IronCard({
  group,
  index,
  machine,
}: {
  group: ResolvedInstruction[];
  index: number;
  machine: Machine;
}) {
  const item = group[0] as ResolvedInstruction;
  const setting = item.ironing ? ironSetting(machine, item.ironSetting) : undefined;

  return (
    <article className={CARD_CLASS}>
      <div className={CARD_HEADER_CLASS}>
        <h3 className="text-base font-bold text-ink">
          {index}. {setting ? `${setting.label} — ${setting.detail}` : "Do not iron"}
        </h3>
        <span className="shrink-0 text-xs text-muted">
          {group.length} {group.length === 1 ? "pile" : "piles"}
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-hairline bg-panel p-3">
        <IronDial
          setting={item.ironSetting}
          settings={machine.iron.settings}
          off={!item.ironing}
          size={62}
        />
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">
            {setting ? `Thermostat on ${setting.label}` : "Leave the iron off"}
          </p>
          <p className="mt-0.5 text-xs text-body">
            {setting
              ? setting.steam
                ? "inside the steam zone"
                : "below the steam zone — dry iron only"
              : "nothing on this card ever goes near the board"}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <SectionHeading>{setting ? "How" : "Never these"}</SectionHeading>
        {group.map((member) => (
          <div key={member.clothingType} className="mt-1 flex items-start gap-2">
            <span className="w-26 shrink-0 text-xs font-bold text-ink">{member.clothingType}</span>
            <span className="text-xs text-body">{member.ironingNotes}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

interface Props {
  items: ResolvedInstruction[];
  machine: Machine;
  variant: Variant;
}

/**
 * The page itself: the same content `PhoneDocument` draws into a PDF —
 * loads, the dial legend, one card per pile grouping — as real HTML, so it
 * reads and scrolls like a page instead of an embedded PDF viewer. The PDF
 * is only ever generated on demand, by the download button.
 *
 * Mobile-first: one column by default, since this is meant to be read on a
 * phone standing in front of the machine — a two-column grid only kicks in
 * once there's room to actually read two cards side by side.
 */
export default function Sheet({ items, machine, variant }: Props) {
  const groups = sheetGroups(items, machine, variant);

  return (
    <div>
      <Masthead machine={machine} subtitle={SUBTITLE[variant]} />
      {variant !== "iron" && <Loads items={items} />}
      <Legend machine={machine} variant={variant} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {groups.map((group, index) =>
          variant === "iron" ? (
            <IronCard
              key={ironCardKey(group[0] as ResolvedInstruction)}
              group={group}
              index={index + 1}
              machine={machine}
            />
          ) : (
            <Card
              key={(group[0] as ResolvedInstruction).clothingType}
              group={group}
              index={index + 1}
              variant={variant}
              machine={machine}
            />
          ),
        )}
      </div>
      {variant !== "iron" && (
        <p className="mt-3 text-center text-xs text-muted italic">
          Durations are the machine's own estimates and vary with load.
        </p>
      )}
    </div>
  );
}

// Re-exported for tests that want the raw grouping without pulling in the
// whole component.
export { ironCardKey, sheetGroups };
