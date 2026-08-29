import { HttpError, json, methodNotAllowed } from "../http";
import { storeImage } from "../media";
import { assertCsrf, getAdminSession, getSellerSession } from "../session";

export async function handleMediaRoute(request: Request, segments: string[]): Promise<Response> {
  if (segments[0] !== "api" || segments[1] !== "media" || segments.length !== 2) throw new HttpError(404, "NOT_FOUND", "Rute media tidak ditemukan.");
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  assertCsrf(request);
  const seller = await getSellerSession(request);
  if (seller) {
    if (seller.pinResetRequired) throw new HttpError(403, "PIN_CHANGE_REQUIRED", "Ganti PIN terlebih dahulu sebelum mengunggah gambar.");
    return json(await storeImage(request, "SELLER", seller.sellerId), 201);
  }
  const admin = await getAdminSession(request);
  if (!admin) throw new HttpError(401, "AUTH_REQUIRED", "Silakan masuk terlebih dahulu.");
  return json(await storeImage(request, "SUPERADMIN", admin.adminId), 201);
}
