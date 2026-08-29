import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { readdir } from "node:fs/promises";
import { config } from "../src/shared/config";
import { seedReferenceData } from "./reference-data";

function quoteIdentifier(value: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error("Nama database tidak valid.");
  return `\`${value}\``;
}

async function columnExists(connection: mysql.Connection, tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function indexExists(connection: mysql.Connection, tableName: string, indexName: string): Promise<boolean> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    [tableName, indexName],
  );
  return rows.length > 0;
}

async function executeCompatibleStatement(connection: mysql.Connection, statement: string): Promise<void> {
  const normalized = statement.replace(/\s+/g, " ").trim();
  const addColumn = normalized.match(/^ALTER TABLE ([a-zA-Z0-9_]+) ADD COLUMN IF NOT EXISTS ([a-zA-Z0-9_]+)/i);
  if (addColumn) {
    const tableName = addColumn[1];
    const columnName = addColumn[2];
    if (!tableName || !columnName) throw new Error("Pernyataan migrasi kolom tidak valid.");
    if (!(await columnExists(connection, tableName, columnName))) {
      await connection.query(normalized.replace(/ ADD COLUMN IF NOT EXISTS /i, " ADD COLUMN "));
    }
    return;
  }

  const addIndex = normalized.match(/^ALTER TABLE ([a-zA-Z0-9_]+) ADD (?:UNIQUE )?INDEX IF NOT EXISTS ([a-zA-Z0-9_]+)/i);
  if (addIndex) {
    const tableName = addIndex[1];
    const indexName = addIndex[2];
    if (!tableName || !indexName) throw new Error("Pernyataan migrasi indeks tidak valid.");
    if (!(await indexExists(connection, tableName, indexName))) {
      await connection.query(normalized.replace(/ INDEX IF NOT EXISTS /i, " INDEX "));
    }
    return;
  }

  const dropColumn = normalized.match(/^ALTER TABLE ([a-zA-Z0-9_]+) DROP COLUMN IF EXISTS ([a-zA-Z0-9_]+)$/i);
  if (dropColumn) {
    const tableName = dropColumn[1];
    const columnName = dropColumn[2];
    if (!tableName || !columnName) throw new Error("Pernyataan penghapusan kolom tidak valid.");
    if (await columnExists(connection, tableName, columnName)) {
      await connection.query(normalized.replace(/ DROP COLUMN IF EXISTS /i, " DROP COLUMN "));
    }
    return;
  }

  const dropIndex = normalized.match(/^ALTER TABLE ([a-zA-Z0-9_]+) DROP INDEX IF EXISTS ([a-zA-Z0-9_]+)$/i);
  if (dropIndex) {
    const tableName = dropIndex[1];
    const indexName = dropIndex[2];
    if (!tableName || !indexName) throw new Error("Pernyataan penghapusan indeks tidak valid.");
    if (await indexExists(connection, tableName, indexName)) {
      await connection.query(normalized.replace(/ DROP INDEX IF EXISTS /i, " DROP INDEX "));
    }
    return;
  }

  await connection.query(statement);
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
      try {
        await executeCompatibleStatement(connection, statement);
      } catch (error) {
        console.error(`Migrasi gagal pada ${file}: ${statement}`, error);
        throw error;
      }
    }
  }
  await migrateLegacySuperadmin(connection);
  await seedReferenceData(connection);
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
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users MODIFY email VARCHAR(255) NOT NULL");
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users MODIFY password_hash VARCHAR(255) NOT NULL");
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users MODIFY status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE'");
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users ADD UNIQUE INDEX IF NOT EXISTS uq_superadmin_email (email)");
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users DROP INDEX IF EXISTS uq_superadmin_phone");
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users DROP COLUMN IF EXISTS phone_e164");
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users DROP COLUMN IF EXISTS pin_hash");
  await executeCompatibleStatement(connection, "ALTER TABLE superadmin_users DROP COLUMN IF EXISTS pin_reset_required");
}
