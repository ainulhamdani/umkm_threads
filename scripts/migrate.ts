import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { readdir } from "node:fs/promises";
import { config } from "../src/shared/config";

function quoteIdentifier(value: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error("Nama database tidak valid.");
  return `\`${value}\``;
}

const connection = await mysql.createConnection({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  multipleStatements: false,
});

try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.db.name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.changeUser({ database: config.db.name });
  const migrationFiles = (await readdir("sql"))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  for (const file of migrationFiles) {
    const sql = await Bun.file(`sql/${file}`).text();
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
      await connection.query(statement);
    }
  }
  await migrateLegacySuperadmin(connection);
  console.log(`Migrasi database ${config.db.name} selesai.`);
} finally {
  await connection.end();
}

export {};

async function migrateLegacySuperadmin(connection: mysql.Connection): Promise<void> {
  const [columns] = await connection.query<(RowDataPacket & { COLUMN_NAME: string })[]>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'superadmin_users'");
  const names = new Set(columns.map((column) => column.COLUMN_NAME));
  if (names.has("phone_e164") && names.has("pin_hash")) {
    const [rows] = await connection.query<(RowDataPacket & { id: number; pin_hash: string })[]>("SELECT id, pin_hash FROM superadmin_users WHERE email IS NULL");
    for (const row of rows) await connection.execute("UPDATE superadmin_users SET email = ?, password_hash = ? WHERE id = ?", [`legacy-${row.id}@invalid.local`, row.pin_hash, row.id]);
    await connection.query("UPDATE superadmin_users SET status = 'DISABLED' WHERE status = 'SUSPENDED'");
  }
  await connection.query("ALTER TABLE superadmin_users MODIFY email VARCHAR(255) NOT NULL");
  await connection.query("ALTER TABLE superadmin_users MODIFY password_hash VARCHAR(255) NOT NULL");
  await connection.query("ALTER TABLE superadmin_users MODIFY status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE'");
  await connection.query("ALTER TABLE superadmin_users ADD UNIQUE INDEX IF NOT EXISTS uq_superadmin_email (email)");
  await connection.query("ALTER TABLE superadmin_users DROP INDEX IF EXISTS uq_superadmin_phone");
  await connection.query("ALTER TABLE superadmin_users DROP COLUMN IF EXISTS phone_e164");
  await connection.query("ALTER TABLE superadmin_users DROP COLUMN IF EXISTS pin_hash");
  await connection.query("ALTER TABLE superadmin_users DROP COLUMN IF EXISTS pin_reset_required");
}
