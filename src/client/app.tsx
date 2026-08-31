import { useEffect, useState } from "react";
import { ui } from "../shared/i18n";
import { RESERVED_SHOP_SLUGS } from "../shared/validation";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { SellerAuthPage } from "./pages/SellerAuthPage";
import { SellerDashboardPage } from "./pages/SellerDashboardPage";
import { AdminAuthPage } from "./pages/AdminAuthPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminSellersPage } from "./pages/AdminSellersPage";
import { AdminShopsPage } from "./pages/AdminShopsPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AdminAdsensePage } from "./pages/AdminAdsensePage";
import { AdminActivityPage } from "./pages/AdminActivityPage";
import { AdsenseSlot } from "./components/AdsenseSlot";
import { BrandMark } from "./components/BrandMark";
import { Icon } from "./components/Icon";
import { setCanonical, setMeta } from "./seo";

function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-[#cac4d0] bg-[#fffbfe]/95 backdrop-blur-xl public-header">
      <div className="mx-auto flex min-h-[72px] w-[calc(100%-32px)] max-w-[1120px] items-center justify-between gap-3">
        <a className="min-w-0 shrink text-brand-900 no-underline" href="/" data-nav="true"><BrandMark subtitle={ui.appTagline} /></a>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Navigasi utama">
          <a className="public-header-link" href="/seller/login" data-nav="true"><Icon name="lock" size={17} /><span>{ui.login}</span></a>
          <a className="public-header-cta" href="/seller/register" data-nav="true"><span className="public-header-register-full">{ui.register}</span><span className="public-header-register-short">Daftar</span></a>
        </nav>
      </div>
    </header>
  );
}

function AppShell({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const privateRoute = pathname.startsWith("/seller") || pathname.startsWith("/admin");
  return (
    <div className="min-h-screen bg-[#fffbfe] text-[#1d1b20]">
      {privateRoute ? children : <div data-shell="public"><PublicHeader /><main className="mx-auto w-[calc(100%-32px)] max-w-[1120px] pb-20 pt-7 sm:pt-10">{children}</main><footer className="border-t border-[#cac4d0] text-[#79747e]"><div className="mx-auto flex w-[calc(100%-32px)] max-w-[1120px] justify-between gap-4 py-6 text-sm"><span>{ui.appName}</span><span>© {new Date().getFullYear()}</span></div></footer></div>}
    </div>
  );
}

function NotFound() {
  return <section className="not-found-page"><div className="not-found-art"><Icon name="store" size={74} /><span>×</span></div><p className="eyebrow">Threads UMKM</p><h1>Halaman tidak ditemukan</h1><p>Halaman atau toko yang Anda cari tidak tersedia.</p><div className="not-found-actions"><a className="button button-primary" href="/" data-nav="true"><Icon name="home" size={18} />Kembali ke beranda</a><a className="button button-text" href="/" data-nav="true"><Icon name="store" size={18} />Jelajahi toko</a></div></section>;
}

function isShopPath(path: string): boolean {
  const slug = path.slice(1);
  return Boolean(slug) && !slug.includes("/") && !RESERVED_SHOP_SLUGS.has(slug.toLowerCase());
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest<HTMLAnchorElement>("a[data-nav='true']");
      if (!link || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      window.history.pushState({}, "", url.pathname + url.search);
      setPath(url.pathname);
    };
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    document.title = `${ui.appName} | ${ui.appTagline}`;
    const privateRoute = path.startsWith("/seller") || path.startsWith("/admin");
    setMeta("description", "Katalog toko UMKM Indonesia dan pemesanan langsung melalui WhatsApp.");
    setMeta("robots", privateRoute ? "noindex,nofollow" : "index,follow");
    setCanonical(path === "/" ? "/" : path);
  }, [path]);

  const sellerProductEditMatch = /^\/seller\/products\/(\d+)\/edit$/.exec(path);
  const content = path === "/" ? <HomePage /> : path === "/seller/login" ? <SellerAuthPage mode="login" /> : path === "/seller/register" ? <SellerAuthPage mode="register" /> : path === "/seller/setup" ? <SellerDashboardPage setupMode /> : path === "/seller/dashboard" ? <SellerDashboardPage /> : path === "/seller/shop" ? <SellerDashboardPage section="shop" /> : path === "/seller/products/new" ? <SellerDashboardPage section="products" productMode="create" /> : sellerProductEditMatch ? <SellerDashboardPage section="products" productMode="edit" productId={Number(sellerProductEditMatch[1])} /> : path === "/seller/products" ? <SellerDashboardPage section="products" /> : path === "/seller/phone" ? <SellerDashboardPage section="phone" /> : path === "/seller/pin" ? <SellerDashboardPage section="pin" /> : path === "/admin/login" ? <AdminAuthPage /> : path === "/admin" ? <AdminPage /> : path === "/admin/sellers" ? <AdminSellersPage /> : path === "/admin/shops" ? <AdminShopsPage /> : path === "/admin/products" ? <AdminProductsPage /> : path === "/admin/adsense" ? <AdminAdsensePage /> : path === "/admin/activity" ? <AdminActivityPage /> : isShopPath(path) ? <ShopPage slug={path.slice(1)} /> : <><NotFound /><AdsenseSlot placement="HOME" /></>;
  return <AppShell pathname={path}>{content}</AppShell>;
}
