import type { ProductCategory } from "./types";

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  { code: "CLOTHING_FASHION", label: "Pakaian dan Mode", displayOrder: 1 },
  { code: "FOOD", label: "Makanan", displayOrder: 2 },
  { code: "DRINKS", label: "Minuman", displayOrder: 3 },
  { code: "BEAUTY_PERSONAL_CARE", label: "Kecantikan dan Perawatan Diri", displayOrder: 4 },
  { code: "HEALTH_WELLNESS", label: "Kesehatan dan Kebugaran", displayOrder: 5 },
  { code: "HOME_HOUSEHOLD", label: "Rumah Tangga", displayOrder: 6 },
  { code: "ELECTRONICS_ACCESSORIES", label: "Elektronik dan Aksesori", displayOrder: 7 },
  { code: "HANDICRAFTS_GIFTS", label: "Kerajinan dan Hadiah", displayOrder: 8 },
  { code: "AGRICULTURE_FRESH_PRODUCE", label: "Pertanian dan Produk Segar", displayOrder: 9 },
  { code: "SERVICES", label: "Jasa", displayOrder: 10 },
  { code: "OTHER", label: "Lainnya", displayOrder: 11 },
];

const categoriesByCode = new Map(PRODUCT_CATEGORIES.map((category) => [category.code, category]));

export function getCategory(code: string): ProductCategory | undefined {
  return categoriesByCode.get(code);
}

export function validateCategorySelection(primaryCode: unknown, secondaryCodes: unknown): string[] {
  const errors: string[] = [];
  if (typeof primaryCode !== "string" || !categoriesByCode.has(primaryCode)) {
    errors.push("Pilih satu kategori utama yang tersedia.");
  }

  if (!Array.isArray(secondaryCodes)) {
    errors.push("Kategori tambahan harus berupa daftar.");
    return errors;
  }

  if (secondaryCodes.some((value) => typeof value !== "string")) errors.push("Kategori tambahan tidak valid.");
  const normalized = secondaryCodes.filter((value): value is string => typeof value === "string");
  if (normalized.length > 2) errors.push("Pilih paling banyak dua kategori tambahan.");
  if (new Set(normalized).size !== normalized.length) errors.push("Kategori tambahan tidak boleh duplikat.");
  if (typeof primaryCode === "string" && normalized.includes(primaryCode)) {
    errors.push("Kategori utama tidak boleh dipilih sebagai kategori tambahan.");
  }
  if (normalized.some((code) => !categoriesByCode.has(code))) errors.push("Ada kategori tambahan yang tidak tersedia.");
  return errors;
}
