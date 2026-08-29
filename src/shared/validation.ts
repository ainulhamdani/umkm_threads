export const RESERVED_SHOP_SLUGS = new Set([
  "api",
  "admin",
  "assets",
  "favicon.ico",
  "health",
  "login",
  "media",
  "register",
  "robots.txt",
  "seller",
  "sitemap.xml",
  "undefined",
]);

export type ValidationResult<T> = { value: T; errors: string[] };

export function normalizeIndonesianPhone(input: unknown): ValidationResult<string> {
  if (typeof input !== "string") return { value: "", errors: ["Nomor WhatsApp wajib diisi."] };
  const compact = input.trim().replace(/[\s().-]/g, "");
  let digits = compact.startsWith("+") ? compact.slice(1) : compact;
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (!/^628\d{8,11}$/.test(digits)) {
    return { value: `+${digits}`, errors: ["Gunakan nomor seluler Indonesia yang valid, misalnya +628123456789."] };
  }
  return { value: `+${digits}`, errors: [] };
}

export function validatePin(input: unknown): string[] {
  return typeof input === "string" && /^\d{6}$/.test(input) ? [] : ["PIN harus terdiri dari tepat enam angka."];
}

export function validateShopSlug(input: unknown): string[] {
  if (typeof input !== "string") return ["URL toko wajib diisi."];
  const slug = input.trim();
  if (slug.length < 3 || slug.length > 50) return ["URL toko harus berisi 3 sampai 50 karakter."];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return ["URL toko hanya boleh menggunakan huruf kecil, angka, dan tanda hubung."];
  }
  return RESERVED_SHOP_SLUGS.has(slug) ? ["URL toko tersebut sudah dicadangkan aplikasi."] : [];
}

export function validateText(input: unknown, label: string, min: number, max: number): string[] {
  if (typeof input !== "string") return [`${label} wajib diisi.`];
  const length = input.trim().length;
  if (length < min || length > max) return [`${label} harus berisi ${min} sampai ${max} karakter.`];
  return [];
}

export function validatePrice(input: unknown): string[] {
  if (typeof input !== "number" && typeof input !== "string") return ["Harga wajib diisi."];
  const value = typeof input === "number" ? input : Number(input);
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000_000) {
    return ["Harga harus berupa bilangan bulat rupiah yang tidak negatif."];
  }
  return [];
}

export function validateAddressDetail(input: unknown): string[] {
  return validateText(input, "Detail alamat", 5, 500);
}

export function validateImageFile(file: { size: number; type: string }): string[] {
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return ["Ukuran gambar maksimal 5 MB."];
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return ["Format gambar harus JPG, PNG, atau WebP."];
  }
  return [];
}
