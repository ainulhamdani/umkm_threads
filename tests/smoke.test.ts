import { describe, expect, test } from "bun:test";
import { formatIdr, ui } from "../src/shared/i18n";

describe("fondasi lokalizasinya", () => {
  test("menggunakan label Bahasa Indonesia", () => {
    expect(ui.searchPlaceholder).toBe("Cari nama atau deskripsi produk");
    expect(ui.clearFilters).toBe("Hapus filter");
  });

  test("memformat harga dalam IDR tanpa pecahan", () => {
    expect(formatIdr(125000)).toContain("125.000");
    expect(formatIdr(125000)).toContain("Rp");
  });
});
