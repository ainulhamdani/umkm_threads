import { useEffect, useState } from "react";
import { ui } from "../shared/i18n";
import { RESERVED_SHOP_SLUGS } from "../shared/validation";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { SellerAuthPage } from "./pages/SellerAuthPage";
import { SellerDashboardPage } from "./pages/SellerDashboardPage";
import { AdminAuthPage } from "./pages/AdminAuthPage";
import { AdminPage } from "./pages/AdminPage";
import { AdsenseSlot } from "./components/AdsenseSlot";
import { setCanonical, setMeta } from "./seo";

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffbfe] text-[#1d1b20]">
      <header className="sticky top-0 z-10 border-b border-[#cac4d0] bg-[#fffbfe]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] w-[calc(100%-32px)] max-w-[1120px] items-center justify-between gap-3">
          <a className="min-w-0 shrink text-brand-900 no-underline" href="/" data-nav="true">
            <span className="block whitespace-nowrap text-lg font-extrabold tracking-tight sm:text-xl">{ui.appName}</span>
            <small className="block max-w-[150px] text-xs font-medium leading-4 text-[#79747e] sm:max-w-none">{ui.appTagline}</small>
          </a>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Navigasi utama">
            <a className="inline-flex min-h-12 items-center justify-center rounded-full px-2 text-sm font-bold text-brand-600 no-underline transition-colors hover:bg-brand-100 sm:px-3" href="/seller/login" data-nav="true">{ui.login}</a>
            <a className="inline-flex min-h-12 max-w-[122px] items-center justify-center rounded-full bg-brand-100 px-3 text-center text-xs font-bold leading-4 text-brand-900 no-underline transition-colors hover:bg-brand-200 sm:max-w-none sm:text-sm" href="/seller/register" data-nav="true">{ui.register}</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-[calc(100%-32px)] max-w-[1120px] pb-20 pt-7 sm:pt-10">{children}</main>
      <footer className="border-t border-[#cac4d0] text-[#79747e]">
        <div className="mx-auto flex w-[calc(100%-32px)] max-w-[1120px] justify-between gap-4 py-6 text-sm">
          <span>{ui.appName}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

function NotFound() {
  return <div className="empty-state"><h1>Halaman tidak ditemukan</h1><a href="/" data-nav="true">Kembali ke beranda</a></div>;
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

  const content = path === "/" ? <HomePage /> : path === "/seller/login" ? <SellerAuthPage mode="login" /> : path === "/seller/register" ? <SellerAuthPage mode="register" /> : path === "/seller/setup" ? <SellerDashboardPage setupMode /> : path === "/seller/dashboard" ? <SellerDashboardPage /> : path === "/seller/shop" ? <SellerDashboardPage section="shop" /> : path === "/seller/products" ? <SellerDashboardPage section="products" /> : path === "/seller/phone" ? <SellerDashboardPage section="phone" /> : path === "/seller/pin" ? <SellerDashboardPage section="pin" /> : path === "/admin/login" ? <AdminAuthPage /> : path === "/admin" ? <AdminPage /> : isShopPath(path) ? <ShopPage slug={path.slice(1)} /> : <><NotFound /><AdsenseSlot placement="HOME" /></>;
  return <AppShell>{content}</AppShell>;
}
