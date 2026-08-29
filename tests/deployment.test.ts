import { describe, expect, test } from "bun:test";

const dockerfile = await Bun.file("Dockerfile").text();
const dockerIgnore = await Bun.file(".dockerignore").text();
const captainDefinition = JSON.parse(await Bun.file("captain-definition").text()) as { schemaVersion: number; dockerfilePath: string };

describe("CapRover deployment", () => {
  test("uses a pinned Bun multi-stage production image", () => {
    expect(dockerfile).toContain("FROM oven/bun:1.4.0-slim AS base");
    expect(dockerfile).toContain("FROM base AS dependencies");
    expect(dockerfile).toContain("FROM base AS build");
    expect(dockerfile).toContain("FROM base AS production");
    expect(dockerfile).toContain("RUN bun install --frozen-lockfile --production");
    expect(dockerfile).toContain("RUN bun run build:client");
    expect(dockerfile).toContain("ENV PORT=80");
    expect(dockerfile).toContain("ENV UPLOAD_DIR=/data/uploads");
    expect(dockerfile).toContain("USER bun");
    expect(dockerfile).toContain("EXPOSE 80");
    expect(dockerfile).toContain('CMD ["bun", "run", "server"]');
  });

  test("keeps database setup assets in the runtime image", () => {
    expect(dockerfile).toContain("COPY --from=build /app/data ./data");
    expect(dockerfile).toContain("COPY --from=build /app/scripts/migrate.ts ./scripts/migrate.ts");
    expect(dockerfile).toContain("COPY --from=build /app/scripts/seed.ts ./scripts/seed.ts");
    expect(dockerfile).toContain("COPY --from=build /app/sql ./sql");
  });

  test("has a valid CapRover definition and excludes local-only files", () => {
    expect(captainDefinition).toEqual({ schemaVersion: 2, dockerfilePath: "./Dockerfile" });
    expect(dockerIgnore).toContain(".env");
    expect(dockerIgnore).toContain("node_modules/");
    expect(dockerIgnore).toContain("public/assets/");
    expect(dockerIgnore).toContain("storage/uploads/");
  });
});
