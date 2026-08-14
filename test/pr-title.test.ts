import { describe, expect, test } from "bun:test";

/**
 * Merges here are squashes, so the pull request title is what lands on `main`
 * and the branch commits become the body. The `commits` job lints the branch,
 * which is exactly the half that gets thrown away.
 *
 * That is not hypothetical. #22 was a `feat:` on the branch, went green, and
 * landed as "Cut the chart into a washing sheet and an ironing sheet (#22)" —
 * no type, so semantic-release found nothing releasable and skipped the version
 * without failing. This pins the behaviour the `pr-title` job depends on.
 *
 * It shells out rather than importing commitlint, so it runs the command CI
 * runs. Importing `@commitlint/lint` would test a different thing and add two
 * dependencies to do it.
 */
function lint(title: string): { ok: boolean; output: string } {
  const result = Bun.spawnSync({
    cmd: ["bunx", "--bun", "commitlint"],
    stdin: Buffer.from(`${title}\n`),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    ok: result.exitCode === 0,
    output: result.stdout.toString() + result.stderr.toString(),
  };
}

describe("commitlint over a pull request title", () => {
  test("refuses the title that cost a release", () => {
    const { ok, output } = lint("Cut the chart into a washing sheet and an ironing sheet");
    expect(ok).toBe(false);
    expect(output).toContain("type-empty");
  });

  test("refuses a type that is not one of ours", () => {
    expect(lint("wip: half a thought").ok).toBe(false);
  });

  test("takes the titles this repo actually uses", () => {
    for (const title of [
      "feat: cut the chart into a washing sheet and an ironing sheet",
      "fix: stop the no-iron card repeating itself down the page",
      "docs: show how to get the machine file out of a photo",
      "chore(release): 2.1.0",
    ]) {
      expect(lint(title).ok, title).toBe(true);
    }
  });

  /** A major is cut off the `!`, so the marker has to survive the linter. */
  test("takes a breaking change marked with a bang", () => {
    expect(lint("feat!: make ironing a boolean rather than a sentence to parse").ok).toBe(true);
  });
});
