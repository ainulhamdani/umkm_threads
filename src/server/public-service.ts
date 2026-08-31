import type { RowDataPacket } from "mysql2";
import { getCategory } from "../shared/categories";
import type { LocationLevel, LocationOption, ProductSearchParams, ProductSearchResponse, ProductSummary, PublicProduct, PublicSearchParams, PublicShop, ShopAddress, ShopSearchItem, ShopSearchParams, ShopSearchResponse, ShopSummary } from "../shared/types";
import { normalizeIndonesianPhone, validateShopSlug } from "../shared/validation";
import { HttpError } from "./http";
import { db } from "./db";
import { recordAuditSafely } from "./audit";

type ShopRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  phone_e164?: string;
  profile_media_id: number | null;
  address_detail: string;
  province_code: string;
  province_name: string;
  city_regency_code: string;
  city_regency_name: string;
  district_code: string;
  district_name: string;
};

type ProductRow = RowDataPacket & {
  id: number;
  shop_id: number;
  name: string;
  price_idr: number | string;
  description: string | null;
  media_id: number;
  primary_category_code: string;
  primary_category_label: string;
  available: number | boolean;
};

type SecondaryRow = RowDataPacket & { product_id: number; category_code: string; label: string; position: number };
type PublicProductRow = ProductRow & {
  shop_name: string;
  shop_slug: string;
  shop_profile_media_id: number | null;
  address_detail: string;
  province_code: string;
  province_name: string;
  city_regency_code: string;
  city_regency_name: string;
  district_code: string;
  district_name: string;
};

export type WhatsAppItemInput = { productId: string | number; quantity: number };
export type WhatsAppLinkResult = {
  shop: { name: string };
  items: Array<{ productId: string; name: string; quantity: number; unitPriceIdr: number; lineTotalIdr: number }>;
  subtotalIdr: number;
  whatsappUrl: string;
};

function addressFromRow(row: ShopRow): ShopAddress {
  return {
    addressDetail: row.address_detail,
    provinceCode: row.province_code,
    provinceName: row.province_name,
    cityRegencyCode: row.city_regency_code,
    cityRegencyName: row.city_regency_name,
    districtCode: row.district_code,
    districtName: row.district_name,
  };
}

function productFromRow(row: ProductRow, secondary: SecondaryRow[]): ProductSummary {
  return {
    id: Number(row.id),
    name: row.name,
    priceIdr: Number(row.price_idr),
    description: row.description,
    imageUrl: `/media/${row.media_id}`,
    primaryCategory: {
      code: row.primary_category_code,
      label: row.primary_category_label,
      displayOrder: getCategory(row.primary_category_code)?.displayOrder ?? 0,
    },
    secondaryCategories: secondary
      .sort((left, right) => left.position - right.position)
      .map((item) => ({ code: item.category_code, label: item.label, displayOrder: getCategory(item.category_code)?.displayOrder ?? 0 })),
    available: Boolean(row.available),
  };
}

function shopFromRow(row: ShopRow): ShopSummary {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    profileImageUrl: row.profile_media_id === null ? null : `/media/${row.profile_media_id}`,
    address: addressFromRow(row),
  };
}

function locationConditions(search: PublicSearchParams): { sql: string[]; params: string[] } {
  const sql: string[] = [];
  const params: string[] = [];
  if (search.provinceCode) { sql.push("s.province_code = ?"); params.push(search.provinceCode); }
  if (search.cityRegencyCode) { sql.push("s.city_regency_code = ?"); params.push(search.cityRegencyCode); }
  if (search.districtCode) { sql.push("s.district_code = ?"); params.push(search.districtCode); }
  return { sql, params };
}

function productConditions(search: PublicSearchParams, alias = "p"): { sql: string[]; params: string[] } {
  const sql = [`${alias}.available = TRUE`, `${alias}.visibility_status = 'PUBLISHED'`];
  const params: string[] = [];
  if (search.q) {
    sql.push(`LOWER(CONCAT_WS(' ', ${alias}.name, COALESCE(${alias}.description, ''))) LIKE ?`);
    params.push(`%${search.q.toLowerCase()}%`);
  }
  if (search.categoryCode) {
    sql.push(`(${alias}.primary_category_code = ? OR EXISTS (SELECT 1 FROM product_category_assignments ca WHERE ca.product_id = ${alias}.id AND ca.category_code = ?))`);
    params.push(search.categoryCode, search.categoryCode);
  }
  return { sql, params };
}

function parseLimit(value: string | null): number {
  if (value === null) return 24;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 48) throw new HttpError(400, "INVALID_LIMIT", "Batas hasil harus berupa angka antara 1 dan 48.");
  return parsed;
}

function parseOffset(cursor: string | null): number {
  if (!cursor) return 0;
  if (!/^\d+$/.test(cursor)) throw new HttpError(400, "INVALID_CURSOR", "Penanda halaman tidak valid.");
  const parsed = Number(cursor);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new HttpError(400, "INVALID_CURSOR", "Penanda halaman tidak valid.");
  return parsed;
}

export async function validatePublicSearch(search: PublicSearchParams): Promise<void> {
  if (search.cityRegencyCode && !search.provinceCode) throw new HttpError(400, "INVALID_LOCATION_FILTER", "Pilih provinsi sebelum memilih kabupaten atau kota.");
  if (search.districtCode && !search.cityRegencyCode) throw new HttpError(400, "INVALID_LOCATION_FILTER", "Pilih kabupaten atau kota sebelum memilih kecamatan.");
  if (search.provinceCode) await assertLocation(search.provinceCode, "PROVINCE", null);
  if (search.cityRegencyCode) await assertLocation(search.cityRegencyCode, "CITY_REGENCY", search.provinceCode ?? null);
  if (search.districtCode) await assertLocation(search.districtCode, "DISTRICT", search.cityRegencyCode ?? null);
  if (search.categoryCode && !getCategory(search.categoryCode)) throw new HttpError(400, "INVALID_CATEGORY", "Kategori produk tidak tersedia.");
}

export async function assertLocation(code: string, level: LocationLevel, parentCode: string | null): Promise<void> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT code FROM locations WHERE code = ? AND level = ? AND active = TRUE AND (? IS NULL OR parent_code = ?) LIMIT 1",
    [code, level, parentCode, parentCode],
  );
  if (rows.length === 0) throw new HttpError(400, "INVALID_LOCATION_FILTER", "Kombinasi wilayah tidak valid.");
}

export async function listLocations(level: LocationLevel, parentCode: string | null): Promise<LocationOption[]> {
  if (level !== "PROVINCE" && !parentCode) throw new HttpError(400, "INVALID_LOCATION_FILTER", "Wilayah turunan membutuhkan kode induk.");
  if (level === "PROVINCE" && parentCode) throw new HttpError(400, "INVALID_LOCATION_FILTER", "Provinsi tidak memiliki kode induk.");
  if (parentCode) {
    const parentLevel = level === "CITY_REGENCY" ? "PROVINCE" : "CITY_REGENCY";
    await assertLocation(parentCode, parentLevel, null);
  }
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT code, name, level, parent_code AS parentCode FROM locations WHERE level = ? AND active = TRUE AND (? IS NULL OR parent_code = ?) ORDER BY name ASC",
    [level, parentCode, parentCode],
  );
  return rows.map((row) => ({ code: String(row.code), name: String(row.name), level: row.level as LocationLevel, parentCode: row.parentCode === null ? null : String(row.parentCode) }));
}

export async function listCategories(): Promise<unknown[]> {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT code, label, display_order AS displayOrder FROM product_categories WHERE active = TRUE ORDER BY display_order ASC");
  return rows.map((row) => ({ code: String(row.code), label: String(row.label), displayOrder: Number(row.displayOrder) }));
}

async function secondaryCategoriesByProduct(productIds: number[]): Promise<Map<number, SecondaryRow[]>> {
  const secondaryByProduct = new Map<number, SecondaryRow[]>();
  if (productIds.length === 0) return secondaryByProduct;
  const productPlaceholders = productIds.map(() => "?").join(", ");
  const [secondaryRows] = await db.execute<SecondaryRow[]>(
    `SELECT a.product_id, a.category_code, pc.label, a.position
     FROM product_category_assignments a JOIN product_categories pc ON pc.code = a.category_code AND pc.active = TRUE
     WHERE a.product_id IN (${productPlaceholders}) ORDER BY a.position ASC`,
    productIds,
  );
  for (const secondary of secondaryRows) {
    const current = secondaryByProduct.get(Number(secondary.product_id)) ?? [];
    current.push(secondary);
    secondaryByProduct.set(Number(secondary.product_id), current);
  }
  return secondaryByProduct;
}

async function getProductRows(shopIds: number[], search: ShopSearchParams, limitPerShop: number | null): Promise<Map<number, ProductSummary[]>> {
  if (shopIds.length === 0) return new Map();
  const placeholders = shopIds.map(() => "?").join(", ");
  const conditions = productConditions(search);
  const [rows] = await db.execute<ProductRow[]>(
    `SELECT p.id, p.shop_id, p.name, p.price_idr, p.description, p.media_id, p.primary_category_code, p.available, pc.label AS primary_category_label
     FROM products p JOIN product_categories pc ON pc.code = p.primary_category_code AND pc.active = TRUE
     WHERE p.shop_id IN (${placeholders}) AND ${conditions.sql.join(" AND ")}
     ORDER BY p.created_at DESC, p.id DESC`,
    [...shopIds, ...conditions.params],
  );
  const secondaryByProduct = await secondaryCategoriesByProduct(rows.map((row) => Number(row.id)));
  const result = new Map<number, ProductSummary[]>();
  for (const row of rows) {
    const shopProducts = result.get(Number(row.shop_id)) ?? [];
    if (limitPerShop === null || shopProducts.length < limitPerShop) shopProducts.push(productFromRow(row, secondaryByProduct.get(Number(row.id)) ?? []));
    result.set(Number(row.shop_id), shopProducts);
  }
  return result;
}

const SHOP_SELECT = `SELECT s.id, s.name, s.slug, s.description, s.profile_media_id, s.address_detail,
  se.phone_e164,
  s.province_code, province.name AS province_name, s.city_regency_code, city.name AS city_regency_name,
  s.district_code, district.name AS district_name
  FROM shops s JOIN sellers se ON se.id = s.seller_id
  JOIN locations province ON province.code = s.province_code AND province.level = 'PROVINCE' AND province.active = TRUE
  JOIN locations city ON city.code = s.city_regency_code AND city.level = 'CITY_REGENCY' AND city.active = TRUE
  JOIN locations district ON district.code = s.district_code AND district.level = 'DISTRICT' AND district.active = TRUE`;

export async function listPublicShops(search: ShopSearchParams): Promise<ShopSearchResponse> {
  await validatePublicSearch(search);
  const location = locationConditions(search);
  const products = productConditions(search);
  const hasProductFilters = Boolean(search.q || search.categoryCode);
  const where = ["s.visibility_status = 'PUBLISHED'", "se.status = 'ACTIVE'", ...location.sql, ...(hasProductFilters ? [`EXISTS (SELECT 1 FROM products p WHERE p.shop_id = s.id AND ${products.sql.join(" AND ")})`] : [])];
  const baseParams = [...location.params, ...(hasProductFilters ? products.params : [])];
  const [countRows] = await db.execute<RowDataPacket[]>(`SELECT COUNT(DISTINCT s.id) AS total FROM shops s JOIN sellers se ON se.id = s.seller_id WHERE ${where.join(" AND ")}`, baseParams);
  const total = Number(countRows[0]?.total ?? 0);
  const limit = parseLimit(search.limit === undefined ? null : String(search.limit));
  const offset = parseOffset(search.cursor ?? null);
  const [rows] = await db.execute<ShopRow[]>(
    `${SHOP_SELECT} WHERE ${where.join(" AND ")} ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    [...baseParams, limit, offset],
  );
  const productMap = await getProductRows(rows.map((row) => Number(row.id)), search, 4);
  const items: ShopSearchItem[] = rows.map((row) => ({ shop: shopFromRow(row), matchingProducts: productMap.get(Number(row.id)) ?? [] }));
  return { appliedFilters: search, resultCount: total, nextCursor: offset + items.length < total ? String(offset + items.length) : null, items };
}

export async function listPublicProducts(search: ProductSearchParams): Promise<ProductSearchResponse> {
  await validatePublicSearch(search);
  const location = locationConditions(search);
  const products = productConditions(search);
  const where = [
    "s.visibility_status = 'PUBLISHED'",
    "se.status = 'ACTIVE'",
    ...location.sql,
    ...products.sql,
  ];
  const params = [...location.params, ...products.params];
  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM products p JOIN shops s ON s.id = p.shop_id JOIN sellers se ON se.id = s.seller_id
     WHERE ${where.join(" AND ")}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);
  const limit = parseLimit(search.limit === undefined ? null : String(search.limit));
  const offset = parseOffset(search.cursor ?? null);
  const [rows] = await db.execute<PublicProductRow[]>(
    `SELECT p.id, p.shop_id, p.name, p.price_idr, p.description, p.media_id, p.primary_category_code, p.available, pc.label AS primary_category_label,
       s.name AS shop_name, s.slug AS shop_slug, s.profile_media_id AS shop_profile_media_id, s.address_detail,
       s.province_code, province.name AS province_name, s.city_regency_code, city.name AS city_regency_name,
       s.district_code, district.name AS district_name
     FROM products p
       JOIN shops s ON s.id = p.shop_id
       JOIN sellers se ON se.id = s.seller_id
       JOIN product_categories pc ON pc.code = p.primary_category_code AND pc.active = TRUE
       JOIN locations province ON province.code = s.province_code AND province.level = 'PROVINCE' AND province.active = TRUE
       JOIN locations city ON city.code = s.city_regency_code AND city.level = 'CITY_REGENCY' AND city.active = TRUE
       JOIN locations district ON district.code = s.district_code AND district.level = 'DISTRICT' AND district.active = TRUE
     WHERE ${where.join(" AND ")}
     ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const secondaryByProduct = await secondaryCategoriesByProduct(rows.map((row) => Number(row.id)));
  const items: PublicProduct[] = rows.map((row) => ({
    ...productFromRow(row, secondaryByProduct.get(Number(row.id)) ?? []),
    shop: {
      id: Number(row.shop_id),
      name: row.shop_name,
      slug: row.shop_slug,
      profileImageUrl: row.shop_profile_media_id === null ? null : `/media/${row.shop_profile_media_id}`,
      address: {
        addressDetail: row.address_detail,
        provinceCode: row.province_code,
        provinceName: row.province_name,
        cityRegencyCode: row.city_regency_code,
        cityRegencyName: row.city_regency_name,
        districtCode: row.district_code,
        districtName: row.district_name,
      },
    },
  }));
  return { appliedFilters: search, resultCount: total, nextCursor: offset + items.length < total ? String(offset + items.length) : null, items };
}

export async function getPublicShop(slug: string): Promise<PublicShop | null> {
  if (validateShopSlug(slug.toLowerCase()).length > 0) return null;
  const [rows] = await db.execute<ShopRow[]>(`${SHOP_SELECT} WHERE LOWER(s.slug) = LOWER(?) AND s.visibility_status = 'PUBLISHED' AND se.status = 'ACTIVE' LIMIT 1`, [slug]);
  const row = rows[0];
  if (!row) return null;
  const productMap = await getProductRows([Number(row.id)], {}, null);
  return { ...shopFromRow(row), phone: row.phone_e164 ?? "", description: row.description, products: productMap.get(Number(row.id)) ?? [] };
}

export async function listPublishedShopSlugs(): Promise<string[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT s.slug FROM shops s JOIN sellers se ON se.id = s.seller_id WHERE s.visibility_status = 'PUBLISHED' AND se.status = 'ACTIVE' ORDER BY s.created_at DESC, s.id DESC",
  );
  return rows.map((row) => String(row.slug));
}

function cleanCustomerText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

export async function createWhatsAppLink(slug: string, items: WhatsAppItemInput[], customerName: unknown, customerNote: unknown): Promise<WhatsAppLinkResult> {
  const shop = await getPublicShop(slug);
  if (!shop || !shop.phone) throw new HttpError(404, "SHOP_NOT_FOUND", "Toko tidak ditemukan.");
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new HttpError(400, "INVALID_CART", "Keranjang tidak valid.");
  const normalized = items.map((item) => {
    const productId = String(item?.productId ?? "");
    const quantity = Number(item?.quantity);
    if (!/^\d+$/.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new HttpError(400, "INVALID_CART", "Produk atau jumlah dalam keranjang tidak valid.");
    return { productId, quantity };
  });
  if (new Set(normalized.map((item) => item.productId)).size !== normalized.length) throw new HttpError(400, "INVALID_CART", "Produk duplikat tidak boleh ada dalam keranjang.");
  const placeholders = normalized.map(() => "?").join(", ");
  const [rows] = await db.execute<ProductRow[]>(
    `SELECT p.id, p.shop_id, p.name, p.price_idr, p.description, p.media_id, p.primary_category_code, p.available, pc.label AS primary_category_label
     FROM products p JOIN product_categories pc ON pc.code = p.primary_category_code AND pc.active = TRUE
     WHERE p.shop_id = ? AND p.id IN (${placeholders}) AND p.available = TRUE AND p.visibility_status = 'PUBLISHED'`,
    [shop.id, ...normalized.map((item) => item.productId)],
  );
  if (rows.length !== normalized.length) throw new HttpError(409, "CART_CHANGED", "Ada produk yang sudah tidak tersedia. Perbarui keranjang Anda.");
  const rowById = new Map(rows.map((row) => [String(row.id), row]));
  const resultItems = normalized.map((item) => {
    const row = rowById.get(item.productId);
    if (!row) throw new HttpError(409, "CART_CHANGED", "Ada produk yang sudah tidak tersedia. Perbarui keranjang Anda.");
    const unitPriceIdr = Number(row.price_idr);
    return { productId: item.productId, name: row.name, quantity: item.quantity, unitPriceIdr, lineTotalIdr: unitPriceIdr * item.quantity };
  });
  const subtotalIdr = resultItems.reduce((sum, item) => sum + item.lineTotalIdr, 0);
  const name = cleanCustomerText(customerName, 100);
  const note = cleanCustomerText(customerNote, 500);
  const messageLines = [
    `Halo, saya ingin memesan dari ${shop.name}.`,
    name ? `Nama pelanggan: ${name}` : "",
    "",
    ...resultItems.map((item) => `- ${item.name} x${item.quantity} = ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.lineTotalIdr)}`),
    `Subtotal: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(subtotalIdr)}`,
    note ? `Catatan: ${note}` : "",
    "",
    "Mohon konfirmasi ketersediaan, pembayaran, dan pengiriman.",
  ].filter(Boolean);
  const phone = normalizeIndonesianPhone(shop.phone).value.replace(/\D/g, "");
  recordAuditSafely("SYSTEM", null, "whatsapp_link_generated", "SHOP", shop.id, { productCount: resultItems.length, subtotalIdr });
  return { shop: { name: shop.name }, items: resultItems, subtotalIdr, whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(messageLines.join("\n"))}` };
}
