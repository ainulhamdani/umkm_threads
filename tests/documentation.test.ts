import { describe, expect, test } from "bun:test";

const prd = await Bun.file("PRD.md").text();
const frd = await Bun.file("FRD.md").text();

describe("dokumen marketplace", () => {
  test("menggunakan versi dan stack yang disepakati", () => {
    expect(prd).toContain("| Version | 1.4 |");
    expect(frd).toContain("| Version | 1.4 |");
    expect(prd).toContain("Bun 1.4.x, React 19.2, and TypeScript");
    expect(frd).toContain("Bun 1.4.x, React 19.2, TypeScript");
    expect(prd).not.toMatch(/Next\.js/i);
    expect(frd).not.toMatch(/Next\.js/i);
  });

  test("memetakan bahasa, lokasi, kategori, pencarian, dan keranjang", () => {
    for (const document of [prd, frd]) {
      expect(document).toContain("Bahasa Indonesia");
      expect(document).toContain("Mobile-first Material Design 3");
      expect(document).toMatch(/province/i);
      expect(document).toMatch(/city\/regency|kabupaten\/kota/i);
      expect(document).toMatch(/district|kecamatan/i);
      expect(document).toMatch(/secondary/i);
      expect(document).toMatch(/whatsapp/i);
    }
    expect(frd).toContain("CLOTHING_FASHION");
    expect(frd).toContain("GET` | `/api/shops`");
    expect(frd).toContain("POST` | `/api/events`");
    expect(frd).toContain("`q`");
    expect(frd).toContain("AND logic");
  });

  test("memiliki traceability matrix dan acceptance scenarios", () => {
    expect(prd).toContain("## 13. MVP acceptance criteria");
    expect(frd).toContain("## 17. Test plan and acceptance scenarios");
    expect(frd).toContain("## 18. Traceability matrix");
    expect(frd).toContain("Bahasa Indonesia application language");
    expect(frd).toContain("Home product search and filtering");
  });
});
