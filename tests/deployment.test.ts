import { describe, expect, test } from "bun:test";

const dockerfile = await Bun.file("Dockerfile").text();
const dockerIgnore = await Bun.file(".dockerignore").text();
const captainDefinition = JSON.parse(await Bun.file("captain-definition").text()) as { schemaVersion: number; dockerfilePath: string };
const entrypoint = await Bun.file("docker-entrypoint.sh").text();
const attributes = await Bun.file(".gitattributes").text();
const packageJson = JSON.parse(await Bun.file("package.json").text()) as { devDependencies?: Record<string, string> };
const clientBuild = await Bun.file("scripts/build-client.ts").text();
const styleSource = await Bun.file("src/client/styles.css").text();

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
    expect(dockerfile).toContain('ENTRYPOINT ["/app/docker-entrypoint.sh"]');
  });

  test("runs migrations before serving the application", () => {
    expect(entrypoint).toContain("bun run db:migrate");
    expect(entrypoint).toContain("exec bun run server");
    expect(entrypoint.startsWith("#!/bin/sh\n")).toBe(true);
    expect(attributes).toContain("*.sh text eol=lf");
  });

  test("compiles the Tailwind stylesheet during the client build", () => {
    expect(packageJson.devDependencies?.tailwindcss).toBeDefined();
    expect(packageJson.devDependencies?.["@tailwindcss/cli"]).toBeDefined();
    expect(clientBuild).toContain('"@tailwindcss/cli"');
    expect(clientBuild).toContain('"src/client/styles.css"');
    expect(clientBuild).toContain('"public/styles.css"');
    expect(styleSource).toContain('@import "tailwindcss";');
  });

  test("keeps database setup assets in the runtime image", () => {
    expect(dockerfile).toContain("COPY --from=build /app/data ./data");
    expect(dockerfile).toContain("COPY --from=build /app/scripts/migrate.ts ./scripts/migrate.ts");
    expect(dockerfile).toContain("COPY --from=build /app/scripts/reference-data.ts ./scripts/reference-data.ts");
    expect(dockerfile).toContain("COPY --from=build /app/scripts/seed.ts ./scripts/seed.ts");
    expect(dockerfile).toContain("COPY --from=build /app/sql ./sql");
  });

  test("synchronizes reference data during migration", async () => {
    const migration = await Bun.file("scripts/migrate.ts").text();
    const referenceData = await Bun.file("scripts/reference-data.ts").text();
    expect(migration).toContain("await seedReferenceData(connection)");
    expect(referenceData).toContain("await connection.beginTransaction()");
    expect(referenceData).toContain("await connection.commit()");
    expect(referenceData).toContain("await connection.rollback()");
  });

  test("has a valid CapRover definition and excludes local-only files", () => {
    expect(captainDefinition).toEqual({ schemaVersion: 2, dockerfilePath: "./Dockerfile" });
    expect(dockerIgnore).toContain(".env");
    expect(dockerIgnore).toContain("node_modules/");
    expect(dockerIgnore).toContain("public/assets/");
    expect(dockerIgnore).toContain("storage/uploads/");
  });
});
