import type { LocationLevel, ShopSearchParams } from "../../shared/types";
import { createWhatsAppLink, listCategories, listLocations, listPublicShops, getPublicShop, type WhatsAppItemInput } from "../public-service";
import { HttpError, json, methodNotAllowed, readJson } from "../http";

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
  if (segments[1] === "shops" && segments.length === 2) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json(await listPublicShops(searchFromUrl(url)));
  }
  if (segments[1] === "shops" && segments.length === 3) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const shop = await getPublicShop(segments[2] ?? "");
    return shop ? json(shop) : json({ error: { code: "SHOP_NOT_FOUND", message: "Toko tidak ditemukan." } }, 404);
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
  throw new HttpError(404, "NOT_FOUND", "Rute API tidak ditemukan.");
}
