import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { assertLocation } from "./public-service";
import { assertOwnedMedia, markMediaUsed } from "./media";
import { db } from "./db";
import { HttpError } from "./http";
import { revokeAllSellerSessions } from "./session";
import { recordAuditSafely } from "./audit";
import { normalizeIndonesianPhone, validateAddressDetail, validatePin, validateShopSlug, validateText } from "../shared/validation";

type SellerRow = RowDataPacket & { id: number; phone_e164: string; pin_hash: string; pin_reset_required: number; status: string };
type ShopRow = RowDataPacket & {
  id: number; seller_id: number; name: string; slug: string; description: string | null; profile_media_id: number | null;
  province_code: string; province_name: string; city_regency_code: string; city_regency_name: string; district_code: string; district_name: string; address_detail: string; visibility_status: string;
};

export type ShopMutation = {
  name: unknown;
  slug?: unknown;
  description?: unknown;
  profileMediaId?: unknown;
  provinceCode: unknown;
  cityRegencyCode: unknown;
  districtCode: unknown;
  addressDetail: unknown;
};

function validationError(errors: string[]): never {
  throw new HttpError(400, "VALIDATION_ERROR", errors[0] ?? "Data yang dikirim tidak valid.", errors);
}

function textValue(value: unknown, label: string, min: number, max: number): string {
  const errors = validateText(value, label, min, max);
  if (errors.length > 0) validationError(errors);
  return (value as string).trim();
}

function numberId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "VALIDATION_ERROR", `${label} tidak valid.`);
  return id;
}

function shopResource(row: ShopRow) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    profileMediaId: row.profile_media_id === null ? null : Number(row.profile_media_id),
    profileImageUrl: row.profile_media_id === null ? null : `/media/${row.profile_media_id}`,
    provinceCode: row.province_code,
    provinceName: row.province_name,
    cityRegencyCode: row.city_regency_code,
    cityRegencyName: row.city_regency_name,
    districtCode: row.district_code,
    districtName: row.district_name,
    addressDetail: row.address_detail,
    visibilityStatus: row.visibility_status,
  };
}

async function findSeller(sellerId: number): Promise<SellerRow> {
  const [rows] = await db.execute<SellerRow[]>("SELECT id, phone_e164, pin_hash, pin_reset_required, status FROM sellers WHERE id = ? LIMIT 1", [sellerId]);
  const seller = rows[0];
  if (!seller || seller.status !== "ACTIVE") throw new HttpError(401, "SELLER_AUTH_REQUIRED", "Sesi penjual tidak aktif.");
  return seller;
}

async function findShop(sellerId: number): Promise<ShopRow | null> {
  const [rows] = await db.execute<ShopRow[]>(
    `SELECT s.id, s.seller_id, s.name, s.slug, s.description, s.profile_media_id,
      s.province_code, province.name AS province_name, s.city_regency_code, city.name AS city_regency_name,
      s.district_code, district.name AS district_name, s.address_detail, s.visibility_status
     FROM shops s JOIN locations province ON province.code = s.province_code
     JOIN locations city ON city.code = s.city_regency_code JOIN locations district ON district.code = s.district_code
     WHERE s.seller_id = ? LIMIT 1`,
    [sellerId],
  );
  return rows[0] ?? null;
}

export async function registerSeller(phoneInput: unknown, pinInput: unknown): Promise<{ sellerId: number }> {
  const phone = normalizeIndonesianPhone(phoneInput);
  if (phone.errors.length > 0) validationError(phone.errors);
  const pinErrors = validatePin(pinInput);
  if (pinErrors.length > 0) validationError(pinErrors);
  const [existing] = await db.execute<RowDataPacket[]>("SELECT id FROM sellers WHERE phone_e164 = ? LIMIT 1", [phone.value]);
  if (existing.length > 0) throw new HttpError(409, "PHONE_EXISTS", "Nomor telepon sudah terdaftar.");
  const pinHash = await Bun.password.hash(pinInput as string, { algorithm: "argon2id" });
  try {
    const [result] = await db.execute<ResultSetHeader>("INSERT INTO sellers (phone_e164, pin_hash) VALUES (?, ?)", [phone.value, pinHash]);
    const sellerId = Number(result.insertId);
    recordAuditSafely("SELLER", sellerId, "seller_registered", "SELLER", sellerId);
    return { sellerId };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") throw new HttpError(409, "PHONE_EXISTS", "Nomor telepon sudah terdaftar.");
    throw error;
  }
}

export async function authenticateSeller(phoneInput: unknown, pinInput: unknown): Promise<{ sellerId: number }> {
  const phone = normalizeIndonesianPhone(phoneInput);
  const pinErrors = validatePin(pinInput);
  if (phone.errors.length > 0 || pinErrors.length > 0) throw new HttpError(401, "LOGIN_FAILED", "Nomor telepon atau PIN tidak benar.");
  const [rows] = await db.execute<SellerRow[]>("SELECT id, phone_e164, pin_hash, pin_reset_required, status FROM sellers WHERE phone_e164 = ? LIMIT 1", [phone.value]);
  const seller = rows[0];
  if (!seller || seller.status !== "ACTIVE" || !(await Bun.password.verify(pinInput as string, seller.pin_hash))) throw new HttpError(401, "LOGIN_FAILED", "Nomor telepon atau PIN tidak benar.");
  const sellerId = Number(seller.id);
  recordAuditSafely("SELLER", sellerId, "seller_login_success", "SELLER", sellerId);
  return { sellerId };
}

export async function getSellerMe(sellerId: number): Promise<unknown> {
  const seller = await findSeller(sellerId);
  const shop = await findShop(sellerId);
  let productCount = 0;
  let availableProductCount = 0;
  if (shop) {
    const [counts] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS productCount, SUM(available = TRUE) AS availableProductCount FROM products WHERE shop_id = ?", [shop.id]);
    productCount = Number(counts[0]?.productCount ?? 0);
    availableProductCount = Number(counts[0]?.availableProductCount ?? 0);
  }
  return { seller: { id: Number(seller.id), phone: seller.phone_e164, pinResetRequired: Boolean(seller.pin_reset_required) }, shop: shop ? shopResource(shop) : null, productCount, availableProductCount };
}

async function validatedShopInput(input: ShopMutation, sellerId: number, current?: ShopRow): Promise<{ name: string; slug: string; description: string | null; profileMediaId: number | null; provinceCode: string; cityRegencyCode: string; districtCode: string; addressDetail: string }> {
  const name = textValue(input.name, "Nama toko", 1, 120);
  const description = input.description === undefined || input.description === null || input.description === "" ? null : textValue(input.description, "Deskripsi toko", 1, 500);
  const slug = current?.slug ?? String(input.slug ?? "").trim().toLowerCase();
  if (!current) {
    const slugErrors = validateShopSlug(slug);
    if (slugErrors.length > 0) validationError(slugErrors);
  }
  const provinceCode = textValue(input.provinceCode, "Kode provinsi", 1, 20);
  const cityRegencyCode = textValue(input.cityRegencyCode, "Kode kabupaten atau kota", 1, 20);
  const districtCode = textValue(input.districtCode, "Kode kecamatan", 1, 20);
  const addressDetail = textValue(input.addressDetail, "Detail alamat", 5, 500);
  await assertLocation(provinceCode, "PROVINCE", null);
  await assertLocation(cityRegencyCode, "CITY_REGENCY", provinceCode);
  await assertLocation(districtCode, "DISTRICT", cityRegencyCode);
  let profileMediaId: number | null = current?.profile_media_id ?? null;
  if (input.profileMediaId !== undefined) profileMediaId = input.profileMediaId === null || input.profileMediaId === "" ? null : await assertOwnedMedia(input.profileMediaId, "SELLER", sellerId);
  return { name, slug, description, profileMediaId, provinceCode, cityRegencyCode, districtCode, addressDetail };
}

export async function createShop(sellerId: number, input: ShopMutation): Promise<unknown> {
  if (input.slug === undefined) validationError(["URL toko wajib diisi saat membuat toko."]);
  if (await findShop(sellerId)) throw new HttpError(409, "SHOP_EXISTS", "Akun ini sudah memiliki toko.");
  const values = await validatedShopInput(input, sellerId);
  const [existingSlug] = await db.execute<RowDataPacket[]>("SELECT id FROM shops WHERE slug = ? LIMIT 1", [values.slug]);
  if (existingSlug.length > 0) throw new HttpError(409, "SLUG_EXISTS", "URL toko sudah digunakan.");
  try {
    await db.execute(
      `INSERT INTO shops (seller_id, slug, name, description, profile_media_id, province_code, city_regency_code, district_code, address_detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerId, values.slug, values.name, values.description, values.profileMediaId, values.provinceCode, values.cityRegencyCode, values.districtCode, values.addressDetail],
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") throw new HttpError(409, "SLUG_EXISTS", "URL toko sudah digunakan.");
    throw error;
  }
  const shop = await findShop(sellerId);
  if (!shop) throw new Error("Toko berhasil disimpan tetapi tidak dapat dibaca kembali.");
  if (values.profileMediaId !== null) await markMediaUsed(values.profileMediaId, "SELLER", sellerId);
  recordAuditSafely("SELLER", sellerId, "shop_created", "SHOP", shop.id);
  return shopResource(shop);
}

export async function getSellerShop(sellerId: number): Promise<unknown> {
  const shop = await findShop(sellerId);
  if (!shop) throw new HttpError(404, "SHOP_NOT_SETUP", "Toko belum dibuat.");
  return shopResource(shop);
}

export async function updateShop(sellerId: number, input: ShopMutation & Record<string, unknown>): Promise<unknown> {
  if ("slug" in input || "phone" in input) throw new HttpError(400, "IMMUTABLE_SHOP_FIELDS", "URL toko dan nomor telepon memiliki jalur perubahan terpisah.");
  const current = await findShop(sellerId);
  if (!current) throw new HttpError(404, "SHOP_NOT_SETUP", "Toko belum dibuat.");
  const values = await validatedShopInput({ ...input, name: input.name ?? current.name, description: input.description ?? current.description, provinceCode: input.provinceCode ?? current.province_code, cityRegencyCode: input.cityRegencyCode ?? current.city_regency_code, districtCode: input.districtCode ?? current.district_code, addressDetail: input.addressDetail ?? current.address_detail }, sellerId, current);
  await db.execute(
    `UPDATE shops SET name = ?, description = ?, profile_media_id = ?, province_code = ?, city_regency_code = ?, district_code = ?, address_detail = ? WHERE id = ? AND seller_id = ?`,
    [values.name, values.description, values.profileMediaId, values.provinceCode, values.cityRegencyCode, values.districtCode, values.addressDetail, current.id, sellerId],
  );
  const shop = await findShop(sellerId);
  if (!shop) throw new Error("Toko berhasil diperbarui tetapi tidak dapat dibaca kembali.");
  if (values.profileMediaId !== null) await markMediaUsed(values.profileMediaId, "SELLER", sellerId);
  recordAuditSafely("SELLER", sellerId, "shop_updated", "SHOP", shop.id);
  return shopResource(shop);
}

export async function changeSellerPhone(sellerId: number, currentPin: unknown, newPhoneInput: unknown): Promise<void> {
  const seller = await findSeller(sellerId);
  if (validatePin(currentPin).length > 0 || !(await Bun.password.verify(currentPin as string, seller.pin_hash))) throw new HttpError(401, "PIN_INVALID", "PIN saat ini tidak benar.");
  const newPhone = normalizeIndonesianPhone(newPhoneInput);
  if (newPhone.errors.length > 0) validationError(newPhone.errors);
  if (newPhone.value === seller.phone_e164) throw new HttpError(409, "PHONE_UNCHANGED", "Nomor telepon baru sama dengan nomor saat ini.");
  const [existing] = await db.execute<RowDataPacket[]>("SELECT id FROM sellers WHERE phone_e164 = ? AND id <> ? LIMIT 1", [newPhone.value, sellerId]);
  if (existing.length > 0) throw new HttpError(409, "PHONE_EXISTS", "Nomor telepon sudah terdaftar.");
  try {
    await db.execute("UPDATE sellers SET phone_e164 = ? WHERE id = ?", [newPhone.value, sellerId]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") throw new HttpError(409, "PHONE_EXISTS", "Nomor telepon sudah terdaftar.");
    throw error;
  }
  await revokeAllSellerSessions(sellerId);
  recordAuditSafely("SELLER", sellerId, "seller_phone_changed", "SELLER", sellerId);
}

export async function changeSellerPin(sellerId: number, currentPin: unknown, newPin: unknown): Promise<void> {
  const seller = await findSeller(sellerId);
  if (validatePin(currentPin).length > 0 || !(await Bun.password.verify(currentPin as string, seller.pin_hash))) throw new HttpError(401, "PIN_INVALID", "PIN saat ini tidak benar.");
  const newPinErrors = validatePin(newPin);
  if (newPinErrors.length > 0) validationError(newPinErrors);
  const pinHash = await Bun.password.hash(newPin as string, { algorithm: "argon2id" });
  await db.execute("UPDATE sellers SET pin_hash = ?, pin_reset_required = FALSE WHERE id = ?", [pinHash, sellerId]);
  await revokeAllSellerSessions(sellerId);
  recordAuditSafely("SELLER", sellerId, "seller_pin_changed", "SELLER", sellerId);
}
