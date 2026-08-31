import { describe, expect, test } from "bun:test";

const app = await Bun.file("src/client/app.tsx").text();
const home = await Bun.file("src/client/pages/HomePage.tsx").text();
const locationFilters = await Bun.file("src/client/components/LocationFilters.tsx").text();
const sellerDashboard = await Bun.file("src/client/pages/SellerDashboardPage.tsx").text();
const productManager = await Bun.file("src/client/components/ProductManager.tsx").text();
const productEditor = await Bun.file("src/client/components/ProductEditor.tsx").text();
const server = await Bun.file("src/server/index.ts").text();
const adsenseSlot = await Bun.file("src/client/components/AdsenseSlot.tsx").text();

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
    expect(sellerDashboard).toContain('aria-controls="seller-mobile-navigation"');
    expect(sellerDashboard).toContain('fixed inset-y-0 left-0');
    expect(sellerDashboard).toContain('lg:hidden');
    expect(sellerDashboard).toContain('section === "shop"');
    expect(sellerDashboard).toContain('section === "products"');
    expect(sellerDashboard).toContain('section === "phone"');
    expect(sellerDashboard).toContain('section === "pin"');
  });

  test("membuka tambah dan edit produk pada layar terpisah", () => {
    expect(app).toContain('path === "/seller/products/new"');
    expect(app).toContain('^\\/seller\\/products\\/(\\d+)\\/edit$');
    expect(server).toContain('"/seller/products/new"');
    expect(server).toContain("isSellerProductEditRoute");
    expect(productManager).toContain('href="/seller/products/new"');
    expect(productManager).toContain('href={`/seller/products/${product.id}/edit`}');
    expect(productManager).not.toContain("<ProductForm");
    expect(productEditor).toContain("<ProductForm");
    expect(sellerDashboard).toContain('productMode?: "create" | "edit"');
  });

  test("memisahkan halaman superadmin berdasarkan rute", () => {
    for (const route of ["/admin/sellers", "/admin/shops", "/admin/products", "/admin/adsense", "/admin/activity"]) {
      expect(app).toContain(`path === "${route}"`);
      expect(server).toContain(`"${route}"`);
    }
    expect(adminLayout).toContain("AdminNavigation");
    expect(adminLayout).toContain("admin-mobile-navigation");
    expect(adminPage).toContain('activeSection="overview"');
    expect(adminSellers).toContain('activeSection="sellers"');
    expect(adminShops).toContain('activeSection="shops"');
    expect(adminProducts).toContain('activeSection="products"');
    expect(adminAdsense).toContain('activeSection="adsense"');
    expect(adminActivity).toContain('activeSection="activity"');
    expect(adminLayout).not.toContain('href="#sellers"');
    expect(adminLayout).not.toContain('href="#products"');
  });

  test("menyembunyikan iklan yang belum dikonfigurasi dari pengguna non-superadmin", () => {
    expect(adsenseSlot).toContain("showUnavailable = false");
    expect(adsenseSlot).toContain("if (!config) return showUnavailable ?");
    expect(adsenseSlot).toContain("if (!config.enabled) return showUnavailable ?");
    expect(adminLayout).toContain('<AdsenseSlot placement="ADMIN" showUnavailable />');
    expect(home).not.toContain("showUnavailable");
    expect(sellerDashboard).not.toContain("showUnavailable");
  });
});
const adminPage = await Bun.file("src/client/pages/AdminPage.tsx").text();
const adminLayout = await Bun.file("src/client/components/AdminPageLayout.tsx").text();
const adminSellers = await Bun.file("src/client/pages/AdminSellersPage.tsx").text();
const adminShops = await Bun.file("src/client/pages/AdminShopsPage.tsx").text();
const adminProducts = await Bun.file("src/client/pages/AdminProductsPage.tsx").text();
const adminAdsense = await Bun.file("src/client/pages/AdminAdsensePage.tsx").text();
const adminActivity = await Bun.file("src/client/pages/AdminActivityPage.tsx").text();
