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
import Sheet from "./Sheet";

const CUT_LABEL: Record<Variant, string> = {
  full: "Everything",
  wash: "Washing only",
  iron: "Ironing only",
};

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

  // Restored client-side, after the first render — matching the server-
  // rendered default (the bundled chart, no filters) on that first pass
  // avoids a hydration mismatch.
  const restored = useRef(false);
  useEffect(() => {
    const saved = readFilters();
    if (saved) {
      setCut(saved.cut);
      setPileQuery(saved.pileQuery);
    }
    setCustomInstructions(readCustomChart(machine));
    restored.current = true;
  }, [machine]);

  useEffect(() => {
    // Skipped on the mount render: without this, restoring a saved filter
    // above would immediately be overwritten by writing back the still-
    // default state from this same effect.
    if (!restored.current) return;
    writeFilters({ cut, pileQuery });
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
    <div>
      <fieldset>
        <legend>Filter the chart</legend>
        <label>
          Cut{" "}
          <select value={cut} onChange={(event) => setCut(event.target.value as Variant)}>
            {variants.map((variant) => (
              <option key={variant} value={variant}>
                {CUT_LABEL[variant]}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Pile{" "}
          <input
            type="search"
            placeholder="Search by pile name…"
            value={pileQuery}
            onChange={(event) => setPileQuery(event.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Your own chart</legend>
        <p>
          {customInstructions
            ? "Showing your uploaded chart."
            : "Showing the bundled example chart."}
        </p>
        <label>
          Upload a chart (JSON){" "}
          <input type="file" accept="application/json,.json" onChange={handleUpload} />
        </label>{" "}
        <a href={downloadHref} download="washing-instructions.json">
          Download this chart as JSON
        </a>
        {customInstructions && (
          <>
            {" "}
            <button type="button" onClick={handleClear}>
              Use the bundled example instead
            </button>
          </>
        )}
        {uploadError && <p role="alert">Could not use that file: {uploadError}</p>}
      </fieldset>

      {filtered.length === 0 ? (
        <p>No pile matches “{pileQuery}”. Try a different search.</p>
      ) : (
        <>
          <p>
            <button type="button" onClick={handleDownload} disabled={downloading}>
              {downloading ? "Preparing PDF…" : "Download this sheet as a PDF"}
            </button>
          </p>
          {downloadError && <p role="alert">Could not generate the PDF: {downloadError}</p>}
          <Sheet items={filtered} machine={machine} variant={cut} />
        </>
      )}
    </div>
  );
}

const STEM = "washing-instructions";
const SUFFIX: Record<Variant, string> = { full: "", wash: "-washing", iron: "-ironing" };
