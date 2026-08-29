import { describe, expect, test } from "bun:test";
import { validateCategorySelection } from "../src/shared/categories";
import { normalizeIndonesianPhone, validatePin, validateShopSlug } from "../src/shared/validation";

describe("validasi marketplace", () => {
  test("menormalisasi nomor Indonesia ke format E.164", () => {
    expect(normalizeIndonesianPhone("0812 3456 789").value).toBe("+628123456789");
    expect(normalizeIndonesianPhone("0812 3456 789").errors).toEqual([]);
  });

  test("menolak PIN selain enam angka", () => {
    expect(validatePin("12345")).not.toEqual([]);
    expect(validatePin("123456")).toEqual([]);
  });

  test("menolak slug jalur aplikasi", () => {
    expect(validateShopSlug("seller")).not.toEqual([]);
    expect(validateShopSlug("toko-bagus")).toEqual([]);
  });

  test("membatasi kategori tambahan dan mencegah duplikat", () => {
    expect(validateCategorySelection("FOOD", ["DRINKS", "BEAUTY_PERSONAL_CARE"]).length).toBe(0);
    expect(validateCategorySelection("FOOD", ["DRINKS", "DRINKS"]).length).toBeGreaterThan(0);
    expect(validateCategorySelection("FOOD", ["DRINKS", "BEAUTY_PERSONAL_CARE", "OTHER"]).length).toBeGreaterThan(0);
    expect(validateCategorySelection("FOOD", ["FOOD"]).length).toBeGreaterThan(0);
  });
});
