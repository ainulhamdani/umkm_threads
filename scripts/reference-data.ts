import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { PRODUCT_CATEGORIES } from "../src/shared/categories";
import { validateText } from "../src/shared/validation";

type LocationRecord = { code: string; level: "PROVINCE" | "CITY_REGENCY" | "DISTRICT"; name: string; parentCode: string | null };
type LocationDataset = {
  metadata: { sourceUrl: string; snapshotUrl: string; retrievedAt: string; datasetVersion: string; rowCount: number; checksumSha256: string };
  locations: LocationRecord[];
};

async function loadLocationDataset(): Promise<LocationDataset> {
  const dataset = JSON.parse(await readFile("data/locations.json", "utf8")) as LocationDataset;
  if (dataset.locations.length !== dataset.metadata.rowCount) throw new Error("Jumlah baris dataset wilayah tidak cocok dengan metadata.");
  if (!/^https:\/\//.test(dataset.metadata.sourceUrl) || !dataset.metadata.retrievedAt || !dataset.metadata.datasetVersion || !/^[a-f0-9]{64}$/.test(dataset.metadata.checksumSha256)) throw new Error("Metadata dataset wilayah belum lengkap.");
  const locationDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(dataset.locations)));
  const locationChecksum = Array.from(new Uint8Array(locationDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (locationChecksum !== dataset.metadata.checksumSha256) throw new Error("Checksum dataset wilayah tidak cocok.");
  const levelByCode = new Map<string, LocationRecord["level"]>();
  for (const location of dataset.locations) {
    if (levelByCode.has(location.code)) throw new Error("Dataset wilayah memiliki kode duplikat.");
    if (location.level !== "PROVINCE" && location.level !== "CITY_REGENCY" && location.level !== "DISTRICT") throw new Error("Dataset wilayah memiliki tingkat yang tidak valid.");
    levelByCode.set(location.code, location.level);
  }
  for (const location of dataset.locations) {
    const expectedParentLevel = location.level === "CITY_REGENCY" ? "PROVINCE" : location.level === "DISTRICT" ? "CITY_REGENCY" : null;
    if (expectedParentLevel === null) {
      if (location.parentCode !== null) throw new Error("Provinsi tidak boleh memiliki induk wilayah.");
    } else if (!location.parentCode || levelByCode.get(location.parentCode) !== expectedParentLevel) {
      throw new Error("Dataset wilayah memiliki hubungan induk-anak yang tidak valid.");
    }
  }
  return dataset;
}

export async function seedReferenceData(connection: mysql.Connection): Promise<void> {
  const dataset = await loadLocationDataset();
  const categoryPlaceholders = PRODUCT_CATEGORIES.map(() => "?").join(", ");
  await connection.beginTransaction();
  try {
    await connection.execute(`UPDATE product_categories SET active = FALSE WHERE code NOT IN (${categoryPlaceholders})`, PRODUCT_CATEGORIES.map((category) => category.code));
    for (const category of PRODUCT_CATEGORIES) {
      await connection.execute(
        "INSERT INTO product_categories (code, label, display_order, active) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE label = VALUES(label), display_order = VALUES(display_order), active = TRUE",
        [category.code, category.label, category.displayOrder],
      );
    }

    await connection.execute("UPDATE locations SET active = FALSE");
    for (const location of dataset.locations) {
      await connection.execute(
        "INSERT INTO locations (code, level, name, parent_code, dataset_version, active) VALUES (?, ?, ?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE level = VALUES(level), name = VALUES(name), parent_code = VALUES(parent_code), dataset_version = VALUES(dataset_version), active = TRUE",
        [location.code, location.level, location.name, location.parentCode, dataset.metadata.datasetVersion],
      );
    }

    await connection.execute("UPDATE location_dataset_metadata SET active = FALSE WHERE active = TRUE");
    await connection.execute(
      "INSERT INTO location_dataset_metadata (source_url, snapshot_url, retrieved_at, dataset_version, checksum_sha256, row_count, active) VALUES (?, ?, ?, ?, ?, ?, TRUE)",
      [dataset.metadata.sourceUrl, dataset.metadata.snapshotUrl, dataset.metadata.retrievedAt, dataset.metadata.datasetVersion, dataset.metadata.checksumSha256, dataset.locations.length],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export function validateSeedPassword(password: string): void {
  if (validateText(password, "SUPERADMIN_PASSWORD", 12, 255).length > 0) throw new Error("SUPERADMIN_PASSWORD belum valid.");
}
