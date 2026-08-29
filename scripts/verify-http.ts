import { unlink } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";
import { config } from "../src/shared/config";
import { normalizeIndonesianPhone } from "../src/shared/validation";
import type { RowDataPacket } from "mysql2";

const baseUrl = `http://localhost:${config.port}`;
const cookies = new Map<string, string>();
const uploadedMediaIds: number[] = [];
let sellerId = 0;
let shopId = 0;
let productId = 0;
let fixtureSlug = `verifikasi-${Date.now().toString().slice(-8)}`;
let fixturePhone = `0812345${Date.now().toString().slice(-6)}`;

function absorbCookies(response: Response): void {
  const header = response.headers.get("set-cookie") ?? "";
  for (const match of header.matchAll(/(threads_[^=]+)=([^;]*)/g)) cookies.set(match[1] as string, match[2] as string);
}

async function request(path: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
  const headers = new Headers(init.headers);
  const cookieHeader = Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ");
  if (cookieHeader) headers.set("cookie", cookieHeader);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  absorbCookies(response);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function textRequest(path: string): Promise<{ status: number; headers: Headers; body: string }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, headers: response.headers, body: await response.text() };
}

function expectStatus(result: { status: number; body: any }, expected: number): void {
  if (result.status !== expected) throw new Error(`Status ${result.status}, expected ${expected}: ${JSON.stringify(result.body)}`);
}

const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 0, 1, 0, 0, 5, 0, 1, 13, 10, 44, 66, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
const adminEmail = Bun.env.SUPERADMIN_EMAIL ?? "admin@example.com";
const adminPassword = Bun.env.SUPERADMIN_PASSWORD ?? "change-this-password";

async function upload(altText: string, csrfToken: string): Promise<number> {
  const form = new FormData();
  form.append("file", new File([png], "fixture.png", { type: "image/png" }));
  form.append("altText", altText);
  const result = await request("/api/media", { method: "POST", headers: { "x-csrf-token": csrfToken }, body: form });
  expectStatus(result, 201);
  uploadedMediaIds.push(Number(result.body.id));
  return Number(result.body.id);
}

const csrfResponse = await request("/api/csrf");
expectStatus(csrfResponse, 200);
const csrfToken = String(csrfResponse.body.token);
const jsonHeaders = { "content-type": "application/json", "x-csrf-token": csrfToken };
try {
  const invalidLimit = await request("/api/shops?limit=49");
  expectStatus(invalidLimit, 400);
  const invalidCursor = await request("/api/shops?cursor=abc");
  expectStatus(invalidCursor, 400);
  const invalidLocation = await request("/api/locations?level=CITY_REGENCY&parentCode=31.73");
  expectStatus(invalidLocation, 400);
  const register = await request("/api/seller/register", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ phone: fixturePhone, pin: "123456" }) });
  expectStatus(register, 200);
  sellerId = Number(register.body.sellerId);
  const profileMediaId = await upload("Foto profil verifikasi", csrfToken);
  const location = await request("/api/locations?level=DISTRICT&parentCode=31.73");
  expectStatus(location, 200);
  const districtCode = String(location.body.items[0].code);
  const shop = await request("/api/seller/shop", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Toko Verifikasi", slug: fixtureSlug, profileMediaId, provinceCode: "31", cityRegencyCode: "31.73", districtCode, addressDetail: "Jalan Verifikasi Nomor 1" }) });
  expectStatus(shop, 201);
  shopId = Number(shop.body.id);
  const emptyCatalog = await request("/api/shops");
  expectStatus(emptyCatalog, 200);
  const emptyShop = emptyCatalog.body.items.find((item: { shop: { id: number }; matchingProducts: unknown[] }) => item.shop.id === shopId);
  if (!emptyShop || emptyShop.matchingProducts.length !== 0) throw new Error("Toko tanpa produk tidak muncul di beranda.");
  const productMediaId = await upload("Foto produk verifikasi", csrfToken);
  const product = await request("/api/seller/products", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ mediaId: productMediaId, name: "Nasi Verifikasi", priceIdr: 25000, primaryCategoryCode: "FOOD", secondaryCategoryCodes: ["DRINKS"], description: "Produk untuk verifikasi", available: true }) });
  expectStatus(product, 201);
  productId = Number(product.body.id);
  const filtered = await request(`/api/shops?q=nasi%20verifikasi&provinceCode=31&categoryCode=DRINKS`);
  expectStatus(filtered, 200);
  if (filtered.body.resultCount !== 1 || filtered.body.items[0]?.matchingProducts[0]?.id !== productId) throw new Error("Filter publik tidak menemukan produk melalui kategori sekunder.");
  const publicShop = await request(`/api/shops/${fixtureSlug}`);
  expectStatus(publicShop, 200);
  const whatsapp = await request(`/api/shops/${fixtureSlug}/whatsapp-link`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ items: [{ productId, quantity: 2 }], customerName: "Budi", customerNote: "Kirim sore" }) });
  expectStatus(whatsapp, 200);
  const expectedPhone = normalizeIndonesianPhone(fixturePhone).value.replace(/\D/g, "");
  if (!whatsapp.body.whatsappUrl.includes(`wa.me/${expectedPhone}`) || !decodeURIComponent(whatsapp.body.whatsappUrl).includes("Nasi Verifikasi x2")) throw new Error("Tautan WhatsApp tidak sesuai.");
  const slugMutation = await request("/api/seller/shop", { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ slug: "slug-baru" }) });
  expectStatus(slugMutation, 400);
  const locationMutation = await request("/api/seller/shop", { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ provinceCode: "32", cityRegencyCode: "31.73" }) });
  expectStatus(locationMutation, 400);
  const categoryMutation = await request(`/api/seller/products/${productId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ secondaryCategoryCodes: ["DRINKS", "OTHER", "SERVICES"] }) });
  expectStatus(categoryMutation, 400);
  const unavailable = await request(`/api/seller/products/${productId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ available: false }) });
  expectStatus(unavailable, 200);
  const hiddenFromCatalog = await request(`/api/shops/${fixtureSlug}`);
  expectStatus(hiddenFromCatalog, 200);
  if (hiddenFromCatalog.body.products.length !== 0) throw new Error("Produk tidak tersedia masih muncul di katalog publik.");
  const unavailableOrder = await request(`/api/shops/${fixtureSlug}/whatsapp-link`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ items: [{ productId, quantity: 1 }] }) });
  expectStatus(unavailableOrder, 409);
  const sellerAdminAccess = await request("/api/admin/sellers");
  expectStatus(sellerAdminAccess, 403);
  const sellerAdsAccess = await request("/api/admin/adsense");
  expectStatus(sellerAdsAccess, 403);
  const adminLogin = await request("/api/admin/login", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ email: adminEmail, password: adminPassword }) });
  expectStatus(adminLogin, 200);
  const adminSellers = await request("/api/admin/sellers");
  expectStatus(adminSellers, 200);
  const adminAds = await request("/api/admin/adsense");
  expectStatus(adminAds, 200);
  const hiddenShop = await request(`/api/admin/shops/${shopId}/visibility`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ visible: false }) });
  expectStatus(hiddenShop, 200);
  const hiddenShopPublic = await request(`/api/shops/${fixtureSlug}`);
  expectStatus(hiddenShopPublic, 404);
  const restoredShop = await request(`/api/admin/shops/${shopId}/visibility`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ visible: true }) });
  expectStatus(restoredShop, 200);
  const availableAgain = await request(`/api/seller/products/${productId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ available: true }) });
  expectStatus(availableAgain, 200);
  const hiddenProduct = await request(`/api/admin/products/${productId}/visibility`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ visible: false }) });
  expectStatus(hiddenProduct, 200);
  const hiddenProductPublic = await request(`/api/shops/${fixtureSlug}`);
  expectStatus(hiddenProductPublic, 200);
  if (hiddenProductPublic.body.products.length !== 0) throw new Error("Produk tersembunyi masih muncul di katalog publik.");
  const restoredProduct = await request(`/api/admin/products/${productId}/visibility`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ visible: true }) });
  expectStatus(restoredProduct, 200);
  const restoredPublic = await request(`/api/shops/${fixtureSlug}`);
  expectStatus(restoredPublic, 200);
  if (restoredPublic.body.products.length !== 1) throw new Error("Produk tidak kembali setelah visibilitas dipulihkan.");
  const robots = await textRequest("/robots.txt");
  if (robots.status !== 200 || !robots.body.includes("/sitemap.xml")) throw new Error("Robots belum menunjuk sitemap.");
  const sitemap = await textRequest("/sitemap.xml");
  if (sitemap.status !== 200 || !sitemap.headers.get("content-type")?.includes("application/xml")) throw new Error("Sitemap tidak valid.");
  const unknownPage = await textRequest(`/toko-tidak-ada-${fixtureSlug}`);
  if (unknownPage.status !== 404 || !unknownPage.body.includes("noindex,nofollow")) throw new Error("Halaman toko yang tidak ada tidak mengembalikan 404 noindex.");
  console.log("HTTP verifikasi berhasil.");
} finally {
  await Bun.sleep(100);
  const connection = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password, database: config.db.name });
  try {
    if (productId) await connection.execute("DELETE FROM product_category_assignments WHERE product_id = ?", [productId]);
    if (shopId) { await connection.execute("DELETE FROM products WHERE shop_id = ?", [shopId]); await connection.execute("DELETE FROM shops WHERE id = ?", [shopId]); }
    if (sellerId) { await connection.execute("DELETE FROM seller_sessions WHERE seller_id = ?", [sellerId]); await connection.execute("DELETE FROM sellers WHERE id = ?", [sellerId]); }
    const adminToken = cookies.get("threads_admin_session");
    if (adminToken) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(adminToken));
      const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      await connection.execute("UPDATE superadmin_sessions SET revoked_at = NOW() WHERE token_hash = ?", [tokenHash]);
    }
    if (sellerId || shopId || productId) await connection.execute("DELETE FROM audit_logs WHERE (actor_type = 'SELLER' AND actor_id = ?) OR (target_type = 'SELLER' AND target_id = ?) OR (target_type = 'SHOP' AND target_id = ?) OR (target_type = 'PRODUCT' AND target_id = ?)", [sellerId || null, sellerId || null, shopId || null, productId || null]);
    for (const mediaId of uploadedMediaIds) {
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT storage_key FROM media WHERE id = ?", [mediaId]);
      await connection.execute("DELETE FROM media WHERE id = ?", [mediaId]);
      const storageKey = rows[0]?.storage_key;
      if (storageKey) await unlink(join(config.uploadDir, storageKey)).catch((error) => console.warn("Media fixture tidak dapat dihapus.", error));
    }
  } finally {
    await connection.end();
  }
}

export {};
