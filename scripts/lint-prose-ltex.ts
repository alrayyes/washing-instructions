/**
 * Runs ltex-cli-plus over the repo's prose, both from `pre-push` and from
 * CI's `ltex` job — the same script, so the two cannot drift.
 *
 * Installs into `$XDG_CACHE_HOME` (falling back to `~/.cache`), not
 * `.tools/`: the release is a ~300 MB archive shipping its own Java 21
 * runtime, too heavy to fetch fresh on every push the way `.tools/vale` does
 * for its own single binary. Once cached, a run over a handful of documents
 * is about ten seconds. CI gets the same benefit from `actions/cache`
 * wrapping this same directory, keyed on the pinned version below.
 */
import { mkdir } from "node:fs/promises";

const LTEX_VERSION = "18.7.0";
const DOCS = ["README.md", "CONTRIBUTING.md", "CLAUDE.md", "SECURITY.md"];

const cacheRoot = process.env.XDG_CACHE_HOME ?? `${process.env.HOME}/.cache`;
const installRoot = `${cacheRoot}/ltex`;
const releaseDir = `${installRoot}/ltex-ls-plus-${LTEX_VERSION}`;
const binary = `${releaseDir}/bin/ltex-cli-plus`;

async function install(): Promise<void> {
  if (await Bun.file(binary).exists()) return;

  await mkdir(installRoot, { recursive: true });
  const asset = `ltex-ls-plus-${LTEX_VERSION}-linux-x64.tar.gz`;
  const url = `https://github.com/ltex-plus/ltex-ls-plus/releases/download/${LTEX_VERSION}/${asset}`;
  console.log(`fetching ${url}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} → ${response.status} ${response.statusText}`);
  const archivePath = `${installRoot}/${asset}`;
  await Bun.write(archivePath, await response.bytes());

  const untar = Bun.spawnSync(["tar", "xzf", asset], { cwd: installRoot });
  if (!untar.success) throw new Error(`tar failed: ${untar.stderr.toString().trim()}`);
  await Bun.file(archivePath).delete();
}

await install();

// The release carries its own Java 21, but the launcher is a Gradle start
// script and prefers JAVA_HOME — which a caller's shell may have pointed at
// an older JDK. The class files are version 65, which anything older than 21
// cannot load, so point JAVA_HOME at the runtime that shipped beside it.
const jdkGlob = new Bun.Glob("jdk-*");
const jdkDirs = await Array.fromAsync(jdkGlob.scan({ cwd: releaseDir, onlyFiles: false }));
const jdkDir = jdkDirs[0];
if (!jdkDir) throw new Error(`no jdk-* directory found under ${releaseDir}`);

// It reports findings with exit code 3, not 1, so a step testing for a
// specific code would pass a failing document. Let the shell judge non-zero.
// The files are named rather than passing `.`: LTeX traverses recursively
// and reads plain text as prose, so a bare dot lints the committed Vale
// vocabulary as though it were a document.
const result = Bun.spawnSync([binary, "--client-configuration=.ltex.json", ...DOCS], {
  env: { ...process.env, JAVA_HOME: `${releaseDir}/${jdkDir}` },
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(result.exitCode ?? 1);
