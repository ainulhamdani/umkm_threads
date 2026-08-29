import { authenticateAdmin, getAdsenseSettings, listAdminProducts, listAdminSellers, listAuditLogs, resetSellerPin, setProductVisibility, setShopVisibility, updateAdsenseSettings } from "../admin-service";
import { clientIp, HttpError, json, methodNotAllowed, readJson } from "../http";
import { config } from "../../shared/config";
import { appendCookie, assertCsrf, clearCookie, createAdminSession, requireAdmin, revokeAdminSession, ADMIN_SESSION_COOKIE } from "../session";
import { checkLoginRateLimit, clearLoginFailures, recordLoginFailure } from "../rate-limit";

const sessionMaxAge = config.sessionDays * 24 * 60 * 60;

function sessionResponse(data: unknown, token: string): Response { return appendCookie(json(data), ADMIN_SESSION_COOKIE, token, sessionMaxAge, true); }
function booleanBody(body: Record<string, unknown>): boolean { if (typeof body.visible !== "boolean") throw new HttpError(400, "VALIDATION_ERROR", "Visibilitas harus berupa pilihan benar atau salah."); return body.visible; }

export async function handleAdminRoute(request: Request, segments: string[]): Promise<Response> {
  const resource = segments[2];
  const id = segments[3];
  if (resource === "login" && segments.length === 3) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    assertCsrf(request);
    const body = await readJson(request);
    const rawEmail = typeof body.email === "string" ? body.email : "kosong";
    const key = `${clientIp(request)}:${rawEmail.trim().toLowerCase()}`;
    checkLoginRateLimit(key);
    try {
      const result = await authenticateAdmin(body.email, body.password);
      clearLoginFailures(key);
      const token = await createAdminSession(result.adminId);
      return sessionResponse({ adminId: result.adminId }, token);
    } catch (error) {
      if (error instanceof HttpError && error.code === "LOGIN_FAILED") recordLoginFailure(key);
      throw error;
    }
  }
  if (resource === "logout" && segments.length === 3) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    assertCsrf(request);
    await revokeAdminSession(request);
    return clearCookie(json({ success: true }), ADMIN_SESSION_COOKIE, true);
  }
  const session = await requireAdmin(request);
  if (resource === "sellers" && segments.length === 3) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ items: await listAdminSellers(new URL(request.url).searchParams.get("q")) });
  }
  if (resource === "sellers" && id && segments[4] === "pin-reset" && segments.length === 5) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    assertCsrf(request);
    return json(await resetSellerPin(session.adminId, id));
  }
  if (resource === "shops" && id && segments[4] === "visibility" && segments.length === 5) {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    assertCsrf(request);
    await setShopVisibility(session.adminId, id, booleanBody(await readJson(request)));
    return json({ success: true });
  }
  if (resource === "products" && id && segments[4] === "visibility" && segments.length === 5) {
    if (request.method !== "PATCH") return methodNotAllowed(["PATCH"]);
    assertCsrf(request);
    await setProductVisibility(session.adminId, id, booleanBody(await readJson(request)));
    return json({ success: true });
  }
  if (resource === "products" && segments.length === 3) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ items: await listAdminProducts(new URL(request.url).searchParams.get("q")) });
  }
  if (resource === "adsense" && segments.length === 3) {
    if (request.method === "GET") return json(await getAdsenseSettings());
    if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);
    assertCsrf(request);
    return json(await updateAdsenseSettings(session.adminId, await readJson(request)));
  }
  if (resource === "audit-logs" && segments.length === 3) {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ items: await listAuditLogs() });
  }
  throw new HttpError(404, "NOT_FOUND", "Rute superadmin tidak ditemukan.");
}
