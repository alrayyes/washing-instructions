import { describe, expect, test } from "bun:test";

const SHEET_VIEWER = "apps/web/src/components/SheetViewer.tsx";

describe("SheetViewer", () => {
  test("does not statically import @washy-washy/pdf", async () => {
    const source = await Bun.file(SHEET_VIEWER).text();

    // A static `import ... from "@washy-washy/pdf"` ships @react-pdf/renderer
    // and pdf-lib in the page's main chunk even though nothing needs them
    // until the download button is clicked. Only a dynamic import() lets a
    // bundler split that weight into its own chunk, loaded on demand.
    expect(source).not.toMatch(/^import\s[^;]*from\s+["']@washy-washy\/pdf["']/m);
  });

  test("loads @washy-washy/pdf dynamically instead", async () => {
    const source = await Bun.file(SHEET_VIEWER).text();

    expect(source).toMatch(/import\(\s*["']@washy-washy\/pdf["']\s*\)/);
  });
});
