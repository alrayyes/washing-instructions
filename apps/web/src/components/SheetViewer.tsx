import {
  type Machine,
  type ResolvedInstruction,
  type Variant,
  variants,
} from "@washy-washy/core/browser";
import { renderPhone } from "@washy-washy/pdf";
import { useMemo, useState } from "react";
import { filterByPile } from "../lib/filter";
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
 * cut and pile instead of a filename suffix. The PDF itself — the same
 * `renderPhone` the CLI uses — is only ever generated when the download
 * button is clicked, not on every filter change.
 */
export default function SheetViewer({ items, machine }: Props) {
  const [cut, setCut] = useState<Variant>("full");
  const [pileQuery, setPileQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filtered = useMemo(() => filterByPile(items, pileQuery), [items, pileQuery]);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
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
