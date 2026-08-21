/**
 * A minimal static file server over `dist/`, for the end-to-end suite.
 *
 * `astro preview` can't be used here: it always daemonizes and the invoking
 * process exits immediately once the daemon is up (or already running),
 * which Playwright's `webServer` reads as a crash — it expects the command
 * to keep running in the foreground. `apps/web` is genuinely static, so a
 * plain file server is also the more honest test: it's what Cloudflare
 * actually serves, not an Astro-specific dev tool standing in for it.
 */
const DIST = new URL("../dist/", import.meta.url);
const PORT = 4321;

/**
 * Astro's static build writes every page beyond the root as
 * `<route>/index.html` (its default `directory` build format) — the same
 * shape Cloudflare's own static-asset serving resolves a bare `/config` to.
 * A single page never exercised this: only `/` existed until `/config`
 * (#73), and the root's `index.html` was handled as a special case that
 * didn't generalise to a second route.
 */
async function resolve(pathname: string) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const direct = Bun.file(new URL(relative, DIST));
  if (await direct.exists()) return direct;
  const indexed = Bun.file(new URL(`${relative.replace(/\/+$/, "")}/index.html`, DIST));
  if (await indexed.exists()) return indexed;
  return null;
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const file = await resolve(url.pathname);
    if (file) return new Response(file);
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Serving ${DIST.pathname} on http://localhost:${PORT}`);
