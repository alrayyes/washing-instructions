import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a real static build (`astro build`, served by
 * scripts/serve-dist.ts), not `astro dev` or `astro preview` — `apps/web`
 * ships as a static site with no server, and both of Astro's own dev tools
 * run as a background daemon that exits immediately once started, which
 * Playwright's `webServer` reads as a crash rather than a running server.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run build && bun scripts/serve-dist.ts",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
