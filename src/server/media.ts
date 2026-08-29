import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { config } from "../shared/config";
import { validateImageFile, validateText } from "../shared/validation";
import { HttpError } from "./http";
import { db } from "./db";

type MediaRow = RowDataPacket & { id: number; storage_key: string; mime_type: string; original_name: string; alt_text: string };
export type MediaOwnerType = "SELLER" | "SUPERADMIN";

function detectedMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

function extension(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  throw new HttpError(400, "INVALID_IMAGE", "Format gambar tidak didukung.");
}

function imageId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "INVALID_MEDIA", "Media tidak valid.");
  return id;
}

export async function storeImage(request: Request, ownerType: MediaOwnerType, ownerId: number): Promise<{ id: number; url: string; altText: string }> {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "IMAGE_REQUIRED", "Pilih satu gambar terlebih dahulu.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectedMime(bytes);
  if (!mimeType || bytes.byteLength > config.maxImageBytes) throw new HttpError(400, "INVALID_IMAGE", "Gambar harus berupa JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.");
  const imageErrors = validateImageFile({ size: bytes.byteLength, type: mimeType });
  if (imageErrors.length > 0) throw new HttpError(400, "INVALID_IMAGE", imageErrors[0] ?? "Gambar tidak valid.");
  const altText = String(form.get("altText") ?? "").trim();
  const altErrors = validateText(altText, "Teks alternatif", 1, 255);
  if (altErrors.length > 0) throw new HttpError(400, "INVALID_ALT_TEXT", altErrors[0] ?? "Teks alternatif tidak valid.");
  const storageKey = `${crypto.randomUUID()}.${extension(mimeType)}`;
  const filePath = join(config.uploadDir, storageKey);
  await mkdir(config.uploadDir, { recursive: true });
  try {
    await Bun.write(filePath, bytes);
    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO media (storage_key, original_name, mime_type, byte_size, alt_text, owner_type, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [storageKey, file.name.slice(0, 255), mimeType, bytes.byteLength, altText, ownerType, ownerId],
    );
    return { id: Number(result.insertId), url: `/media/${result.insertId}`, altText };
  } catch (error) {
    await unlink(filePath).catch((cleanupError) => console.error("Gagal membersihkan unggahan media.", cleanupError));
    throw error;
  }
}

export async function assertOwnedMedia(mediaIdValue: unknown, ownerType: MediaOwnerType, ownerId: number): Promise<number> {
  const mediaId = imageId(String(mediaIdValue ?? ""));
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id FROM media WHERE id = ? AND owner_type = ? AND owner_id = ? LIMIT 1", [mediaId, ownerType, ownerId]);
  if (rows.length === 0) throw new HttpError(400, "MEDIA_NOT_OWNED", "Gambar tidak ditemukan atau bukan milik akun ini.");
  return mediaId;
}

export async function serveMedia(idValue: string): Promise<Response> {
  const id = imageId(idValue);
  const [rows] = await db.execute<MediaRow[]>("SELECT id, storage_key, mime_type, original_name, alt_text FROM media WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  if (!row) return new Response("Media tidak ditemukan.", { status: 404 });
  const file = Bun.file(join(config.uploadDir, row.storage_key));
  if (!(await file.exists())) return new Response("Media tidak ditemukan.", { status: 404 });
  return new Response(file, { headers: { "content-type": row.mime_type, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}
