// Static output: Cloudflare Workers serves the built `dist/` directory
// directly as static assets (apps/web/wrangler.jsonc), with no adapter or
// SSR runtime needed. The filtered sheet rendering (ticket #44) runs
// client-side, as an island — the site itself stays plain HTML/JS.
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://washy-washy.ryankes.eu",
  output: "static",
  // The sheet viewer (#44) is a React island — the same @react-pdf/renderer
  // components src/documents.tsx uses, running client-side.
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
