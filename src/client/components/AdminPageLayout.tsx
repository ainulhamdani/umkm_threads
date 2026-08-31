import { useEffect, useState, type ReactNode } from "react";
import { logoutAdmin } from "../api";
import { navigateAdmin } from "../admin-utils";
import { AdsenseSlot } from "./AdsenseSlot";
import { BrandMark } from "./BrandMark";
import { Icon, type IconName } from "./Icon";
import { ui } from "../../shared/i18n";

export type AdminSection = "overview" | "sellers" | "shops" | "products" | "adsense" | "activity";

type NavigationItem = { section: AdminSection; label: string; href: string; icon: IconName };

const navigationItems: NavigationItem[] = [
  { section: "overview", label: "Ringkasan", href: "/admin", icon: "home" },
  { section: "sellers", label: "Penjual", href: "/admin/sellers", icon: "users" },
  { section: "shops", label: "Toko", href: "/admin/shops", icon: "store" },
  { section: "products", label: "Produk", href: "/admin/products", icon: "package" },
  { section: "adsense", label: "AdSense", href: "/admin/adsense", icon: "settings" },
  { section: "activity", label: "Log aktivitas", href: "/admin/activity", icon: "activity" },
];

function AdminNavigation({ activeSection, onNavigate }: { activeSection: AdminSection; onNavigate?: () => void }) {
  return (
    <nav className="admin-nav" aria-label="Menu superadmin">
      {navigationItems.map((item) => (
        <a href={item.href} data-nav="true" aria-current={activeSection === item.section ? "page" : undefined} key={item.section} onClick={onNavigate}>
          <span className="seller-nav-icon" aria-hidden="true"><Icon name={item.icon} size={18} /></span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

type Props = {
  activeSection: AdminSection;
  title: string;
  description: string;
  children: ReactNode;
};

export function AdminPageLayout({ activeSection, title, description, children }: Props) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const activeNavigationItem = navigationItems.find((item) => item.section === activeSection);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavigationOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavigationOpen]);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [activeSection]);

  async function logout() {
    await logoutAdmin().catch((reason: unknown) => console.warn("Keluar dari sesi superadmin gagal.", reason));
    navigateAdmin("/");
  }

  return (
    <>
      <div className="admin-shell">
        {mobileNavigationOpen ? <>
          <button className="admin-drawer-backdrop" type="button" aria-label="Tutup menu superadmin" onClick={() => setMobileNavigationOpen(false)} />
          <aside id="admin-mobile-navigation" className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu superadmin">
            <div className="admin-mobile-drawer-header"><BrandMark dark subtitle="Konsol superadmin" /><button className="icon-button" type="button" aria-label="Tutup menu superadmin" onClick={() => setMobileNavigationOpen(false)}><Icon name="close" size={20} /></button></div>
            <div><p className="admin-navigation-label">Kelola platform</p><AdminNavigation activeSection={activeSection} onNavigate={() => setMobileNavigationOpen(false)} /></div>
          </aside>
        </> : null}
        <aside className="admin-sidebar"><BrandMark dark subtitle="Konsol superadmin" /><p className="admin-navigation-label">Kelola platform</p><AdminNavigation activeSection={activeSection} /><div className="admin-sidebar-footer"><button className="button button-text" type="button" onClick={logout}><Icon name="logout" size={17} />{ui.logout}</button></div></aside>
        <main className="admin-content">
          <div className="admin-mobile-bar"><BrandMark subtitle={activeNavigationItem?.label ?? "Konsol superadmin"} /><button className="admin-mobile-menu" type="button" aria-expanded={mobileNavigationOpen} aria-controls="admin-mobile-navigation" onClick={() => setMobileNavigationOpen((open) => !open)}><Icon name={mobileNavigationOpen ? "close" : "menu"} size={19} />{mobileNavigationOpen ? "Tutup" : "Menu"}</button></div>
          <header className="admin-topbar"><div><p className="eyebrow">Pengelolaan platform</p><h1>{title}</h1><p>{description}</p></div><button className="button button-text" type="button" onClick={logout}><Icon name="logout" size={17} />{ui.logout}</button></header>
          <section className="admin-page-body">{children}</section>
        </main>
      </div>
      <AdsenseSlot placement="ADMIN" showUnavailable />
    </>
  );
}
