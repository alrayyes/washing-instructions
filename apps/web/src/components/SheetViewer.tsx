import {
  type Machine,
  type ResolvedInstruction,
  type Variant,
  variants,
} from "@washy-washy/core/browser";
import { renderPhone } from "@washy-washy/pdf";
import { useEffect, useMemo, useState } from "react";
import { filterByPile } from "../lib/filter";

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
 * The in-browser answer to `bun run generate`'s phone PDF: same chart, same
 * `@react-pdf/renderer` components, same height-bisection pass — just driven
 * by filter controls instead of a filename suffix.
 */
export default function SheetViewer({ items, machine }: Props) {
  const [cut, setCut] = useState<Variant>("full");
  const [pileQuery, setPileQuery] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => filterByPile(items, pileQuery), [items, pileQuery]);

  useEffect(() => {
    if (filtered.length === 0) {
      setPdfUrl(null);
      setRendering(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setRendering(true);
    setError(null);

    renderPhone(filtered, machine, cut)
      .then(({ pdf }) => {
        if (cancelled) return;
        // TS's DOM lib types BlobPart as ArrayBuffer-backed only, while
        // Uint8Array is typed over the wider ArrayBufferLike (which also
        // covers SharedArrayBuffer) — pdf is always a fresh copy from
        // Blob.arrayBuffer(), never shared, so this is a safe narrowing.
        const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
        setPdfUrl(url);
        setRendering(false);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filtered, machine, cut]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const stem = "washing-instructions";
  const suffix = cut === "wash" ? "-washing" : cut === "iron" ? "-ironing" : "";

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

      {error && <p role="alert">Could not render the sheet: {error}</p>}

      {!error && filtered.length === 0 && (
        <p>No pile matches “{pileQuery}”. Try a different search.</p>
      )}

      {!error && filtered.length > 0 && (
        <>
          {rendering && !pdfUrl && <p>Rendering…</p>}
          {pdfUrl && (
            <>
              <p>
                <a href={pdfUrl} download={`${stem}-phone${suffix}.pdf`}>
                  Download this sheet as a PDF
                </a>
              </p>
              <iframe
                title="Washing instructions"
                src={pdfUrl}
                style={{ width: "100%", height: "80vh", border: "none" }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
