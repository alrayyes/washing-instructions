// Static output: Cloudflare Pages serves the built `dist/` directory
// directly, with no adapter or SSR runtime needed. The filtered sheet
// rendering (ticket #44) runs client-side, as an island — the site itself
// stays plain HTML/JS.
//
// `site` is unset until the Cloudflare Pages project exists and its real
// URL (or a custom domain) is known — it only affects canonical links and
// the sitemap, not the build itself.
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  // The sheet viewer (#44) is a React island — the same @react-pdf/renderer
  // components src/documents.tsx uses, running client-side.
  integrations: [react()],
});
