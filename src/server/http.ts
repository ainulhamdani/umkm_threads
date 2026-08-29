export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "content-language": "id-ID", ...headers },
  });
}

export function fail(status: number, code: string, message: string, details?: unknown): Response {
  return json({ error: { code, message, details } }, status);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Gunakan format JSON untuk permintaan ini.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.warn("Isi JSON tidak dapat dibaca.", error);
    throw new HttpError(400, "INVALID_JSON", "Isi permintaan tidak dapat dibaca.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "INVALID_JSON", "Isi permintaan harus berupa objek JSON.");
  }
  return body as Record<string, unknown>;
}

export function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
}

export function methodNotAllowed(allowed: string[]): Response {
  return json({ error: { code: "METHOD_NOT_ALLOWED", message: "Metode permintaan tidak didukung." } }, 405, {
    allow: allowed.join(", "),
  });
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
