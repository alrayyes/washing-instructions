import { Document, Page, Text, View } from "@react-pdf/renderer";
import { ControlPanel, Field, IronPanel, ProgramDial, SoftenerBadge } from "./components";
import { iron, ironSetting, washer } from "./machine";
import {
  type Blocker,
  blockerCode,
  blockerLegend,
  cardGroups,
  loadGroups,
  mixBlocker,
} from "./mixing";
import { theme } from "./theme";
import type { ResolvedInstruction } from "./types";

const { colour, font } = theme;

const A4 = { width: 595.28, height: 841.89 };
const PHONE_WIDTH = 244;

function ironLabel(item: ResolvedInstruction): string {
  if (item.ironSetting === "none") return "do not iron";
  return ironSetting(item.ironSetting)?.label ?? item.ironSetting;
}

function SectionHeading({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: 6,
        letterSpacing: 0.8,
        color: colour.muted,
        marginBottom: 3,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

/**
 * One card, top to bottom: what it is, how the machine goes, iron, dry.
 *
 * `group` is usually a single pile. Where two piles came out identical in
 * every attribute they share one card, because printing it twice would only
 * change the heading.
 */
function Card({
  group,
  index,
  compact = false,
}: {
  group: ResolvedInstruction[];
  index: number;
  compact?: boolean;
}) {
  const item = group[0] as ResolvedInstruction;
  const heading = group.map((member) => member.clothingType).join(" + ");
  // Piles on this card wash together by definition; don't list them twice.
  const names = new Set(group.map((member) => member.clothingType));
  const alsoWith = item.mixesWith.filter((name) => !names.has(name));

  return (
    <View
      style={{
        borderWidth: 0.8,
        borderColor: colour.line,
        borderRadius: 4,
        padding: compact ? 8 : 10,
        marginBottom: compact ? 8 : 12,
      }}
      wrap={false}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 0.8,
          borderBottomColor: colour.ink,
          paddingBottom: 3,
          marginBottom: 5,
        }}
      >
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: compact ? 11 : 13,
            color: colour.ink,
            flex: 1,
            paddingRight: 6,
          }}
        >
          {index}. {heading}
        </Text>
        <Text style={{ fontFamily: font.sans, fontSize: 7, color: colour.muted }}>
          {item.duration}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <SoftenerBadge on={item.fabricSoftener} />
        <Text style={{ fontFamily: font.bold, fontSize: 8, color: colour.ink }}>
          {item.program} {item.temperature === "koud" ? "koud" : `${item.temperature} °C`} ·{" "}
          {item.spin === "0" ? "no spin" : `${item.spin} rpm`}
        </Text>
      </View>

      <ControlPanel item={item} dialSize={compact ? 68 : 78} />

      <Field label="Detergent" value={item.detergent} />

      <View style={{ marginTop: 5 }}>
        <SectionHeading>Iron</SectionHeading>
        <IronPanel item={item} dialSize={compact ? 54 : 62} />
      </View>

      <Field label="Drying" value={item.drying} />
      <Field
        label="Wash together with"
        value={
          group.length > 1
            ? `each other${alsoWith.length > 0 ? `, and ${alsoWith.join(", ")}` : ""}`
            : alsoWith.length > 0
              ? alsoWith.join(", ")
              : "nothing else — wash alone"
        }
        emphasis
      />
      {item.notes !== "" && <Field label="Notes" value={item.notes} />}
    </View>
  );
}

function Masthead({ subtitle }: { subtitle: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 15, color: colour.ink }}>
        Washing instructions
      </Text>
      <Text style={{ fontFamily: font.sans, fontSize: 7.5, color: colour.muted, marginTop: 1.5 }}>
        {subtitle}
      </Text>
      <Text style={{ fontFamily: font.sans, fontSize: 7.5, color: colour.muted }}>
        {washer.name}, {washer.capacity} · {iron.name}
      </Text>
    </View>
  );
}

/**
 * The piles collapsed into actual loads: everything on one line goes in the
 * drum at the same time on the same settings. This is the answer to "can I
 * put these two in together" without reading the matrix.
 */
function Loads({ items }: { items: ResolvedInstruction[] }) {
  const groups = loadGroups(items);

  return (
    <View style={{ marginBottom: 10 }}>
      <SectionHeading>Loads — one line, one wash</SectionHeading>
      <View
        style={{
          borderWidth: 0.6,
          borderColor: colour.hairline,
          borderRadius: 3,
          paddingVertical: 2,
          paddingHorizontal: 6,
        }}
      >
        {groups.map((group) => {
          const first = group[0] as ResolvedInstruction;
          return (
            <View
              key={first.clothingType}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingVertical: 2.6,
                borderBottomWidth: group === groups[groups.length - 1] ? 0 : 0.4,
                borderBottomColor: colour.hairline,
              }}
            >
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: 6.6,
                  color: colour.accent,
                  width: 58,
                }}
              >
                {first.program} {first.temperature === "koud" ? "koud" : `${first.temperature}°`}
              </Text>
              <Text
                style={{
                  fontFamily: group.length > 1 ? font.bold : font.sans,
                  fontSize: 7.2,
                  color: group.length > 1 ? colour.ink : colour.body,
                  flex: 1,
                }}
              >
                {group.map((item) => item.clothingType).join("  +  ")}
                {group.length === 1 ? "   (on its own)" : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** How to read the dial drawings, printed once per document. */
function Legend() {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        backgroundColor: colour.panel,
        borderRadius: 3,
        padding: 6,
        marginBottom: 10,
      }}
    >
      <View style={{ alignItems: "center", width: 54 }}>
        <ProgramDial program="Katoen" size={54} />
        <Text style={{ fontFamily: font.sans, fontSize: 5.5, color: colour.muted }}>programme</Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontFamily: font.sans, fontSize: 7, color: colour.body, lineHeight: 1.4 }}>
          The dials are drawn as they sit on the machine: twelve o'clock is Uit, and the red pointer
          is where to turn it. Chips show every value the display steps through, filled in on the
          one you want. On the iron, the blue band is the zone where it makes steam.
        </Text>
      </View>
    </View>
  );
}

/** The phone version: one narrow page you scroll from top to bottom. */
export function PhoneDocument({ items, height }: { items: ResolvedInstruction[]; height: number }) {
  return (
    <Document title="Washing instructions (phone)" author="washing-instructions">
      <Page size={{ width: PHONE_WIDTH, height }} style={{ padding: 12, backgroundColor: "#fff" }}>
        <Masthead subtitle="Scroll for the pile you are holding." />
        <Loads items={items} />
        <Legend />
        {cardGroups(items).map((group, index) => (
          <Card
            key={(group[0] as ResolvedInstruction).clothingType}
            group={group}
            index={index + 1}
            compact
          />
        ))}
        <Text
          style={{
            fontFamily: font.oblique,
            fontSize: 6,
            color: colour.faint,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Durations are the machine's own estimates and vary with load.
        </Text>
      </Page>
    </Document>
  );
}

function SummaryTable({ items }: { items: ResolvedInstruction[] }) {
  const columns: { label: string; width: number; value: (item: ResolvedInstruction) => string }[] =
    [
      { label: "Pile", width: 118, value: (i) => i.clothingType },
      { label: "Programme", width: 74, value: (i) => i.program },
      { label: "°C", width: 30, value: (i) => i.temperature },
      { label: "Spin", width: 32, value: (i) => i.spin },
      { label: "Buttons", width: 78, value: (i) => i.options.join(", ") || "—" },
      { label: "Softener", width: 42, value: (i) => (i.fabricSoftener ? "yes" : "no") },
      { label: "Iron", width: 44, value: (i) => ironLabel(i) },
      { label: "Detergent", width: 105, value: (i) => i.detergent.split(/[—.:]/)[0]?.trim() ?? "" },
    ];

  return (
    <View style={{ marginBottom: 14 }}>
      <SectionHeading>At a glance</SectionHeading>
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 0.8,
          borderBottomColor: colour.ink,
          paddingBottom: 2.5,
        }}
      >
        <Text style={{ fontFamily: font.bold, fontSize: 6.5, width: 14, color: colour.ink }}>
          #
        </Text>
        {columns.map((column) => (
          <Text
            key={column.label}
            style={{
              fontFamily: font.bold,
              fontSize: 6.5,
              width: column.width,
              color: colour.ink,
            }}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {items.map((item, index) => (
        <View
          key={item.clothingType}
          style={{
            flexDirection: "row",
            paddingVertical: 2.6,
            borderBottomWidth: 0.4,
            borderBottomColor: colour.hairline,
            backgroundColor: index % 2 === 1 ? colour.panel : "#ffffff",
          }}
        >
          <Text style={{ fontFamily: font.sans, fontSize: 6.8, width: 14, color: colour.muted }}>
            {index + 1}
          </Text>
          {columns.map((column, position) => (
            <Text
              key={column.label}
              style={{
                fontFamily: position === 0 ? font.bold : font.sans,
                fontSize: 6.8,
                width: column.width,
                color: position === 0 ? colour.ink : colour.body,
                paddingRight: 4,
              }}
            >
              {column.value(item)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The answer to "can these two go in together" for every pair, as a grid.
 * Columns are numbered to match the rows so the header stays narrow.
 */
function MixMatrix({ items }: { items: ResolvedInstruction[] }) {
  const labelWidth = 118;
  const cell = (A4.width - 72 - labelWidth) / items.length;
  const used = new Set<Blocker>();
  for (const a of items)
    for (const b of items) {
      const blocker = a === b ? null : mixBlocker(a, b);
      if (blocker) used.add(blocker);
    }

  return (
    <View>
      <SectionHeading>Can these share a load?</SectionHeading>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: labelWidth }} />
        {items.map((item, index) => (
          <Text
            key={item.clothingType}
            style={{
              fontFamily: font.bold,
              fontSize: 6,
              width: cell,
              textAlign: "center",
              color: colour.muted,
            }}
          >
            {index + 1}
          </Text>
        ))}
      </View>
      {items.map((row, rowIndex) => (
        <View key={row.clothingType} style={{ flexDirection: "row", alignItems: "stretch" }}>
          <Text
            style={{
              fontFamily: font.sans,
              fontSize: 6.6,
              width: labelWidth,
              color: colour.ink,
              paddingVertical: 2.2,
              paddingRight: 4,
            }}
          >
            {rowIndex + 1}. {row.clothingType}
          </Text>
          {items.map((column, columnIndex) => {
            const self = rowIndex === columnIndex;
            const blocker = self ? null : mixBlocker(row, column);
            const background = self ? colour.line : blocker ? "#ffffff" : "#dcf3e3";
            return (
              <View
                key={column.clothingType}
                style={{
                  width: cell,
                  backgroundColor: background,
                  borderWidth: 0.4,
                  borderColor: colour.hairline,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 2.2,
                }}
              >
                <Text
                  style={{
                    fontFamily: font.bold,
                    fontSize: 6,
                    color: blocker ? colour.faint : colour.yes,
                  }}
                >
                  {self ? "" : blocker ? blockerCode[blocker] : "OK"}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 5 }}>
        <Text style={{ fontFamily: font.sans, fontSize: 6.2, color: colour.body }}>
          OK — same drum
        </Text>
        {[...used].map((blocker) => (
          <Text key={blocker} style={{ fontFamily: font.sans, fontSize: 6.2, color: colour.body }}>
            {blockerCode[blocker]} — {blockerLegend[blocker].toLowerCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** The printable version: a reference sheet, then two detail cards per page. */
export function PrintDocument({ items }: { items: ResolvedInstruction[] }) {
  const cards = cardGroups(items);

  return (
    <Document title="Washing instructions (print)" author="washing-instructions">
      <Page size={[A4.width, A4.height]} style={{ padding: 36, backgroundColor: "#fff" }}>
        <Masthead subtitle="Pin this next to the machine." />
        <Loads items={items} />
        <SummaryTable items={items} />
        <MixMatrix items={items} />
        <View style={{ marginTop: 14 }}>
          <Legend />
        </View>
      </Page>
      {/*
        The cards flow onto as many A4 sheets as they need. Each card is
        `wrap={false}`, so one is never split across a page break; how many
        land on a sheet depends on how much prose the CSV carries.
      */}
      <Page size={[A4.width, A4.height]} style={{ padding: 36, backgroundColor: "#fff" }}>
        {cards.map((group, index) => (
          <Card
            key={(group[0] as ResolvedInstruction).clothingType}
            group={group}
            index={index + 1}
          />
        ))}
      </Page>
    </Document>
  );
}

export { PHONE_WIDTH };
