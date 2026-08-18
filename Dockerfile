# Runs the generator without a bun on the host: mount a chart in, get PDFs out.
#
# Alpine, unlike the CI images, which need glibc for the prose linters. Nothing
# in the generator is a native binary — it is TypeScript, bun and four pure-JS
# packages — so musl is no obstacle and the image stays small.

# Dependencies in their own stage, so the runtime image never sees a lockfile,
# a dev dependency or a package manager. --production drops Biome, Prettier,
# Vale and the rest: none of them have anything to do with drawing a PDF.
FROM oven/bun:1.3.14-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0 AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
COPY packages/core/package.json ./packages/core/package.json
# apps/web has to be here too — bun checks every workspace manifest against
# the lockfile before it will honour --frozen-lockfile, even one this image
# never uses. --filter is what keeps its dependencies (Astro, its language
# server) out of the image itself.
COPY apps/web/package.json ./apps/web/package.json
RUN bun install --frozen-lockfile --production --ignore-scripts --filter='!@washy-washy/web'

FROM oven/bun:1.3.14-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0 AS runtime

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY packages ./packages
# The committed dummy chart and the committed example appliances, so
# `docker run` with nothing mounted still produces something to look at. Your
# own versions of both are gitignored and never in the image; mount them over
# the top.
COPY data/washing-instructions.csv.dist data/machine.json.dist ./data/

# /out is the mount point, and it is created here rather than by the first run
# so that it belongs to the unprivileged user. The oven/bun images ship a `bun`
# user at 1000:1000 for exactly this; nothing in here needs root.
#
# Numeric rather than `bun`, because a name only means something to this image:
# an orchestrator checking that the container is not root, or a host matching
# ownership on the mount, has nothing to resolve it against.
RUN mkdir -p /out && chown 1000:1000 /out
USER 1000:1000
VOLUME /out

# Split so that `docker run <image>` generates from the bundled chart, and
# arguments after the image name are passed straight to the CLI:
#   docker run -v "$PWD/out:/out" <image> data/my-laundry.csv
ENTRYPOINT ["bun", "run", "src/cli.ts", "--out", "/out"]
CMD []
