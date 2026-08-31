import { describe, expect, test } from "bun:test";
import { config } from "../src/shared/config";
import { buildPictShareImageUrl, uploadToPictShare } from "../src/server/pictshare";

describe("integrasi PictShare", () => {
  test("membangun URL publik dari hash yang aman", () => {
    expect(buildPictShareImageUrl("https://images.example.com/", "abc123.jpg")).toBe("https://images.example.com/abc123.jpg");
    expect(() => buildPictShareImageUrl("https://images.example.com", "../secret.jpg")).toThrow();
  });

  test("mengirim file dan uploadcode ke API v2", async () => {
    const nativeFetch = globalThis.fetch;
    const previous = { ...config.pictshare };
    let requestUrl = "";
    const captured = { body: null as FormData | null };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input);
      captured.body = init?.body instanceof FormData ? init.body : null;
      return Response.json({ status: "ok", hash: "abc123.jpg", url: "http://internal/abc123.jpg" });
    }) as typeof fetch;
    try {
      Object.assign(config.pictshare, {
        apiUrl: "http://pictshare:80",
        publicUrl: "https://images.example.com",
        uploadCode: "test-upload-code",
        timeoutMs: 30_000,
      });
      const result = await uploadToPictShare("foto.png", "image/png", Uint8Array.from([1, 2, 3]));
      expect(requestUrl).toBe("http://pictshare/api/upload.php");
      if (!captured.body) throw new Error("FormData PictShare tidak ditemukan.");
      expect(captured.body.get("uploadcode")).toBe("test-upload-code");
      const uploadedFile = captured.body.get("file");
      expect(uploadedFile).toBeInstanceOf(File);
      if (!(uploadedFile instanceof File)) throw new Error("File PictShare tidak ditemukan.");
      expect(uploadedFile.name).toBe("foto.png");
      expect(uploadedFile.type).toBe("image/png");
      expect(result).toEqual({ hash: "abc123.jpg", url: "https://images.example.com/abc123.jpg" });
    } finally {
      globalThis.fetch = nativeFetch;
      Object.assign(config.pictshare, previous);
    }
  });
});
