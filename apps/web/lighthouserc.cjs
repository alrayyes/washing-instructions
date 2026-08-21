/**
 * Category-score gates, not the `lighthouse:recommended` preset's few
 * hundred per-audit assertions — those fire on things unrelated to what
 * this site actually needs (PWA install prompts, HTTP/2 push, service
 * workers) and turn red for reasons nobody here would act on. Performance
 * is a warning, not a hard gate: a CI runner's CPU is not Cloudflare's edge,
 * and a slower runner one day shouldn't block a merge over noise. The other
 * three are deterministic properties of the markup and config, unaffected
 * by runner speed, so they gate for real.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "bun run build && bun scripts/serve-dist.ts",
      startServerReadyPattern: "Serving",
      startServerReadyTimeout: 60_000,
      url: ["http://localhost:4321/"],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
