import { useEffect, useState } from "react";
import { ui } from "../shared/i18n";
import { RESERVED_SHOP_SLUGS } from "../shared/validation";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="/" data-nav="true">
            {ui.appName}
            <small>{ui.appTagline}</small>
          </a>
          <nav className="header-actions" aria-label="Navigasi utama">
            <a className="button button-text" href="/seller/login" data-nav="true">{ui.login}</a>
            <a className="button button-secondary" href="/seller/register" data-nav="true">{ui.register}</a>
          </nav>
        </div>
      </header>
      <main className="page-content">{children}</main>
      <footer className="page-footer">
        <div className="footer-inner">
          <span>{ui.appName}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

function HomePlaceholder() {
  return (
    <>
      <section className="hero">
        <h1>Temukan toko lokal di sekitar Anda</h1>
        <p>Jelajahi katalog produk UMKM Indonesia dan hubungi penjual langsung melalui WhatsApp.</p>
      </section>
      <div className="info-state">Fondasi aplikasi siap. Fitur katalog akan dimuat pada pass berikutnya.</div>
    </>
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
  }, [path]);

  const content = path === "/" ? <HomePage /> : isShopPath(path) ? <ShopPage slug={path.slice(1)} /> : <NotFound />;
  return <AppShell>{content}</AppShell>;
}
