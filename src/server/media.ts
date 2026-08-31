import { join } from "node:path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { config } from "../shared/config";
import { validateImageFile, validateText } from "../shared/validation";
import { HttpError } from "./http";
import { db } from "./db";
import { uploadToPictShare } from "./pictshare";

type MediaRow = RowDataPacket & { id: number; storage_key: string; remote_url: string | null; mime_type: string; original_name: string; alt_text: string };
export type MediaOwnerType = "SELLER" | "SUPERADMIN";
type ImageDimensions = { width: number; height: number };

function detectedMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

function safeDimensions(width: number, height: number): ImageDimensions | null {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 20000 && height <= 20000 ? { width, height } : null;
}

function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return safeDimensions(view.getUint32(16), view.getUint32(20));
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2;
  const byteAt = (index: number): number => bytes[index] ?? 0;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined) return null;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) return null;
    const segmentLength = (byteAt(offset) << 8) | byteAt(offset + 1);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (sofMarkers.has(marker) && segmentLength >= 7) {
      const height = (byteAt(offset + 3) << 8) | byteAt(offset + 4);
      const width = (byteAt(offset + 5) << 8) | byteAt(offset + 6);
      return safeDimensions(width, height);
    }
    offset += segmentLength;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 20) return null;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = new TextDecoder().decode(bytes.slice(offset, offset + 4));
    const chunkLength = (bytes[offset + 4] ?? 0) | ((bytes[offset + 5] ?? 0) << 8) | ((bytes[offset + 6] ?? 0) << 16) | ((bytes[offset + 7] ?? 0) << 24);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    if (chunkLength < 0 || dataEnd > bytes.length) return null;
    if (chunkType === "VP8X" && chunkLength >= 10) {
      const width = 1 + (bytes[dataStart + 4] ?? 0) + ((bytes[dataStart + 5] ?? 0) << 8) + ((bytes[dataStart + 6] ?? 0) << 16);
      const height = 1 + (bytes[dataStart + 7] ?? 0) + ((bytes[dataStart + 8] ?? 0) << 8) + ((bytes[dataStart + 9] ?? 0) << 16);
      return safeDimensions(width, height);
    }
    if (chunkType === "VP8L" && chunkLength >= 5 && bytes[dataStart] === 0x2f) {
      const width = 1 + (bytes[dataStart + 1] ?? 0) + (((bytes[dataStart + 2] ?? 0) & 0x3f) << 8);
      const height = 1 + (((bytes[dataStart + 2] ?? 0) >> 6) | ((bytes[dataStart + 3] ?? 0) << 2) | (((bytes[dataStart + 4] ?? 0) & 0x0f) << 10));
      return safeDimensions(width, height);
    }
    if (chunkType === "VP8 " && chunkLength >= 10) {
      for (let index = dataStart; index + 9 < dataEnd; index += 1) {
        if (bytes[index] === 0x9d && bytes[index + 1] === 0x01 && bytes[index + 2] === 0x2a) {
          const width = (bytes[index + 3] ?? 0) | ((bytes[index + 4] ?? 0) << 8);
          const height = (bytes[index + 5] ?? 0) | ((bytes[index + 6] ?? 0) << 8);
          return safeDimensions(width & 0x3fff, height & 0x3fff);
        }
      }
      return null;
    }
    offset = dataEnd + (chunkLength % 2);
  }
  return null;
}

function imageDimensions(bytes: Uint8Array, mimeType: string): ImageDimensions | null {
  if (mimeType === "image/png") return pngDimensions(bytes);
  if (mimeType === "image/jpeg") return jpegDimensions(bytes);
  return webpDimensions(bytes);
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
  const dimensions = imageDimensions(bytes, mimeType);
  if (!dimensions) throw new HttpError(400, "INVALID_IMAGE", "Dimensi gambar tidak dapat dibaca.");
  const imageErrors = validateImageFile({ size: bytes.byteLength, type: mimeType });
  if (imageErrors.length > 0) throw new HttpError(400, "INVALID_IMAGE", imageErrors[0] ?? "Gambar tidak valid.");
  const altText = String(form.get("altText") ?? "").trim();
  const altErrors = validateText(altText, "Teks alternatif", 1, 255);
  if (altErrors.length > 0) throw new HttpError(400, "INVALID_ALT_TEXT", altErrors[0] ?? "Teks alternatif tidak valid.");

  const remote = await uploadToPictShare(file.name.slice(0, 255), mimeType, bytes);
  const storageKey = `pictshare-${crypto.randomUUID()}`;
  try {
    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO media (storage_key, remote_hash, remote_url, original_name, mime_type, byte_size, width, height, alt_text, owner_type, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [storageKey, remote.hash, remote.url, file.name.slice(0, 255), mimeType, bytes.byteLength, dimensions.width, dimensions.height, altText, ownerType, ownerId],
    );
    return { id: Number(result.insertId), url: `/media/${result.insertId}`, altText };
  } catch (error) {
    console.error("Gambar sudah tersimpan di PictShare tetapi metadata media gagal disimpan.", error);
    throw error;
  }
}

export async function markMediaUsed(mediaId: number, ownerType: MediaOwnerType, ownerId: number): Promise<void> {
  await db.execute("UPDATE media SET used_at = COALESCE(used_at, NOW()) WHERE id = ? AND owner_type = ? AND owner_id = ?", [mediaId, ownerType, ownerId]);
}

export async function assertOwnedMedia(mediaIdValue: unknown, ownerType: MediaOwnerType, ownerId: number): Promise<number> {
  const mediaId = imageId(String(mediaIdValue ?? ""));
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id FROM media WHERE id = ? AND owner_type = ? AND owner_id = ? LIMIT 1", [mediaId, ownerType, ownerId]);
  if (rows.length === 0) throw new HttpError(400, "MEDIA_NOT_OWNED", "Gambar tidak ditemukan atau bukan milik akun ini.");
  return mediaId;
}

export async function serveMedia(idValue: string): Promise<Response> {
  const id = imageId(idValue);
  const [rows] = await db.execute<MediaRow[]>("SELECT id, storage_key, remote_url, mime_type, original_name, alt_text FROM media WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  if (!row) return new Response("Media tidak ditemukan.", { status: 404 });
  if (row.remote_url) {
    try {
      const remoteUrl = new URL(row.remote_url);
      if (remoteUrl.protocol !== "http:" && remoteUrl.protocol !== "https:") throw new Error("Protokol URL media tidak didukung.");
      return new Response(null, { status: 302, headers: { location: remoteUrl.toString(), "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
    } catch (error) {
      console.error("URL media PictShare tidak valid.", { mediaId: id, error });
      return new Response("Media tidak ditemukan.", { status: 404 });
    }
  }
  const file = Bun.file(join(config.uploadDir, row.storage_key));
  if (!(await file.exists())) return new Response("Media tidak ditemukan.", { status: 404 });
  return new Response(file, { headers: { "content-type": row.mime_type, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}
