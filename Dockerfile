# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0-slim AS base

WORKDIR /app

# Avoid writing Bun's transpiler cache into the container filesystem.
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0

FROM base AS dependencies

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS build

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY data ./data
COPY docker-entrypoint.sh ./docker-entrypoint.sh
COPY public ./public
COPY scripts ./scripts
COPY sql ./sql
COPY src ./src

RUN bun run build:client

FROM base AS production

ENV NODE_ENV=production
ENV PORT=80
ENV UPLOAD_DIR=/data/uploads

COPY package.json ./package.json
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/data ./data
COPY --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=build /app/public ./public
COPY --from=build /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --from=build /app/scripts/reference-data.ts ./scripts/reference-data.ts
COPY --from=build /app/scripts/seed.ts ./scripts/seed.ts
COPY --from=build /app/sql ./sql
COPY --from=build /app/src/server ./src/server
COPY --from=build /app/src/shared ./src/shared

RUN mkdir -p /data/uploads \
  && chmod 755 /app/docker-entrypoint.sh \
  && chown -R bun:bun /app /data

USER bun

EXPOSE 80

ENTRYPOINT ["/app/docker-entrypoint.sh"]
