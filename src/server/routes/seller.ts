import { clientIp, HttpError, json, methodNotAllowed, readJson } from "../http";
import { config } from "../../shared/config";
import { authenticateSeller, changeSellerPhone, changeSellerPin, createShop, getSellerMe, getSellerShop, registerSeller, updateShop, type ShopMutation } from "../seller-service";
import { createSellerProduct, listSellerProducts, updateSellerProduct, type ProductMutation } from "../product-service";
import { appendCookie, assertCsrf, clearCookie, createSellerSession, getSellerSession, requireSeller, revokeAllSellerSessions, revokeSellerSession, SELLER_SESSION_COOKIE } from "../session";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from "../rate-limit";
import { recordAuditSafely } from "../audit";
import { normalizeIndonesianPhone } from "../../shared/validation";

const sessionMaxAge = config.sessionDays * 24 * 60 * 60;

function sessionResponse(data: unknown, token: string): Response {
  return appendCookie(json(data), SELLER_SESSION_COOKIE, token, sessionMaxAge, true);
}

async function writableSeller(request: Request) {
  const session = await requireSeller(request);
  if (session.pinResetRequired) throw new HttpError(403, "PIN_CHANGE_REQUIRED", "Ganti PIN terlebih dahulu sebelum melanjutkan.");
  return session;
}

export async function handleSellerRoute(request: Request, segments: string[]): Promise<Response> {
  const resource = segments[2];
  const id = segments[3];
  if (resource === "register" && segments.length === 3) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    assertCsrf(request);
    const body = await readJson(request);
    const result = await registerSeller(body.phone, body.pin);
    const token = await createSellerSession(result.sellerId);
    return sessionResponse({ sellerId: result.sellerId, setupRequired: true }, token);
  }
  if (resource === "login" && segments.length === 3) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    assertCsrf(request);
    const body = await readJson(request);
    const rawPhone = typeof body.phone === "string" ? body.phone : "kosong";
    const normalizedPhone = normalizeIndonesianPhone(rawPhone);
    const rateKeyPhone = normalizedPhone.errors.length === 0 ? normalizedPhone.value : rawPhone.trim().replace(/[\s().-]/g, "").toLowerCase();
    const key = `${clientIp(request)}:${rateKeyPhone}`;
    checkLoginRateLimit(key);
    try {
      const result = await authenticateSeller(body.phone, body.pin);
      clearLoginFailures(key);
      await revokeAllSellerSessions(result.sellerId);
      const token = await createSellerSession(result.sellerId);
      return sessionResponse({ sellerId: result.sellerId }, token);
    } catch (error) {
      if (error instanceof HttpError && error.code === "LOGIN_FAILED") {
        recordLoginFailure(key);
        recordAuditSafely("SYSTEM", null, "seller_login_failure");
      }
      throw error;
    }
  }
  if (resource === "logout" && segments.length === 3) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    assertCsrf(request);
    await revokeSellerSession(request);
    const response = json({ success: true });
    return clearCookie(response, SELLER_SESSION_COOKIE, true);
  }
  if (resource === "me" && segments.length === 3) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const session = await requireSeller(request);
    return json(await getSellerMe(session.sellerId));
  }
  if (resource === "phone" && segments.length === 3) {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    assertCsrf(request);
    const session = await writableSeller(request);
    const body = await readJson(request);
    await changeSellerPhone(session.sellerId, body.currentPin, body.newPhone);
    const token = await createSellerSession(session.sellerId);
    return sessionResponse({ success: true }, token);
  }
  if (resource === "pin" && segments.length === 3) {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    assertCsrf(request);
    const session = await requireSeller(request);
    const body = await readJson(request);
    await changeSellerPin(session.sellerId, body.currentPin, body.newPin);
    const token = await createSellerSession(session.sellerId);
    return sessionResponse({ success: true, pinResetRequired: false }, token);
  }
  if (resource === "shop" && segments.length === 3) {
    if (request.method === "GET") {
      const session = await requireSeller(request);
      return json(await getSellerShop(session.sellerId));
    }
    if (request.method !== "POST" && request.method !== "PATCH") return methodNotAllowed(["GET", "POST", "PATCH"]);
    assertCsrf(request);
    const session = await writableSeller(request);
    const body = await readJson(request);
    const result = request.method === "POST" ? await createShop(session.sellerId, body as unknown as ShopMutation) : await updateShop(session.sellerId, body as unknown as ShopMutation & Record<string, unknown>);
    return json(result, request.method === "POST" ? 201 : 200);
  }
  if (resource === "products" && segments.length === 3) {
    const session = await (request.method === "GET" ? requireSeller(request) : writableSeller(request));
    if (request.method === "GET") return json({ items: await listSellerProducts(session.sellerId) });
    if (request.method !== "POST") return methodNotAllowed(["GET", "POST"]);
    assertCsrf(request);
    const body = await readJson(request);
    return json(await createSellerProduct(session.sellerId, body as unknown as ProductMutation), 201);
  }
  if (resource === "products" && id && segments.length === 4) {
    const session = await (request.method === "GET" ? requireSeller(request) : writableSeller(request));
    if (request.method === "GET") {
      const products = await listSellerProducts(session.sellerId);
      const product = products.find((item) => String(item.id) === id);
      return product ? json(product) : json({ error: { code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan." } }, 404);
    }
    if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);
    assertCsrf(request);
    const body = await readJson(request);
    return json(await updateSellerProduct(session.sellerId, id, body as unknown as ProductMutation & Record<string, unknown>));
  }
  throw new HttpError(404, "NOT_FOUND", "Rute penjual tidak ditemukan.");
}
