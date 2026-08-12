// The plugin ships no types and DefinitelyTyped has no package for it, so the
// shape the one test using it depends on is declared here rather than pulled in
// as another dependency. It is deliberately narrow: only the call that test
// makes, not an attempt at the plugin's full surface.
declare module "@semantic-release/release-notes-generator" {
  interface Commit {
    hash: string;
    message: string;
  }

  interface Release {
    version: string;
    gitTag: string;
    type?: string;
  }

  interface Context {
    commits: Commit[];
    lastRelease: Release;
    nextRelease: Release;
    options: { repositoryUrl: string };
    cwd: string;
    env: Record<string, string>;
    logger: { log: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  }

  export function generateNotes(
    pluginConfig: Record<string, unknown>,
    context: Context,
  ): Promise<string>;
}
