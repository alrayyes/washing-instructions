/**
 * The page's colours, kept in step with `packages/pdf`'s `theme.ts` by eye
 * rather than by import — that file is react-pdf style objects (a different
 * shape, and meant for the PDF renderer specifically), not CSS, so there is
 * nothing to share directly. Same hex values, same names.
 */
export const colour = {
  ink: "#18181b",
  body: "#3f3f46",
  muted: "#71717a",
  faint: "#a1a1aa",
  line: "#d4d4d8",
  hairline: "#e4e4e7",
  panel: "#f4f4f5",
  /** Bosch fascia red — the dial arc and the pointer. */
  accent: "#d1132b",
  accentSoft: "#fdeaed",
  steam: "#9ec5e8",
  steamSoft: "#eaf2fa",
  yes: "#15803d",
  no: "#b91c1c",
} as const;
