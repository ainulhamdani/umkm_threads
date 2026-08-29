import mysql from "mysql2/promise";
import { config } from "../src/shared/config";
import { seedReferenceData, validateSeedPassword } from "./reference-data";

const adminEmail = Bun.env.SUPERADMIN_EMAIL?.trim().toLowerCase() ?? "";
const adminPassword = Bun.env.SUPERADMIN_PASSWORD ?? "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error("SUPERADMIN_EMAIL belum valid.");
validateSeedPassword(adminPassword);

const connection = await mysql.createConnection({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
});

try {
  await seedReferenceData(connection);

  const passwordHash = await Bun.password.hash(adminPassword, { algorithm: "argon2id" });
  const [adminRows] = await connection.execute("SELECT id FROM superadmin_users ORDER BY id ASC LIMIT 1");
  const adminId = (adminRows as Array<{ id: number }>)[0]?.id;
  if (adminId) await connection.execute("UPDATE superadmin_users SET email = ?, password_hash = ?, status = 'ACTIVE' WHERE id = ?", [adminEmail, passwordHash, adminId]);
  else await connection.execute("INSERT INTO superadmin_users (email, password_hash, status) VALUES (?, ?, 'ACTIVE')", [adminEmail, passwordHash]);
  const [seededRows] = await connection.execute("SELECT id FROM superadmin_users WHERE email = ? LIMIT 1", [adminEmail]);
  const seededAdminId = (seededRows as Array<{ id: number }>)[0]?.id;
  if (!seededAdminId) throw new Error("Superadmin seed gagal.");
  await connection.execute("INSERT INTO adsense_settings (id, enabled) VALUES (1, FALSE) ON DUPLICATE KEY UPDATE id = id");
  console.log("Seed superadmin selesai.");
} finally {
  await connection.end();
}

export {};
