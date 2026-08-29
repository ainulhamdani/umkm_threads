import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { config } from "../shared/config";

export type DbRow = RowDataPacket;
export type DbResult = ResultSetHeader;

export const db: Pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  dateStrings: true,
});

export async function closeDb(): Promise<void> {
  await db.end();
}
