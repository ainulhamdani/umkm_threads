import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { config } from "../src/shared/config";
import { PRODUCT_CATEGORIES } from "../src/shared/categories";
import { normalizeIndonesianPhone, validatePin } from "../src/shared/validation";

type LocationRecord = { code: string; level: "PROVINCE" | "CITY_REGENCY" | "DISTRICT"; name: string; parentCode: string | null };
type LocationDataset = {
  metadata: { sourceUrl: string; snapshotUrl: string; retrievedAt: string; datasetVersion: string; rowCount: number };
  locations: LocationRecord[];
};

const adminPhone = normalizeIndonesianPhone(Bun.env.SUPERADMIN_PHONE);
const adminPinErrors = validatePin(Bun.env.SUPERADMIN_PIN);
if (adminPhone.errors.length || adminPinErrors.length) throw new Error("SUPERADMIN_PHONE atau SUPERADMIN_PIN belum valid.");
const dataset = JSON.parse(await readFile("data/locations.json", "utf8")) as LocationDataset;
if (dataset.locations.length !== dataset.metadata.rowCount) throw new Error("Jumlah baris dataset wilayah tidak cocok dengan metadata.");

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
      "INSERT INTO locations (code, level, name, parent_code, active) VALUES (?, ?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE level = VALUES(level), name = VALUES(name), parent_code = VALUES(parent_code), active = TRUE",
      [location.code, location.level, location.name, location.parentCode],
    );
  }

  const serialized = JSON.stringify({ metadata: dataset.metadata, locations: dataset.locations }, null, 2) + "\n";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  await connection.execute(
    "INSERT INTO location_dataset_metadata (source_url, snapshot_url, retrieved_at, dataset_version, checksum_sha256, row_count, active) VALUES (?, ?, ?, ?, ?, ?, TRUE)",
    [dataset.metadata.sourceUrl, dataset.metadata.snapshotUrl, dataset.metadata.retrievedAt, dataset.metadata.datasetVersion, checksum, dataset.locations.length],
  );

  const pinHash = await Bun.password.hash(Bun.env.SUPERADMIN_PIN as string, { algorithm: "argon2id" });
  await connection.execute(
    "INSERT INTO superadmin_users (phone_e164, pin_hash, status) VALUES (?, ?, 'ACTIVE') ON DUPLICATE KEY UPDATE status = 'ACTIVE'",
    [adminPhone.value, pinHash],
  );
  const [adminRows] = await connection.execute("SELECT id FROM superadmin_users WHERE phone_e164 = ? LIMIT 1", [adminPhone.value]);
  const adminId = (adminRows as Array<{ id: number }>)[0]?.id;
  if (!adminId) throw new Error("Superadmin seed gagal.");
  await connection.execute("INSERT INTO adsense_settings (id, enabled) VALUES (1, FALSE) ON DUPLICATE KEY UPDATE id = id");
  console.log(`Seed selesai: ${PRODUCT_CATEGORIES.length} kategori, ${dataset.locations.length} wilayah.`);
} finally {
  await connection.end();
}

export {};
