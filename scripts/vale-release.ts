/**
 * Where Vale comes from. Pinned here rather than in package.json because the
 * npm wrapper (@vvago/vale) downloads its binary from a postinstall that runs
 * `node index.js` — and the CI image has bun and no node, so it installs a
 * package with an empty bin directory and nothing says so until the linter is
 * called and the shell reports 127.
 */
export const VALE_VERSION = "3.17.1";

const ARCHIVES: Record<string, string> = {
  "linux-x64": "Linux_64-bit",
  "linux-arm64": "Linux_arm64",
  "darwin-x64": "macOS_64-bit",
  "darwin-arm64": "macOS_arm64",
};

/** The release asset for a platform, as `process.platform` and `process.arch` name it. */
export function valeAsset(platform: string, arch: string): string {
  const archive = ARCHIVES[`${platform}-${arch}`];
  if (!archive) {
    throw new Error(
      `No Vale release for ${platform}-${arch}. Install Vale yourself and put it on PATH as .tools/vale.`,
    );
  }
  return `vale_${VALE_VERSION}_${archive}.tar.gz`;
}

export function releaseUrl(asset: string): string {
  return `https://github.com/vale-cli/vale/releases/download/v${VALE_VERSION}/${asset}`;
}

export const CHECKSUMS_URL = releaseUrl(`vale_${VALE_VERSION}_checksums.txt`);
