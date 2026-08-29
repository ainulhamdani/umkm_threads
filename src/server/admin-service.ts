import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getCategory } from "../shared/categories";
import { validateText } from "../shared/validation";
import { db } from "./db";
import { HttpError } from "./http";
import { recordAudit } from "./audit";
import { revokeAllSellerSessions } from "./session";

type AdminRow = RowDataPacket & { id: number; email: string; password_hash: string; status: string };
type AdRow = RowDataPacket & { enabled: number | boolean; client_id: string | null; home_slot: string | null; shop_slot: string | null; seller_slot: string | null; admin_slot: string | null };
export type AdPlacement = "HOME" | "SHOP" | "SELLER" | "ADMIN";

function invalid(message: string): never { throw new HttpError(400, "VALIDATION_ERROR", message); }

function idValue(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "INVALID_ID", "ID tidak valid.");
  return id;
}

export async function authenticateAdmin(emailInput: unknown, passwordInput: unknown): Promise<{ adminId: number }> {
  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof passwordInput !== "string" || passwordInput.length === 0) {
    throw new HttpError(401, "LOGIN_FAILED", "Email atau kata sandi superadmin tidak benar.");
  }
  const [rows] = await db.execute<AdminRow[]>("SELECT id, email, password_hash, status FROM superadmin_users WHERE email = ? LIMIT 1", [email]);
  const admin = rows[0];
  if (!admin || admin.status !== "ACTIVE" || !(await Bun.password.verify(passwordInput, admin.password_hash))) throw new HttpError(401, "LOGIN_FAILED", "Email atau kata sandi superadmin tidak benar.");
  return { adminId: Number(admin.id) };
}

export async function listAdminSellers(searchInput: unknown): Promise<unknown[]> {
  const search = typeof searchInput === "string" ? searchInput.trim().slice(0, 100) : "";
  const like = `%${search.toLowerCase()}%`;
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT s.id, s.phone_e164, s.status, s.pin_reset_required, sh.id AS shop_id, sh.name AS shop_name, sh.slug AS shop_slug,
      sh.visibility_status AS shop_visibility, COUNT(p.id) AS product_count
     FROM sellers s LEFT JOIN shops sh ON sh.seller_id = s.id LEFT JOIN products p ON p.shop_id = sh.id
     WHERE (? = '' OR LOWER(s.phone_e164) LIKE ? OR LOWER(COALESCE(sh.name, '')) LIKE ? OR LOWER(COALESCE(sh.slug, '')) LIKE ?)
     GROUP BY s.id, sh.id ORDER BY s.created_at DESC, s.id DESC LIMIT 100`,
    [search, like, like, like],
  );
  return rows.map((row) => ({ id: Number(row.id), phone: String(row.phone_e164), status: String(row.status), pinResetRequired: Boolean(row.pin_reset_required), shop: row.shop_id ? { id: Number(row.shop_id), name: String(row.shop_name), slug: String(row.shop_slug), visibilityStatus: String(row.shop_visibility) } : null, productCount: Number(row.product_count ?? 0) }));
}

export async function listAdminProducts(searchInput: unknown): Promise<unknown[]> {
  const search = typeof searchInput === "string" ? searchInput.trim().slice(0, 100) : "";
  const like = `%${search.toLowerCase()}%`;
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT p.id, p.name, p.price_idr, p.available, p.visibility_status, p.shop_id, sh.name AS shop_name,
      pc.code AS primary_code, pc.label AS primary_label, p.media_id
     FROM products p JOIN shops sh ON sh.id = p.shop_id JOIN product_categories pc ON pc.code = p.primary_category_code AND pc.active = TRUE
     WHERE (? = '' OR LOWER(p.name) LIKE ? OR LOWER(sh.name) LIKE ?) ORDER BY p.created_at DESC, p.id DESC LIMIT 200`,
    [search, like, like],
  );
  return rows.map((row) => ({ id: Number(row.id), name: String(row.name), priceIdr: Number(row.price_idr), available: Boolean(row.available), visibilityStatus: String(row.visibility_status), shopId: Number(row.shop_id), shopName: String(row.shop_name), primaryCategory: { code: String(row.primary_code), label: String(row.primary_label), displayOrder: getCategory(String(row.primary_code))?.displayOrder ?? 0 }, imageUrl: `/media/${row.media_id}` }));
}

export async function setShopVisibility(adminId: number, shopIdValue: string, visible: boolean): Promise<void> {
  const shopId = idValue(shopIdValue);
  const [result] = await db.execute<ResultSetHeader>("UPDATE shops SET visibility_status = ? WHERE id = ?", [visible ? "PUBLISHED" : "HIDDEN", shopId]);
  if (result.affectedRows === 0) throw new HttpError(404, "SHOP_NOT_FOUND", "Toko tidak ditemukan.");
  await recordAudit("SUPERADMIN", adminId, "admin_visibility_changed", "SHOP", shopId, { resource: "shop", visible });
}

export async function setProductVisibility(adminId: number, productIdValue: string, visible: boolean): Promise<void> {
  const productId = idValue(productIdValue);
  const [result] = await db.execute<ResultSetHeader>("UPDATE products SET visibility_status = ? WHERE id = ?", [visible ? "PUBLISHED" : "HIDDEN", productId]);
  if (result.affectedRows === 0) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan.");
  await recordAudit("SUPERADMIN", adminId, "admin_visibility_changed", "PRODUCT", productId, { resource: "product", visible });
}

export async function resetSellerPin(adminId: number, sellerIdValue: string): Promise<{ temporaryPin: string }> {
  const sellerId = idValue(sellerIdValue);
  const [sellers] = await db.execute<RowDataPacket[]>("SELECT id FROM sellers WHERE id = ? LIMIT 1", [sellerId]);
  if (sellers.length === 0) throw new HttpError(404, "SELLER_NOT_FOUND", "Penjual tidak ditemukan.");
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const temporaryPin = String(100000 + (random[0] ?? 0) % 900000);
  const pinHash = await Bun.password.hash(temporaryPin, { algorithm: "argon2id" });
  await db.execute("UPDATE sellers SET pin_hash = ?, pin_reset_required = TRUE WHERE id = ?", [pinHash, sellerId]);
  await revokeAllSellerSessions(sellerId);
  await recordAudit("SUPERADMIN", adminId, "seller_pin_reset", "SELLER", sellerId, { resetRequired: true });
  return { temporaryPin };
}

function placementSlot(row: AdRow, placement: AdPlacement): string | null {
  return placement === "HOME" ? row.home_slot : placement === "SHOP" ? row.shop_slot : placement === "SELLER" ? row.seller_slot : row.admin_slot;
}

export async function getAdsenseSettings(): Promise<unknown> {
  const [rows] = await db.execute<AdRow[]>("SELECT enabled, client_id, home_slot, shop_slot, seller_slot, admin_slot FROM adsense_settings WHERE id = 1 LIMIT 1");
  const row = rows[0];
  return { enabled: Boolean(row?.enabled), clientId: row?.client_id ?? "", slots: { HOME: row?.home_slot ?? "", SHOP: row?.shop_slot ?? "", SELLER: row?.seller_slot ?? "", ADMIN: row?.admin_slot ?? "" } };
}

export async function getPublicAdPlacement(placement: AdPlacement): Promise<{ enabled: boolean; clientId: string; slotId: string }> {
  const [rows] = await db.execute<AdRow[]>("SELECT enabled, client_id, home_slot, shop_slot, seller_slot, admin_slot FROM adsense_settings WHERE id = 1 LIMIT 1");
  const row = rows[0];
  const slotId = row ? placementSlot(row, placement) ?? "" : "";
  return { enabled: Boolean(row?.enabled) && Boolean(row?.client_id) && Boolean(slotId), clientId: row?.client_id ?? "", slotId };
}

export async function updateAdsenseSettings(adminId: number, input: Record<string, unknown>): Promise<unknown> {
  if (typeof input.enabled !== "boolean") invalid("Status AdSense harus berupa pilihan benar atau salah.");
  const clientId = typeof input.clientId === "string" ? input.clientId.trim() : "";
  if (clientId && !/^ca-pub-[0-9]+$/.test(clientId)) invalid("Client ID AdSense tidak valid.");
  const slotsInput = input.slots;
  if (!slotsInput || typeof slotsInput !== "object" || Array.isArray(slotsInput)) invalid("Slot AdSense tidak valid.");
  const slots = slotsInput as Record<string, unknown>;
  const values = ["HOME", "SHOP", "SELLER", "ADMIN"].map((key) => typeof slots[key] === "string" ? slots[key].trim().slice(0, 100) : "");
  if (input.enabled && (!clientId || values.some((value) => !/^\d+$/.test(value)))) invalid("Client ID dan semua slot wajib diisi saat AdSense diaktifkan.");
  await db.execute("UPDATE adsense_settings SET enabled = ?, client_id = ?, home_slot = ?, shop_slot = ?, seller_slot = ?, admin_slot = ?, updated_by = ? WHERE id = 1", [input.enabled, clientId || null, ...values.map((value) => value || null), adminId]);
  await recordAudit("SUPERADMIN", adminId, "adsense_settings_changed", "ADSENSE", 1, { enabled: input.enabled });
  return getAdsenseSettings();
}

export async function listAuditLogs(): Promise<unknown[]> {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id, actor_type, actor_id, action_code, target_type, target_id, metadata_json, created_at FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 100");
  return rows.map((row) => ({ id: Number(row.id), actorType: String(row.actor_type), actorId: row.actor_id === null ? null : Number(row.actor_id), actionCode: String(row.action_code), targetType: row.target_type ? String(row.target_type) : null, targetId: row.target_id === null ? null : Number(row.target_id), metadata: typeof row.metadata_json === "string" ? JSON.parse(row.metadata_json) : row.metadata_json, createdAt: String(row.created_at) }));
}
