# Security

This is a program that draws laundry charts. It reads two files you wrote, runs
no server, opens no socket, and sends nothing anywhere. The realistic worst case
is a PDF that tells you to wash something at the wrong temperature, which is
covered by [opening an issue](https://github.com/alrayyes/washy-washy-cli/issues)
rather than by a private disclosure.

That said, it does run input you did not write through a PDF renderer and a CSV
parser, and it downloads pinned tooling over the network at install time. If you
find something that matters — a crafted chart or machine file that escapes the
renderer, a problem in the way `scripts/install-vale.ts` fetches and
verifies its binary — report it privately through
[GitHub's security advisories](https://github.com/alrayyes/washy-washy-cli/security/advisories/new)
rather than in a public issue, and I will look at it.

Only the latest commit on `main` is supported. There is no release old enough to
need a backport.
