import { describe, expect, test } from "bun:test";

const app = await Bun.file("src/client/app.tsx").text();
const home = await Bun.file("src/client/pages/HomePage.tsx").text();
const locationFilters = await Bun.file("src/client/components/LocationFilters.tsx").text();
const sellerDashboard = await Bun.file("src/client/pages/SellerDashboardPage.tsx").text();
const server = await Bun.file("src/server/index.ts").text();

describe("tata letak aplikasi", () => {
  test("menggunakan utilitas Tailwind pada shell publik", () => {
    expect(app).toContain('className="min-h-screen bg-[#fffbfe] text-[#1d1b20]"');
    expect(app).toContain('className="sticky top-0 z-10 border-b');
    expect(app).toContain('className="mx-auto w-[calc(100%-32px)] max-w-[1120px] pb-20 pt-7 sm:pt-10"');
  });

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
    expect(sellerDashboard).toContain('lg:grid-cols-[240px_minmax(0,1fr)]');
    expect(sellerDashboard).toContain('aria-label="Menu penjual"');
    expect(sellerDashboard).toContain('lg:sticky');
    expect(sellerDashboard).toContain('overflow-x-auto');
    expect(sellerDashboard).toContain('section === "shop"');
    expect(sellerDashboard).toContain('section === "products"');
    expect(sellerDashboard).toContain('section === "phone"');
    expect(sellerDashboard).toContain('section === "pin"');
  });
});
