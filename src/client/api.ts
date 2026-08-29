import type { LocationLevel, LocationOption, ProductCategory, PublicShop, SellerProduct, ShopSearchParams, ShopSearchResponse } from "../shared/types";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

function readCookie(name: string): string | null {
  const part = document.cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie("threads_csrf");
  if (existing) return existing;
  const response = await fetch("/api/csrf", { headers: { accept: "application/json" } });
  if (!response.ok) throw new ApiError(response.status, "CSRF_FAILED", "Perlindungan keamanan tidak dapat disiapkan.");
  const body = await response.json() as { token: string };
  return body.token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (method !== "GET" && method !== "HEAD") headers.set("x-csrf-token", await ensureCsrfToken());
  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | T | null;
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    throw new ApiError(response.status, error?.code ?? "REQUEST_FAILED", error?.message ?? "Permintaan tidak berhasil.");
  }
  return payload as T;
}

export function listShops(params: ShopSearchParams): Promise<ShopSearchResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
  const suffix = query.toString();
  return request<ShopSearchResponse>(`/api/shops${suffix ? `?${suffix}` : ""}`);
}

export function getLocations(level: LocationLevel, parentCode?: string): Promise<{ items: LocationOption[] }> {
  const query = new URLSearchParams({ level });
  if (parentCode) query.set("parentCode", parentCode);
  return request<{ items: LocationOption[] }>(`/api/locations?${query.toString()}`);
}

export function getCategories(): Promise<{ items: ProductCategory[] }> {
  return request<{ items: ProductCategory[] }>("/api/product-categories");
}

export function getShop(slug: string): Promise<PublicShop> {
  return request<PublicShop>(`/api/shops/${encodeURIComponent(slug)}`);
}

export type WhatsAppCartLine = { productId: number; quantity: number };
export type WhatsAppLinkResponse = { whatsappUrl: string; subtotalIdr: number };

export function createWhatsAppLink(slug: string, items: WhatsAppCartLine[], customerName: string, customerNote: string): Promise<WhatsAppLinkResponse> {
  return request<WhatsAppLinkResponse>(`/api/shops/${encodeURIComponent(slug)}/whatsapp-link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items, customerName, customerNote }),
  });
}

export type SellerShop = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  profileMediaId: number | null;
  profileImageUrl: string | null;
  provinceCode: string;
  provinceName: string;
  cityRegencyCode: string;
  cityRegencyName: string;
  districtCode: string;
  districtName: string;
  addressDetail: string;
  visibilityStatus: string;
};

export type SellerMe = { seller: { id: number; phone: string; pinResetRequired: boolean }; shop: SellerShop | null; productCount: number; availableProductCount: number };

export function registerSeller(phone: string, pin: string): Promise<{ sellerId: number; setupRequired: boolean }> {
  return request("/api/seller/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, pin }) });
}

export function loginSeller(phone: string, pin: string): Promise<{ sellerId: number }> {
  return request("/api/seller/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, pin }) });
}

export function logoutSeller(): Promise<{ success: boolean }> {
  return request("/api/seller/logout", { method: "POST" });
}

export function getSellerMe(): Promise<SellerMe> { return request<SellerMe>("/api/seller/me"); }
export function getSellerShop(): Promise<SellerShop> { return request<SellerShop>("/api/seller/shop"); }
export function createSellerShop(input: Record<string, unknown>): Promise<SellerShop> { return request<SellerShop>("/api/seller/shop", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); }
export function updateSellerShop(input: Record<string, unknown>): Promise<SellerShop> { return request<SellerShop>("/api/seller/shop", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); }
export function changeSellerPhone(currentPin: string, newPhone: string): Promise<{ success: boolean }> { return request("/api/seller/phone", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPin, newPhone }) }); }
export function changeSellerPin(currentPin: string, newPin: string): Promise<{ success: boolean }> { return request("/api/seller/pin", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPin, newPin }) }); }
export function listSellerProducts(): Promise<{ items: SellerProduct[] }> { return request("/api/seller/products"); }
export function createSellerProduct(input: Record<string, unknown>): Promise<SellerProduct> { return request("/api/seller/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); }
export function updateSellerProduct(id: number, input: Record<string, unknown>): Promise<SellerProduct> { return request(`/api/seller/products/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); }

export function uploadMedia(file: File, altText: string): Promise<{ id: number; url: string; altText: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("altText", altText);
  return request("/api/media", { method: "POST", body: form });
}
