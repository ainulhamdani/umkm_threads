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

function expectStatus(result: { status: number; body: any }, expected: number): void {
  if (result.status !== expected) throw new Error(`Status ${result.status}, expected ${expected}: ${JSON.stringify(result.body)}`);
}

const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 0, 1, 0, 0, 5, 0, 1, 13, 10, 44, 66, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

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
  console.log("HTTP verifikasi berhasil.");
} finally {
  const connection = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password, database: config.db.name });
  try {
    if (productId) await connection.execute("DELETE FROM product_category_assignments WHERE product_id = ?", [productId]);
    if (shopId) { await connection.execute("DELETE FROM products WHERE shop_id = ?", [shopId]); await connection.execute("DELETE FROM shops WHERE id = ?", [shopId]); }
    if (sellerId) { await connection.execute("DELETE FROM seller_sessions WHERE seller_id = ?", [sellerId]); await connection.execute("DELETE FROM sellers WHERE id = ?", [sellerId]); }
    if (shopId) await connection.execute("DELETE FROM audit_logs WHERE target_type = 'SHOP' AND target_id = ?", [shopId]);
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
