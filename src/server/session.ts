import type { RowDataPacket } from "mysql2";
import { config } from "../shared/config";
import { HttpError } from "./http";
import { db } from "./db";

export const SELLER_SESSION_COOKIE = "threads_seller_session";
export const ADMIN_SESSION_COOKIE = "threads_admin_session";
export const CSRF_COOKIE = "threads_csrf";

type SessionRow = RowDataPacket & { id: number; seller_id?: number; superadmin_id?: number; pin_reset_required?: number; status: string };
export type SellerSession = { sessionId: number; sellerId: number; pinResetRequired: boolean };
export type AdminSession = { sessionId: number; adminId: number };

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) return parts.join("=") || null;
  }
  return null;
}

function cookie(name: string, value: string, maxAge: number, httpOnly: boolean): string {
  const attributes = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  if (httpOnly) attributes.push("HttpOnly");
  if (config.cookieSecure) attributes.push("Secure");
  return attributes.join("; ");
}

export function appendCookie(response: Response, name: string, value: string, maxAge: number, httpOnly: boolean): Response {
  response.headers.append("Set-Cookie", cookie(name, value, maxAge, httpOnly));
  return response;
}

export function clearCookie(response: Response, name: string, httpOnly: boolean): Response {
  return appendCookie(response, name, "", 0, httpOnly);
}

export async function issueCsrfToken(request: Request): Promise<{ token: string; existing: boolean }> {
  const existing = readCookie(request, CSRF_COOKIE);
  return existing ? { token: existing, existing: true } : { token: randomToken(), existing: false };
}

export function assertCsrf(request: Request): void {
  const cookieToken = readCookie(request, CSRF_COOKIE);
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken.length < 20 || cookieToken !== headerToken) {
    throw new HttpError(403, "CSRF_INVALID", "Permintaan tidak memiliki perlindungan keamanan yang valid.");
  }
}

export async function createSellerSession(sellerId: number): Promise<string> {
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  await db.execute("INSERT INTO seller_sessions (seller_id, token_hash, expires_at) VALUES (?, ?, ?)", [sellerId, tokenHash, expiresAt]);
  return token;
}

export async function createAdminSession(adminId: number): Promise<string> {
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  await db.execute("INSERT INTO superadmin_sessions (superadmin_id, token_hash, expires_at) VALUES (?, ?, ?)", [adminId, tokenHash, expiresAt]);
  return token;
}

export async function getSellerSession(request: Request): Promise<SellerSession | null> {
  const token = readCookie(request, SELLER_SESSION_COOKIE);
  if (!token) return null;
  const [rows] = await db.execute<SessionRow[]>(
    `SELECT ss.id, ss.seller_id, s.pin_reset_required, s.status
     FROM seller_sessions ss JOIN sellers s ON s.id = ss.seller_id
     WHERE ss.token_hash = ? AND ss.revoked_at IS NULL AND ss.expires_at > NOW() LIMIT 1`,
    [await hashToken(token)],
  );
  const row = rows[0];
  if (!row || row.status !== "ACTIVE" || row.seller_id === undefined) return null;
  await db.execute("UPDATE seller_sessions SET last_seen_at = NOW() WHERE id = ?", [row.id]);
  return { sessionId: Number(row.id), sellerId: Number(row.seller_id), pinResetRequired: Boolean(row.pin_reset_required) };
}

export async function getAdminSession(request: Request): Promise<AdminSession | null> {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!token) return null;
  const [rows] = await db.execute<SessionRow[]>(
    `SELECT sas.id, sas.superadmin_id, su.status
     FROM superadmin_sessions sas JOIN superadmin_users su ON su.id = sas.superadmin_id
     WHERE sas.token_hash = ? AND sas.revoked_at IS NULL AND sas.expires_at > NOW() LIMIT 1`,
    [await hashToken(token)],
  );
  const row = rows[0];
  if (!row || row.status !== "ACTIVE" || row.superadmin_id === undefined) return null;
  await db.execute("UPDATE superadmin_sessions SET last_seen_at = NOW() WHERE id = ?", [row.id]);
  return { sessionId: Number(row.id), adminId: Number(row.superadmin_id) };
}

export async function requireSeller(request: Request): Promise<SellerSession> {
  const session = await getSellerSession(request);
  if (!session) throw new HttpError(401, "SELLER_AUTH_REQUIRED", "Silakan masuk sebagai penjual terlebih dahulu.");
  return session;
}

export async function requireAdmin(request: Request): Promise<AdminSession> {
  const session = await getAdminSession(request);
  if (!session) throw new HttpError(401, "ADMIN_AUTH_REQUIRED", "Silakan masuk sebagai superadmin terlebih dahulu.");
  return session;
}

export async function revokeSellerSession(request: Request): Promise<void> {
  const token = readCookie(request, SELLER_SESSION_COOKIE);
  if (token) await db.execute("UPDATE seller_sessions SET revoked_at = NOW() WHERE token_hash = ?", [await hashToken(token)]);
}

export async function revokeAdminSession(request: Request): Promise<void> {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (token) await db.execute("UPDATE superadmin_sessions SET revoked_at = NOW() WHERE token_hash = ?", [await hashToken(token)]);
}

export async function revokeAllSellerSessions(sellerId: number): Promise<void> {
  await db.execute("UPDATE seller_sessions SET revoked_at = NOW() WHERE seller_id = ? AND revoked_at IS NULL", [sellerId]);
}
