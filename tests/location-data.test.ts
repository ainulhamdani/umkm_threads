import { describe, expect, test } from "bun:test";

type LocationRecord = { code: string; level: "PROVINCE" | "CITY_REGENCY" | "DISTRICT"; name: string; parentCode: string | null };
type LocationDataset = { metadata: { sourceUrl: string; retrievedAt: string; datasetVersion: string; rowCount: number; checksumSha256: string }; locations: LocationRecord[] };

const dataset = await Bun.file("data/locations.json").json() as LocationDataset;

describe("snapshot wilayah Indonesia", () => {
  test("memiliki metadata, checksum, dan jumlah baris yang cocok", async () => {
    expect(dataset.metadata.sourceUrl).toStartWith("https://");
    expect(dataset.metadata.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dataset.metadata.datasetVersion.length).toBeGreaterThan(0);
    expect(dataset.locations.length).toBe(dataset.metadata.rowCount);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(dataset.locations)));
    const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    expect(checksum).toBe(dataset.metadata.checksumSha256);
  });

  test("tidak memiliki kode duplikat atau relasi induk yatim", () => {
    const byCode = new Map(dataset.locations.map((location) => [location.code, location]));
    expect(byCode.size).toBe(dataset.locations.length);
    for (const location of dataset.locations) {
      if (location.level === "PROVINCE") expect(location.parentCode).toBeNull();
      if (location.level === "CITY_REGENCY") expect(byCode.get(location.parentCode ?? "")?.level).toBe("PROVINCE");
      if (location.level === "DISTRICT") expect(byCode.get(location.parentCode ?? "")?.level).toBe("CITY_REGENCY");
      expect(location.name.trim().length).toBeGreaterThan(0);
    }
  });
});
