import { config } from "../shared/config";
import { HttpError } from "./http";

type PictShareResponse = {
  status?: unknown;
  hash?: unknown;
  url?: unknown;
  reason?: unknown;
};

export type PictShareUpload = {
  hash: string;
  url: string;
};

const HASH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function baseUrl(value: string, variableName: string): string {
  const input = value.trim();
  if (!input) {
    throw new HttpError(503, "IMAGE_SERVICE_NOT_CONFIGURED", `${variableName} belum dikonfigurasi.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch (error) {
    console.error(`Konfigurasi ${variableName} bukan URL yang valid.`, error);
    throw new HttpError(503, "IMAGE_SERVICE_NOT_CONFIGURED", `${variableName} harus berupa URL HTTP atau HTTPS yang valid.`);
  }
  if (!HTTP_PROTOCOLS.has(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new HttpError(503, "IMAGE_SERVICE_NOT_CONFIGURED", `${variableName} harus berupa URL HTTP atau HTTPS tanpa kredensial atau query.`);
  }
  return parsed.toString().replace(/\/+$/, "");
}

function responseObject(value: unknown): PictShareResponse | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PictShareResponse : null;
}

function responseUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return HTTP_PROTOCOLS.has(parsed.protocol);
  } catch (error) {
    console.warn("URL media dari PictShare tidak valid.", error);
    return false;
  }
}

function timeoutMs(): number {
  if (!Number.isSafeInteger(config.pictshare.timeoutMs) || config.pictshare.timeoutMs < 1_000 || config.pictshare.timeoutMs > 120_000) {
    throw new HttpError(500, "INVALID_IMAGE_SERVICE_CONFIG", "PICTSHARE_TIMEOUT_MS harus berada di antara 1000 dan 120000 milidetik.");
  }
  return config.pictshare.timeoutMs;
}

export function buildPictShareImageUrl(publicUrl: string, hash: string): string {
  if (!HASH_PATTERN.test(hash)) throw new Error("Hash PictShare tidak valid.");
  return `${baseUrl(publicUrl, "PICTSHARE_PUBLIC_URL")}/${encodeURIComponent(hash)}`;
}

export async function uploadToPictShare(fileName: string, mimeType: string, bytes: Uint8Array<ArrayBuffer>): Promise<PictShareUpload> {
  const apiEndpoint = `${baseUrl(config.pictshare.apiUrl, "PICTSHARE_API_URL")}/api/upload.php`;
  const publicUrl = baseUrl(config.pictshare.publicUrl, "PICTSHARE_PUBLIC_URL");
  const form = new FormData();
  form.append("file", new File([bytes], fileName || "image", { type: mimeType }));
  if (config.pictshare.uploadCode) form.append("uploadcode", config.pictshare.uploadCode);

  let response: Response;
  try {
    response = await fetch(apiEndpoint, { method: "POST", body: form, signal: AbortSignal.timeout(timeoutMs()) });
  } catch (error) {
    console.error("Gagal terhubung ke layanan PictShare.", error);
    throw new HttpError(503, "IMAGE_SERVICE_UNAVAILABLE", "Layanan penyimpanan gambar sedang tidak tersedia.");
  }

  let bodyText: string;
  try {
    bodyText = await response.text();
  } catch (error) {
    console.error("Respons layanan PictShare tidak dapat dibaca.", error);
    throw new HttpError(502, "IMAGE_UPLOAD_FAILED", "Respons layanan penyimpanan gambar tidak dapat dibaca.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch (error) {
    console.warn("Respons layanan PictShare bukan JSON.", { status: response.status, error });
    throw new HttpError(502, "IMAGE_UPLOAD_FAILED", "Respons layanan penyimpanan gambar tidak valid.");
  }

  const result = responseObject(payload);
  const reason = typeof result?.reason === "string" ? result.reason.slice(0, 200) : "tidak diketahui";
  if (!response.ok || result?.status !== "ok") {
    console.warn("PictShare menolak unggahan.", { status: response.status, reason });
    throw new HttpError(502, "IMAGE_UPLOAD_FAILED", "Layanan penyimpanan gambar menolak unggahan.");
  }

  const hash = typeof result.hash === "string" ? result.hash : "";
  if (!HASH_PATTERN.test(hash) || !responseUrl(result.url)) {
    console.error("Respons sukses PictShare tidak memiliki hash atau URL yang valid.");
    throw new HttpError(502, "IMAGE_UPLOAD_FAILED", "Respons layanan penyimpanan gambar tidak lengkap.");
  }

  return { hash, url: `${publicUrl}/${encodeURIComponent(hash)}` };
}
