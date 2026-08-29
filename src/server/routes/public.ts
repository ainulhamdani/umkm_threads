import type { LocationLevel, ShopSearchParams } from "../../shared/types";
import { getPublicAdPlacement, type AdPlacement } from "../admin-service";
import { createWhatsAppLink, listCategories, listLocations, listPublicShops, getPublicShop, type WhatsAppItemInput } from "../public-service";
import { HttpError, json, methodNotAllowed, readJson } from "../http";
import { appendCookie, assertCsrf, CSRF_COOKIE, issueCsrfToken } from "../session";
import { recordAudit, recordAuditSafely } from "../audit";

const CLIENT_EVENTS = new Set([
  "shop_viewed",
  "home_search_submitted",
  "home_filter_applied",
  "home_search_no_results",
  "product_added_to_cart",
  "whatsapp_link_generated",
  "whatsapp_link_generation_failed",
]);

function safeEventMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowedKeys = new Set(["shopId", "productId", "resultCount", "filterCount", "queryLength", "categoryCode"]);
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!allowedKeys.has(key)) continue;
    if (typeof item === "string") output[key] = item.trim().slice(0, 80);
    else if (typeof item === "number" && Number.isSafeInteger(item) && item >= 0) output[key] = item;
  }
  return output;
}

function optionalText(value: string | null, label: string, maxLength: number): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > maxLength) throw new HttpError(400, "INVALID_QUERY", `${label} terlalu panjang.`);
  return trimmed || undefined;
}

function searchFromUrl(url: URL): ShopSearchParams {
  const search: ShopSearchParams = {
    q: optionalText(url.searchParams.get("q"), "Pencarian", 100),
    provinceCode: optionalText(url.searchParams.get("provinceCode"), "Kode provinsi", 20),
    cityRegencyCode: optionalText(url.searchParams.get("cityRegencyCode"), "Kode kabupaten atau kota", 20),
    districtCode: optionalText(url.searchParams.get("districtCode"), "Kode kecamatan", 20),
    categoryCode: optionalText(url.searchParams.get("categoryCode"), "Kode kategori", 50),
    cursor: optionalText(url.searchParams.get("cursor"), "Penanda halaman", 100),
  };
  const limit = optionalText(url.searchParams.get("limit"), "Batas hasil", 4);
  if (limit) search.limit = Number(limit);
  return search;
}

function locationLevel(value: string | null): LocationLevel {
  const level = value?.toUpperCase();
  if (level !== "PROVINCE" && level !== "CITY_REGENCY" && level !== "DISTRICT") throw new HttpError(400, "INVALID_LOCATION_FILTER", "Tingkat wilayah tidak valid.");
  return level;
}

function asCartItems(value: unknown): WhatsAppItemInput[] {
  if (!Array.isArray(value)) throw new HttpError(400, "INVALID_CART", "Keranjang tidak valid.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new HttpError(400, "INVALID_CART", "Keranjang tidak valid.");
    const record = item as Record<string, unknown>;
    return { productId: String(record.productId ?? ""), quantity: Number(record.quantity) };
  });
}

export async function handlePublicRoute(request: Request, url: URL, segments: string[]): Promise<Response> {
  if (segments[0] !== "api") throw new HttpError(404, "NOT_FOUND", "Rute API tidak ditemukan.");
  if (segments[1] === "csrf" && segments.length === 2) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const csrf = await issueCsrfToken(request);
    const response = json({ token: csrf.token });
    return csrf.existing ? response : appendCookie(response, CSRF_COOKIE, csrf.token, 24 * 60 * 60, false);
  }
  if (segments[1] === "events" && segments.length === 2) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const body = await readJson(request);
    assertCsrf(request);
    const event = typeof body.event === "string" ? body.event.trim() : "";
    if (!CLIENT_EVENTS.has(event)) throw new HttpError(400, "INVALID_EVENT", "Aktivitas tidak valid.");
    await recordAudit("SYSTEM", null, event, null, null, safeEventMetadata(body.metadata));
    return json({ success: true });
  }
  if (segments[1] === "shops" && segments.length === 2) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json(await listPublicShops(searchFromUrl(url)));
  }
  if (segments[1] === "shops" && segments.length === 3) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const shop = await getPublicShop(segments[2] ?? "");
    if (!shop) return json({ error: { code: "SHOP_NOT_FOUND", message: "Toko tidak ditemukan." } }, 404);
    recordAuditSafely("SYSTEM", null, "shop_viewed", "SHOP", shop.id);
    return json(shop);
  }
  if (segments[1] === "shops" && segments.length === 4 && segments[3] === "whatsapp-link") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const body = await readJson(request);
    const result = await createWhatsAppLink(segments[2] ?? "", asCartItems(body.items), body.customerName, body.customerNote);
    return json(result);
  }
  if (segments[1] === "locations" && segments.length === 2) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const parentCode = optionalText(url.searchParams.get("parentCode"), "Kode induk wilayah", 20) ?? null;
    return json({ items: await listLocations(locationLevel(url.searchParams.get("level")), parentCode) });
  }
  if (segments[1] === "product-categories" && segments.length === 2) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ items: await listCategories() });
  }
  if (segments[1] === "adsense" && segments.length === 2) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const placement = url.searchParams.get("placement")?.toUpperCase();
    if (placement !== "HOME" && placement !== "SHOP" && placement !== "SELLER" && placement !== "ADMIN") throw new HttpError(400, "INVALID_AD_PLACEMENT", "Penempatan iklan tidak valid.");
    return json(await getPublicAdPlacement(placement as AdPlacement));
  }
  throw new HttpError(404, "NOT_FOUND", "Rute API tidak ditemukan.");
}
