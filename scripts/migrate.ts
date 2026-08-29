import mysql from "mysql2/promise";
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
  const sql = await Bun.file("sql/001_initial.sql").text();
  for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await connection.query(statement);
  }
  console.log(`Migrasi database ${config.db.name} selesai.`);
} finally {
  await connection.end();
}

export {};
