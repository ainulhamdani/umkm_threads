import { describe, expect, test } from "bun:test";

const app = await Bun.file("src/client/app.tsx").text();
const home = await Bun.file("src/client/pages/HomePage.tsx").text();
const locationFilters = await Bun.file("src/client/components/LocationFilters.tsx").text();
const sellerDashboard = await Bun.file("src/client/pages/SellerDashboardPage.tsx").text();
const server = await Bun.file("src/server/index.ts").text();

describe("tata letak aplikasi", () => {
  test("menempatkan filter beranda dalam satu baris yang dapat digeser", () => {
    expect(home).toContain('className="filter-scroll"');
    expect(home).toContain('className="filter-row"');
    expect(locationFilters).toContain('className="location-filter-row"');
  });

  test("memiliki halaman terpisah untuk setiap formulir penjual", () => {
    expect(app).toContain('path === "/seller/phone"');
    expect(app).toContain('path === "/seller/pin"');
    expect(server).toContain('"/seller/phone"');
    expect(server).toContain('"/seller/pin"');
    expect(sellerDashboard).toContain("SellerNavigation");
    expect(sellerDashboard).toContain('section === "shop"');
    expect(sellerDashboard).toContain('section === "products"');
    expect(sellerDashboard).toContain('section === "phone"');
    expect(sellerDashboard).toContain('section === "pin"');
  });
});
