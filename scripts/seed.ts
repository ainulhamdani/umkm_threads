import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { config } from "../src/shared/config";
import { PRODUCT_CATEGORIES } from "../src/shared/categories";
import { validateText } from "../src/shared/validation";

type LocationRecord = { code: string; level: "PROVINCE" | "CITY_REGENCY" | "DISTRICT"; name: string; parentCode: string | null };
type LocationDataset = {
  metadata: { sourceUrl: string; snapshotUrl: string; retrievedAt: string; datasetVersion: string; rowCount: number; checksumSha256: string };
  locations: LocationRecord[];
};

const adminEmail = Bun.env.SUPERADMIN_EMAIL?.trim().toLowerCase() ?? "";
const adminPassword = Bun.env.SUPERADMIN_PASSWORD ?? "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || validateText(adminPassword, "SUPERADMIN_PASSWORD", 12, 255).length > 0) throw new Error("SUPERADMIN_EMAIL atau SUPERADMIN_PASSWORD belum valid.");
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

const connection = await mysql.createConnection({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
});

try {
  for (const category of PRODUCT_CATEGORIES) {
    await connection.execute(
      "INSERT INTO product_categories (code, label, display_order, active) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE label = VALUES(label), display_order = VALUES(display_order), active = TRUE",
      [category.code, category.label, category.displayOrder],
    );
  }

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

  const passwordHash = await Bun.password.hash(adminPassword, { algorithm: "argon2id" });
  const [adminRows] = await connection.execute("SELECT id FROM superadmin_users ORDER BY id ASC LIMIT 1");
  const adminId = (adminRows as Array<{ id: number }>)[0]?.id;
  if (adminId) await connection.execute("UPDATE superadmin_users SET email = ?, password_hash = ?, status = 'ACTIVE' WHERE id = ?", [adminEmail, passwordHash, adminId]);
  else await connection.execute("INSERT INTO superadmin_users (email, password_hash, status) VALUES (?, ?, 'ACTIVE')", [adminEmail, passwordHash]);
  const [seededRows] = await connection.execute("SELECT id FROM superadmin_users WHERE email = ? LIMIT 1", [adminEmail]);
  const seededAdminId = (seededRows as Array<{ id: number }>)[0]?.id;
  if (!seededAdminId) throw new Error("Superadmin seed gagal.");
  await connection.execute("INSERT INTO adsense_settings (id, enabled) VALUES (1, FALSE) ON DUPLICATE KEY UPDATE id = id");
  console.log(`Seed selesai: ${PRODUCT_CATEGORIES.length} kategori, ${dataset.locations.length} wilayah.`);
} finally {
  await connection.end();
}

export {};
