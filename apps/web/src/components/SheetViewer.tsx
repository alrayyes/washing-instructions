import {
  chartFromJson,
  chartToJson,
  type Instruction,
  type Machine,
  type ResolvedInstruction,
  resolve,
  type Variant,
  variants,
} from "@washy-washy/core/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { clearCustomChart, readCustomChart, writeCustomChart } from "../lib/customChart";
import { filterByPile } from "../lib/filter";
import { readFilters, writeFilters } from "../lib/storage";
import { readUrlFilters } from "../lib/url";
import { writeUrlFilters } from "../lib/urlHistory";
import Sheet from "./Sheet";

const CUT_LABEL: Record<Variant, string> = {
  full: "Everything",
  wash: "Washing only",
  iron: "Ironing only",
};

// text-body, not text-muted: muted-on-panel is 4.39:1, just under WCAG AA's
// 4.5:1 for this text's size and weight.
const FIELD_LABEL = "block text-xs font-semibold tracking-wide text-body uppercase";
const FIELD_INPUT =
  "mt-1 block w-full min-w-0 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none";
const BUTTON_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const ALERT = "rounded-md border border-no/30 bg-no/5 px-3 py-2 text-sm text-no";

/**
 * A tap-to-open "?" next to a field label — `title` alone is a hover-only
 * tooltip, which a phone (this site's main device) can't reach. Closes on
 * blur so it doesn't linger once the visitor's moved on.
 */
function HelpBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block normal-case">
      <button
        type="button"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-line text-[0.6rem] font-bold text-body hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="What does this do?"
        aria-expanded={open}
        onClick={(event) => {
          // Inside a <label>: without this, the click also activates the
          // field the label wraps (opening the select, focusing the input).
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute top-full left-0 z-10 mt-1 w-48 max-w-[80vw] rounded-md border border-line bg-white p-2 text-xs font-normal text-body shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
}

interface Props {
  items: ResolvedInstruction[];
  machine: Machine;
}

/**
 * The in-browser answer to `bun run generate`'s phone PDF: the same chart,
 * drawn as a real page (`Sheet`) rather than an embedded PDF, filtered by
 * cut and pile instead of a filename suffix, and optionally over a chart
 * you uploaded instead of the bundled example. The PDF itself — the same
 * `renderPhone` the CLI uses — is only ever generated when the download
 * button is clicked, not on every filter change.
 */
export default function SheetViewer({ items: bundledItems, machine }: Props) {
  const [cut, setCut] = useState<Variant>("full");
  const [pileQuery, setPileQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState<Instruction[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Read by the E2E suite (`[data-hydrated="true"]`), which otherwise has no
  // way to tell that React has attached its listeners: a `selectOption` or
  // `fill` fired at the plain server-rendered HTML still "succeeds" — it
  // mutates the DOM directly — but the change never reaches this
  // component's state, since nothing is listening yet.
  const [hydrated, setHydrated] = useState(false);

  // Restored client-side, after the first render — matching the server-
  // rendered default (the bundled chart, no filters) on that first pass
  // avoids a hydration mismatch.
  const restored = useRef(false);
  useEffect(() => {
    // A URL carrying filter state wins outright over a previous visit's
    // saved one — a shared link is meant to show what was shared, not
    // silently blend with (or lose to) whatever's already in this
    // browser's storage.
    const fromUrl = readUrlFilters(window.location.search);
    if (fromUrl.cut !== undefined || fromUrl.pileQuery !== undefined) {
      setCut(fromUrl.cut ?? "full");
      setPileQuery(fromUrl.pileQuery ?? "");
    } else {
      const saved = readFilters();
      if (saved) {
        setCut(saved.cut);
        setPileQuery(saved.pileQuery);
      }
    }
    setCustomInstructions(readCustomChart(machine));
    restored.current = true;
    setHydrated(true);
  }, [machine]);

  useEffect(() => {
    // Skipped on the mount render: without this, restoring a saved filter
    // above would immediately be overwritten by writing back the still-
    // default state from this same effect.
    if (!restored.current) return;
    writeFilters({ cut, pileQuery });
    writeUrlFilters({ cut, pileQuery });
  }, [cut, pileQuery]);

  const sourceItems = useMemo(
    () => (customInstructions ? resolve(customInstructions) : bundledItems),
    [customInstructions, bundledItems],
  );
  const filtered = useMemo(() => filterByPile(sourceItems, pileQuery), [sourceItems, pileQuery]);
  const downloadHref = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(chartToJson(sourceItems))}`,
    [sourceItems],
  );

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      // Dynamic, not static: @washy-washy/pdf pulls in @react-pdf/renderer
      // and pdf-lib, which nothing needs until this click — a static import
      // would ship both in the page's main chunk regardless.
      const { renderPhone } = await import("@washy-washy/pdf");
      const { pdf } = await renderPhone(filtered, machine, cut);
      // TS's DOM lib types BlobPart as ArrayBuffer-backed only, while
      // Uint8Array is typed over the wider ArrayBufferLike (which also
      // covers SharedArrayBuffer) — pdf is always a fresh copy from
      // Blob.arrayBuffer(), never shared, so this is a safe narrowing.
      const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${STEM}-phone${SUFFIX[cut]}.pdf`;
      link.click();
      // Revoked after the click has had a chance to start the download —
      // revoking synchronously can cancel it in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setDownloadError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = chartFromJson(await file.text(), machine);
      setCustomInstructions(parsed);
      writeCustomChart(parsed);
      setUploadError(null);
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  function handleClear() {
    clearCustomChart();
    setCustomInstructions(null);
    setUploadError(null);
  }

  return (
    <div className="flex flex-col gap-6" data-hydrated={hydrated}>
      <fieldset className="rounded-lg border border-hairline bg-panel p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Filter the chart</legend>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className={FIELD_LABEL}>
              Cut
              <HelpBubble text="Which parts of the chart to show: everything, washing only, or ironing only." />
            </span>
            <select
              className={FIELD_INPUT}
              value={cut}
              onChange={(event) => setCut(event.target.value as Variant)}
            >
              {variants.map((variant) => (
                <option key={variant} value={variant}>
                  {CUT_LABEL[variant]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className={FIELD_LABEL}>
              Pile
              <HelpBubble
                text={'Type part of a pile’s name, like "towels", to show just that card.'}
              />
            </span>
            <input
              className={FIELD_INPUT}
              type="search"
              placeholder="Search by pile name…"
              value={pileQuery}
              onChange={(event) => setPileQuery(event.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-hairline bg-panel p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Your own chart</legend>
        <p className="text-sm text-body">
          {customInstructions
            ? "Showing your uploaded chart."
            : "Showing the bundled example chart. It's a generic laundry chart, not your own."}
        </p>
        <p className="mt-1 text-xs text-muted">
          To use your own: download the chart below as JSON, edit the rows in a text editor, and
          upload it back. Each row is checked against your machine — an unknown programme,
          temperature or spin is called out by row and column, not silently accepted.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex-1 sm:flex-none">
            <span className={FIELD_LABEL}>
              Upload a chart (JSON)
              <HelpBubble text="Replace the bundled example with your own chart, downloaded from here and edited as JSON." />
            </span>
            <input
              className="mt-1 block w-full text-sm text-body file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-accent/90"
              type="file"
              accept="application/json,.json"
              onChange={handleUpload}
            />
          </label>
          <a className={BUTTON_SECONDARY} href={downloadHref} download="washing-instructions.json">
            Download this chart as JSON
          </a>
          {customInstructions && (
            <button className={BUTTON_SECONDARY} type="button" onClick={handleClear}>
              Use the bundled example instead
            </button>
          )}
        </div>
        {uploadError && (
          <p className={`${ALERT} mt-3`} role="alert">
            Could not use that file: {uploadError}
          </p>
        )}
      </fieldset>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-hairline bg-panel p-6 text-center text-sm text-body">
          No pile matches “{pileQuery}”. Try a different search.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={BUTTON_PRIMARY}
              type="button"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "Preparing PDF…" : "Download this sheet as a PDF"}
            </button>
          </div>
          {downloadError && (
            <p className={ALERT} role="alert">
              Could not generate the PDF: {downloadError}
            </p>
          )}
          <Sheet items={filtered} machine={machine} variant={cut} />
        </>
      )}
    </div>
  );
}

const STEM = "washing-instructions";
const SUFFIX: Record<Variant, string> = { full: "", wash: "-washing", iron: "-ironing" };
