import type { LocationLevel, LocationOption, ProductCategory, PublicShop, ShopSearchParams, ShopSearchResponse } from "../shared/types";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { accept: "application/json", ...init?.headers } });
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
