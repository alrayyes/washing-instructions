/**
 * Everything in this package that runs in a browser: machine validation,
 * mixing rules and the shared types. `csv.ts` — and the `index.ts` barrel
 * that includes it — pulls in `csv-parse`, which reaches for Node's `Buffer`
 * at import time even when nothing calls it, so a bundler ships it into the
 * client and it dies on `Buffer is not defined`. Chart parsing is a
 * build-time/CLI concern; nothing that runs in a page needs it.
 */
export * from "./machine";
export * from "./mixing";
export * from "./types";
