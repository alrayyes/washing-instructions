import type { Machine } from "@washy-washy/core/browser";
import { colour } from "../lib/theme";

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

/** SVG arc path between two angles, measured clockwise from 12 o'clock. */
function arc(cx: number, cy: number, radius: number, from: number, to: number): string {
  const start = polar(cx, cy, radius, from);
  const end = polar(cx, cy, radius, to);
  const largeArc = to - from > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * The programme dial, drawn to scale: one tick per position on the real
 * fascia, in the real order, with the pointer on the one you want. Ported
 * from `packages/pdf`'s `ProgramDial` — same geometry, real `<svg>` instead
 * of `@react-pdf/renderer`'s primitives, which only work inside a PDF
 * `<Document>`.
 */
export function ProgramDial({
  program,
  washer,
  size = 76,
}: {
  program: string;
  washer: Machine["washer"];
  size?: number;
}) {
  const centre = size / 2;
  const outer = centre - 3;
  const knob = outer * 0.45;
  const index = Math.max(0, washer.programs.indexOf(program));
  const step = 360 / washer.programs.length;
  const pointer = polar(centre, centre, knob - 1.5, index * step);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <path
        d={arc(centre, centre, outer, step * 0.6, 360 - step * 0.6)}
        stroke={colour.accent}
        strokeWidth={0.8}
        fill="none"
      />
      <g>
        {washer.programs.map((name, position) => {
          const angle = position * step;
          const selected = position === index;
          const inner = polar(centre, centre, selected ? knob + 1 : outer - 4.5, angle);
          const edge = polar(centre, centre, selected ? outer + 1.5 : outer, angle);
          return (
            <line
              key={name}
              x1={inner.x}
              y1={inner.y}
              x2={edge.x}
              y2={edge.y}
              stroke={selected ? colour.accent : colour.faint}
              strokeWidth={selected ? 2 : 0.7}
            />
          );
        })}
      </g>
      <circle
        cx={centre}
        cy={centre}
        r={knob}
        fill="#e8e8ea"
        stroke={colour.line}
        strokeWidth={0.8}
      />
      <line
        x1={centre}
        y1={centre}
        x2={pointer.x}
        y2={pointer.y}
        stroke={colour.accent}
        strokeWidth={2}
      />
      <circle cx={centre} cy={centre} r={1.6} fill={colour.accent} />
    </svg>
  );
}

/**
 * The iron's thermostat ring: MIN through MAX, with the shaded band marking
 * where the iron actually makes steam, and the pointer on the right
 * setting. Ported from `packages/pdf`'s `IronDial`.
 */
export function IronDial({
  setting,
  settings,
  off = false,
  size = 76,
}: {
  setting: string;
  settings: Machine["iron"]["settings"];
  /** Draw the crossed-out ring instead of a pointer. */
  off?: boolean;
  size?: number;
}) {
  const centre = size / 2;
  const outer = centre - 3;
  const knob = outer * 0.42;
  const sweep = 280;
  const first = -sweep / 2;
  const positions = settings.map((_, position) => position);
  const step = sweep / Math.max(1, positions.length - 1);
  const index = Math.max(
    0,
    settings.findIndex((entry) => entry.key === setting),
  );
  const angleOf = (position: number) => (first + position * step + 360) % 360;
  const pointer = polar(centre, centre, knob - 1.5, angleOf(index));
  const steamFrom = settings.findIndex((entry) => entry.steam);
  const steamTo = settings.reduce((last, entry, at) => (entry.steam ? at : last), -1);
  const offLine1 = polar(centre, centre, outer - 6, 225);
  const offLine2 = polar(centre, centre, outer - 6, 45);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <path
        d={arc(centre, centre, outer, angleOf(0), angleOf(0) + sweep)}
        stroke={off ? colour.hairline : colour.line}
        strokeWidth={1}
        fill="none"
      />
      {!off && steamFrom >= 0 && (
        <path
          d={arc(centre, centre, outer, angleOf(steamFrom), angleOf(steamTo))}
          stroke={colour.steam}
          strokeWidth={3}
          fill="none"
        />
      )}
      <g>
        {positions.map((position) => {
          const angle = angleOf(position);
          const selected = !off && position === index;
          const inner = polar(centre, centre, outer - (selected ? 9 : 5), angle);
          const edge = polar(centre, centre, outer + (selected ? 1.5 : 0), angle);
          return (
            <line
              key={position}
              x1={inner.x}
              y1={inner.y}
              x2={edge.x}
              y2={edge.y}
              stroke={off ? colour.hairline : selected ? colour.accent : colour.faint}
              strokeWidth={selected ? 2 : 0.7}
            />
          );
        })}
      </g>
      <circle
        cx={centre}
        cy={centre}
        r={knob}
        fill={off ? "#f4f4f5" : "#e8e8ea"}
        stroke={colour.line}
        strokeWidth={0.8}
      />
      {off ? (
        <g>
          <circle
            cx={centre}
            cy={centre}
            r={outer - 6}
            stroke={colour.no}
            strokeWidth={1.6}
            fill="none"
          />
          <line
            x1={offLine1.x}
            y1={offLine1.y}
            x2={offLine2.x}
            y2={offLine2.y}
            stroke={colour.no}
            strokeWidth={1.6}
          />
        </g>
      ) : (
        <g>
          <line
            x1={centre}
            y1={centre}
            x2={pointer.x}
            y2={pointer.y}
            stroke={colour.accent}
            strokeWidth={2}
          />
          <circle cx={centre} cy={centre} r={1.6} fill={colour.accent} />
        </g>
      )}
    </svg>
  );
}
