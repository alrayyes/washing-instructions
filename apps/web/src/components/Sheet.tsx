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
import type { CSSProperties } from "react";
import { colour, font } from "../lib/theme";
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
    <p
      style={{
        fontFamily: font.bold,
        fontWeight: 700,
        fontSize: "0.7rem",
        letterSpacing: "0.05em",
        color: colour.muted,
        margin: "0 0 0.3rem",
      }}
    >
      {children.toUpperCase()}
    </p>
  );
}

function Masthead({ machine, subtitle }: { machine: Machine; subtitle: string }) {
  return (
    <header style={{ marginBottom: "1rem" }}>
      <h2
        style={{
          fontFamily: font.bold,
          fontWeight: 700,
          fontSize: "1.3rem",
          color: colour.ink,
          margin: 0,
        }}
      >
        Washing instructions
      </h2>
      <p
        style={{
          fontFamily: font.sans,
          fontSize: "0.8rem",
          color: colour.muted,
          margin: "0.2rem 0 0",
        }}
      >
        {subtitle}
      </p>
      <p style={{ fontFamily: font.sans, fontSize: "0.8rem", color: colour.muted, margin: 0 }}>
        {machine.washer.name}, {machine.washer.capacity} · {machine.iron.name}
      </p>
    </header>
  );
}

function Loads({ items }: { items: ResolvedInstruction[] }) {
  const groups = loadGroups(items);

  return (
    <section style={{ marginBottom: "1rem" }}>
      <SectionHeading>Loads — one line, one wash</SectionHeading>
      <div
        style={{
          border: `1px solid ${colour.hairline}`,
          borderRadius: "0.3rem",
          padding: "0 0.6rem",
        }}
      >
        {groups.map((group, index) => {
          const first = group[0] as ResolvedInstruction;
          return (
            <div
              key={first.clothingType}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                padding: "0.4rem 0",
                borderBottom: index === groups.length - 1 ? "none" : `1px solid ${colour.hairline}`,
              }}
            >
              <span
                style={{
                  fontFamily: font.bold,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  color: colour.accent,
                  width: "4.5rem",
                  flexShrink: 0,
                }}
              >
                {first.program} {formatTemperature(first.temperature)}
              </span>
              <span
                style={{
                  fontFamily: group.length > 1 ? font.bold : font.sans,
                  fontWeight: group.length > 1 ? 700 : 400,
                  fontSize: "0.8rem",
                  color: group.length > 1 ? colour.ink : colour.body,
                  flex: 1,
                }}
              >
                {group.map((item) => item.clothingType).join("  +  ")}
                {group.length === 1 ? "   (on its own)" : ""}
              </span>
              <span
                style={{
                  fontFamily: font.sans,
                  fontSize: "0.7rem",
                  color: colour.muted,
                  flexShrink: 0,
                }}
              >
                {durationsOf(group)}
              </span>
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
    <div
      style={{
        display: "flex",
        gap: "0.7rem",
        alignItems: "center",
        backgroundColor: colour.panel,
        borderRadius: "0.3rem",
        padding: "0.6rem",
        marginBottom: "1rem",
      }}
    >
      <div style={{ width: "4.5rem", textAlign: "center", flexShrink: 0 }}>
        {variant === "iron" ? (
          <IronDial setting={hottest} settings={machine.iron.settings} size={54} />
        ) : (
          <ProgramDial program={example} washer={washer} size={54} />
        )}
        <p
          style={{
            fontFamily: font.sans,
            fontSize: "0.65rem",
            color: colour.muted,
            margin: "0.2rem 0 0",
          }}
        >
          {variant === "iron" ? "thermostat" : "programme"}
        </p>
      </div>
      <p
        style={{
          fontFamily: font.sans,
          fontSize: "0.75rem",
          color: colour.body,
          lineHeight: 1.4,
          margin: 0,
        }}
      >
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
    <div
      style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.3rem" }}
    >
      <span
        style={{
          fontFamily: font.sans,
          fontSize: "0.65rem",
          color: colour.muted,
          width: "3.6rem",
          flexShrink: 0,
          paddingTop: "0.15rem",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
        {values.map((value) => {
          const on = selected.includes(value);
          return (
            <span
              key={value}
              style={{
                fontFamily: on ? font.bold : font.sans,
                fontWeight: on ? 700 : 400,
                fontSize: "0.7rem",
                color: on ? "#ffffff" : colour.faint,
                backgroundColor: on ? colour.accent : "#ffffff",
                border: `1px solid ${on ? colour.accent : colour.hairline}`,
                borderRadius: "0.2rem",
                padding: "0.1rem 0.35rem",
              }}
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
    <div
      style={{
        display: "flex",
        gap: "0.6rem",
        backgroundColor: colour.panel,
        border: `1px solid ${colour.hairline}`,
        borderRadius: "0.3rem",
        padding: "0.5rem",
      }}
    >
      <div style={{ width: "4.9rem", flexShrink: 0, textAlign: "center" }}>
        <ProgramDial program={item.program} washer={washer} size={78} />
        <p
          style={{
            fontFamily: font.bold,
            fontWeight: 700,
            fontSize: "0.72rem",
            color: colour.ink,
            margin: "0.15rem 0 0",
          }}
        >
          {item.program}
        </p>
        <p style={{ fontFamily: font.sans, fontSize: "0.6rem", color: colour.muted, margin: 0 }}>
          {position} clockwise from {off}
        </p>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        backgroundColor: colour.panel,
        border: `1px solid ${colour.hairline}`,
        borderRadius: "0.3rem",
        padding: "0.5rem",
      }}
    >
      <IronDial
        setting={item.ironSetting}
        settings={machine.iron.settings}
        off={!item.ironing}
        size={62}
      />
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontFamily: font.bold,
            fontWeight: 700,
            fontSize: "0.8rem",
            color: colour.ink,
            margin: 0,
          }}
        >
          {setting ? `${setting.label} — ${setting.detail}` : "Do not iron"}
        </p>
        {setting && (
          <p
            style={{
              fontFamily: font.sans,
              fontSize: "0.65rem",
              color: colour.muted,
              margin: "0.1rem 0 0",
            }}
          >
            {setting.steam ? "inside the steam zone" : "below the steam zone — dry iron only"}
          </p>
        )}
        <Prose
          items={items}
          pick={(entry) => entry.ironingNotes}
          style={{ marginTop: "0.25rem" }}
        />
      </div>
    </div>
  );
}

function Prose({
  items,
  pick,
  emphasis = false,
  style,
}: {
  items: ResolvedInstruction[];
  pick: (item: ResolvedInstruction) => string;
  emphasis?: boolean;
  style?: CSSProperties;
}) {
  const values = items.map(pick);
  const textStyle: CSSProperties = {
    fontFamily: emphasis ? font.bold : font.sans,
    fontWeight: emphasis ? 700 : 400,
    fontSize: "0.75rem",
    lineHeight: 1.4,
    color: emphasis ? colour.ink : colour.body,
    margin: 0,
    ...style,
  };

  if (values.every((value) => value === "")) return null;

  if (values.every((value) => value === values[0])) {
    return <p style={textStyle}>{values[0]}</p>;
  }

  const speaking = items.filter((_, index) => values[index] !== "");

  return (
    <div style={style}>
      {speaking.map((item, index) => (
        <p
          key={item.clothingType}
          style={{ ...textStyle, margin: index === 0 ? 0 : "0.15rem 0 0" }}
        >
          <span style={{ fontFamily: font.bold, fontWeight: 700, color: colour.ink }}>
            {item.clothingType}:{" "}
          </span>
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
    <div style={{ marginTop: "0.4rem" }}>
      <p
        style={{
          fontFamily: font.bold,
          fontWeight: 700,
          fontSize: "0.6rem",
          letterSpacing: "0.05em",
          color: colour.muted,
          margin: 0,
        }}
      >
        {label.toUpperCase()}
      </p>
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
    <div style={{ marginTop: "0.4rem" }}>
      <p
        style={{
          fontFamily: font.bold,
          fontWeight: 700,
          fontSize: "0.6rem",
          letterSpacing: "0.05em",
          color: colour.muted,
          margin: 0,
        }}
      >
        {label.toUpperCase()}
      </p>
      <p
        style={{
          fontFamily: emphasis ? font.bold : font.sans,
          fontWeight: emphasis ? 700 : 400,
          fontSize: "0.75rem",
          lineHeight: 1.4,
          color: emphasis ? colour.ink : colour.body,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function SoftenerBadge({ on }: { on: boolean }) {
  return (
    <span
      style={{
        fontFamily: font.bold,
        fontWeight: 700,
        fontSize: "0.7rem",
        color: "#ffffff",
        backgroundColor: on ? colour.yes : colour.no,
        borderRadius: "0.2rem",
        padding: "0.1rem 0.4rem",
      }}
    >
      {on ? "SOFTENER OK" : "NO SOFTENER"}
    </span>
  );
}

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
    <article
      style={{
        border: `1px solid ${colour.line}`,
        borderRadius: "0.4rem",
        padding: "0.8rem",
        marginBottom: "0.8rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${colour.ink}`,
          paddingBottom: "0.3rem",
          marginBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            fontFamily: font.bold,
            fontWeight: 700,
            fontSize: "1rem",
            color: colour.ink,
            margin: 0,
          }}
        >
          {index}. {heading}
        </h3>
        <span
          style={{
            fontFamily: font.bold,
            fontWeight: 700,
            fontSize: "0.75rem",
            color: colour.accent,
          }}
        >
          {durationsOf(group)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
        <SoftenerBadge on={item.fabricSoftener} />
        <span
          style={{ fontFamily: font.bold, fontWeight: 700, fontSize: "0.75rem", color: colour.ink }}
        >
          {item.program} {item.temperature === "koud" ? "koud" : `${item.temperature} °C`} ·{" "}
          {item.spin === "0" ? "no spin" : `${item.spin} rpm`}
        </span>
      </div>

      <ControlPanel item={item} machine={machine} />

      <SplitField label="Detergent" items={group} pick={(member) => member.detergent} />

      {variant !== "wash" && (
        <div style={{ marginTop: "0.5rem" }}>
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
    <article
      style={{
        border: `1px solid ${colour.line}`,
        borderRadius: "0.4rem",
        padding: "0.8rem",
        marginBottom: "0.8rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${colour.ink}`,
          paddingBottom: "0.3rem",
          marginBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            fontFamily: font.bold,
            fontWeight: 700,
            fontSize: "1rem",
            color: colour.ink,
            margin: 0,
          }}
        >
          {index}. {setting ? `${setting.label} — ${setting.detail}` : "Do not iron"}
        </h3>
        <span style={{ fontFamily: font.sans, fontSize: "0.7rem", color: colour.muted }}>
          {group.length} {group.length === 1 ? "pile" : "piles"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          backgroundColor: colour.panel,
          border: `1px solid ${colour.hairline}`,
          borderRadius: "0.3rem",
          padding: "0.5rem",
        }}
      >
        <IronDial
          setting={item.ironSetting}
          settings={machine.iron.settings}
          off={!item.ironing}
          size={62}
        />
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: font.bold,
              fontWeight: 700,
              fontSize: "0.85rem",
              color: colour.ink,
              margin: 0,
            }}
          >
            {setting ? `Thermostat on ${setting.label}` : "Leave the iron off"}
          </p>
          <p
            style={{
              fontFamily: font.sans,
              fontSize: "0.65rem",
              color: colour.muted,
              margin: "0.1rem 0 0",
            }}
          >
            {setting
              ? setting.steam
                ? "inside the steam zone"
                : "below the steam zone — dry iron only"
              : "nothing on this card ever goes near the board"}
          </p>
        </div>
      </div>

      <div style={{ marginTop: "0.4rem" }}>
        <SectionHeading>{setting ? "How" : "Never these"}</SectionHeading>
        {group.map((member) => (
          <div
            key={member.clothingType}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.4rem",
              marginTop: "0.15rem",
            }}
          >
            <span
              style={{
                fontFamily: font.bold,
                fontWeight: 700,
                fontSize: "0.72rem",
                lineHeight: 1.4,
                color: colour.ink,
                width: "6.5rem",
                flexShrink: 0,
              }}
            >
              {member.clothingType}
            </span>
            <span
              style={{
                fontFamily: font.sans,
                fontSize: "0.72rem",
                lineHeight: 1.4,
                color: colour.body,
              }}
            >
              {member.ironingNotes}
            </span>
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
 */
export default function Sheet({ items, machine, variant }: Props) {
  const groups = sheetGroups(items, machine, variant);

  return (
    <div style={{ maxWidth: "34rem" }}>
      <Masthead machine={machine} subtitle={SUBTITLE[variant]} />
      {variant !== "iron" && <Loads items={items} />}
      <Legend machine={machine} variant={variant} />
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
      {variant !== "iron" && (
        <p
          style={{
            fontFamily: font.sans,
            fontStyle: "italic",
            fontSize: "0.65rem",
            color: colour.faint,
            textAlign: "center",
            marginTop: "0.5rem",
          }}
        >
          Durations are the machine's own estimates and vary with load.
        </p>
      )}
    </div>
  );
}

// Re-exported for tests that want the raw grouping without pulling in the
// whole component.
export { ironCardKey, sheetGroups };
