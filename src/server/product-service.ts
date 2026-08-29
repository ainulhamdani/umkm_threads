import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import type { SellerProduct } from "../shared/types";
import { validateCategorySelection, getCategory } from "../shared/categories";
import { validatePrice, validateText } from "../shared/validation";
import { assertOwnedMedia } from "./media";
import { db } from "./db";
import { HttpError } from "./http";

type ProductRow = RowDataPacket & {
  id: number; shop_id: number; media_id: number; name: string; price_idr: number | string; description: string | null;
  primary_category_code: string; primary_category_label: string; available: number | boolean; visibility_status: string;
};
type SecondaryRow = RowDataPacket & { category_code: string; label: string; position: number };

export type ProductMutation = {
  mediaId: unknown;
  name: unknown;
  priceIdr: unknown;
  primaryCategoryCode: unknown;
  secondaryCategoryCodes: unknown;
  description?: unknown;
  available?: unknown;
};

function invalid(errors: string[]): never {
  throw new HttpError(400, "VALIDATION_ERROR", errors[0] ?? "Data produk tidak valid.", errors);
}

function requiredText(value: unknown, label: string, min: number, max: number): string {
  const errors = validateText(value, label, min, max);
  if (errors.length > 0) invalid(errors);
  return (value as string).trim();
}

function productResource(row: ProductRow, secondary: SecondaryRow[]): SellerProduct {
  return {
    id: Number(row.id),
    mediaId: Number(row.media_id),
    imageUrl: `/media/${row.media_id}`,
    name: row.name,
    priceIdr: Number(row.price_idr),
    description: row.description,
    primaryCategoryCode: row.primary_category_code,
    primaryCategory: { code: row.primary_category_code, label: row.primary_category_label, displayOrder: getCategory(row.primary_category_code)?.displayOrder ?? 0 },
    secondaryCategoryCodes: secondary.sort((left, right) => left.position - right.position).map((item) => item.category_code),
    secondaryCategories: secondary.map((item) => ({ code: item.category_code, label: item.label, displayOrder: getCategory(item.category_code)?.displayOrder ?? 0 })),
    available: Boolean(row.available),
    visibilityStatus: row.visibility_status,
  };
}

async function sellerShopId(sellerId: number): Promise<number> {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id FROM shops WHERE seller_id = ? LIMIT 1", [sellerId]);
  const shopId = rows[0]?.id;
  if (!shopId) throw new HttpError(409, "SHOP_NOT_SETUP", "Buat profil toko sebelum menambahkan produk.");
  return Number(shopId);
}

async function secondaryCategories(productIds: number[]): Promise<Map<number, SecondaryRow[]>> {
  const result = new Map<number, SecondaryRow[]>();
  if (productIds.length === 0) return result;
  const placeholders = productIds.map(() => "?").join(", ");
  const [rows] = await db.execute<(SecondaryRow & { product_id: number })[]>(
    `SELECT a.product_id, a.category_code, pc.label, a.position FROM product_category_assignments a
     JOIN product_categories pc ON pc.code = a.category_code WHERE a.product_id IN (${placeholders}) ORDER BY a.position ASC`,
    productIds,
  );
  for (const row of rows) {
    const values = result.get(Number(row.product_id)) ?? [];
    values.push(row);
    result.set(Number(row.product_id), values);
  }
  return result;
}

const PRODUCT_SELECT = `SELECT p.id, p.shop_id, p.media_id, p.name, p.price_idr, p.description,
  p.primary_category_code, pc.label AS primary_category_label, p.available, p.visibility_status
  FROM products p JOIN product_categories pc ON pc.code = p.primary_category_code`;

export async function listSellerProducts(sellerId: number): Promise<SellerProduct[]> {
  const [rows] = await db.execute<ProductRow[]>(`${PRODUCT_SELECT} JOIN shops s ON s.id = p.shop_id WHERE s.seller_id = ? ORDER BY p.created_at DESC, p.id DESC`, [sellerId]);
  const categories = await secondaryCategories(rows.map((row) => Number(row.id)));
  return rows.map((row) => productResource(row, categories.get(Number(row.id)) ?? []));
}

async function findSellerProduct(sellerId: number, productId: number): Promise<{ row: ProductRow; secondary: SecondaryRow[] }> {
  const [rows] = await db.execute<ProductRow[]>(`${PRODUCT_SELECT} JOIN shops s ON s.id = p.shop_id WHERE s.seller_id = ? AND p.id = ? LIMIT 1`, [sellerId, productId]);
  const row = rows[0];
  if (!row) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan.");
  const categories = await secondaryCategories([productId]);
  return { row, secondary: categories.get(productId) ?? [] };
}

function validateCategories(primary: unknown, secondary: unknown): { primary: string; secondary: string[] } {
  const errors = validateCategorySelection(primary, secondary);
  if (errors.length > 0) invalid(errors);
  return { primary: primary as string, secondary: (secondary as string[]).slice() };
}

async function mutationValues(sellerId: number, input: ProductMutation, current?: SellerProduct): Promise<{ mediaId: number; name: string; priceIdr: number; primary: string; secondary: string[]; description: string | null; available: boolean }> {
  const mediaId = await assertOwnedMedia(input.mediaId ?? current?.mediaId, "SELLER", sellerId);
  const name = requiredText(input.name ?? current?.name, "Nama produk", 2, 160);
  const rawPrice = input.priceIdr ?? current?.priceIdr;
  const priceErrors = validatePrice(rawPrice);
  if (priceErrors.length > 0) invalid(priceErrors);
  const priceIdr = Number(rawPrice);
  const primaryCode = input.primaryCategoryCode ?? current?.primaryCategoryCode;
  const secondaryCodes = input.secondaryCategoryCodes ?? current?.secondaryCategoryCodes ?? [];
  const categories = validateCategories(primaryCode, secondaryCodes);
  let description: string | null = current?.description ?? null;
  if (input.description !== undefined) description = input.description === null || input.description === "" ? null : requiredText(input.description, "Deskripsi produk", 2, 1000);
  let available = current?.available ?? true;
  if (input.available !== undefined) {
    if (typeof input.available !== "boolean") invalid(["Ketersediaan produk harus berupa pilihan benar atau salah."]);
    available = input.available;
  }
  return { mediaId, name, priceIdr, primary: categories.primary, secondary: categories.secondary, description, available };
}

async function saveAssignments(connection: PoolConnection, productId: number, secondary: string[]): Promise<void> {
  await connection.execute("DELETE FROM product_category_assignments WHERE product_id = ?", [productId]);
  for (const [index, categoryCode] of secondary.entries()) await connection.execute("INSERT INTO product_category_assignments (product_id, category_code, position, role) VALUES (?, ?, ?, 'SECONDARY')", [productId, categoryCode, index + 1]);
}

async function readProduct(sellerId: number, productId: number): Promise<SellerProduct> {
  const found = await findSellerProduct(sellerId, productId);
  return productResource(found.row, found.secondary);
}

export async function createSellerProduct(sellerId: number, input: ProductMutation): Promise<SellerProduct> {
  const shopId = await sellerShopId(sellerId);
  const values = await mutationValues(sellerId, input);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>("INSERT INTO products (shop_id, media_id, name, price_idr, description, primary_category_code, available) VALUES (?, ?, ?, ?, ?, ?, ?)", [shopId, values.mediaId, values.name, values.priceIdr, values.description, values.primary, values.available]);
    await saveAssignments(connection, Number(result.insertId), values.secondary);
    await connection.execute("UPDATE media SET used_at = COALESCE(used_at, NOW()) WHERE id = ? AND owner_type = 'SELLER' AND owner_id = ?", [values.mediaId, sellerId]);
    await connection.commit();
    return await readProduct(sellerId, Number(result.insertId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSellerProduct(sellerId: number, productIdValue: string, input: ProductMutation & Record<string, unknown>): Promise<SellerProduct> {
  const productId = Number(productIdValue);
  if (!Number.isSafeInteger(productId) || productId < 1) throw new HttpError(400, "PRODUCT_INVALID", "ID produk tidak valid.");
  if ("visibilityStatus" in input) throw new HttpError(400, "FIELD_NOT_ALLOWED", "Visibilitas produk diatur oleh superadmin.");
  const current = await readProduct(sellerId, productId);
  const values = await mutationValues(sellerId, input, current);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE products SET media_id = ?, name = ?, price_idr = ?, description = ?, primary_category_code = ?, available = ? WHERE id = ?", [values.mediaId, values.name, values.priceIdr, values.description, values.primary, values.available, productId]);
    await saveAssignments(connection, productId, values.secondary);
    await connection.execute("UPDATE media SET used_at = COALESCE(used_at, NOW()) WHERE id = ? AND owner_type = 'SELLER' AND owner_id = ?", [values.mediaId, sellerId]);
    await connection.commit();
    return await readProduct(sellerId, productId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
