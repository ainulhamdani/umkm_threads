import { useEffect, useState } from "react";
import { ApiError, getSellerMe, logoutSeller, type SellerMe, type SellerShop } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { PhoneChangeForm, PinChangeForm } from "../components/AccountSecurityForms";
import { ProductManager } from "../components/ProductManager";
import { ShopForm } from "../components/ShopForm";
import { BrandMark } from "../components/BrandMark";
import { Icon, type IconName } from "../components/Icon";
import { ui } from "../../shared/i18n";

export type SellerSection = "overview" | "shop" | "products" | "phone" | "pin";

type Props = { setupMode?: boolean; section?: SellerSection };

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const navigationItems: Array<{ section: SellerSection; label: string; href: string; icon: IconName }> = [
  { section: "overview", label: "Ringkasan", href: "/seller/dashboard", icon: "home" },
  { section: "shop", label: "Profil toko", href: "/seller/shop", icon: "store" },
  { section: "products", label: "Produk", href: "/seller/products", icon: "package" },
  { section: "phone", label: "Nomor WhatsApp", href: "/seller/phone", icon: "phone" },
  { section: "pin", label: "Keamanan", href: "/seller/pin", icon: "shield" },
];

function SellerNavigation({ activeSection, onNavigate }: { activeSection?: SellerSection; onNavigate?: () => void }) {
  return (
    <nav className="seller-navigation" aria-label="Menu penjual">
      {navigationItems.map((item) => (
        <a className={`seller-nav-link ${activeSection === item.section ? "seller-nav-link-active" : ""}`} href={item.href} data-nav="true" aria-current={activeSection === item.section ? "page" : undefined} key={item.section} onClick={onNavigate}>
          <span className="seller-nav-icon" aria-hidden="true"><Icon name={item.icon} size={19} /></span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

function SellerPageLayout({ title, description, activeSection, showNavigation = true, onLogout, children }: { title: string; description: string; activeSection?: SellerSection; showNavigation?: boolean; onLogout: () => void; children: React.ReactNode }) {
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

  return (
    <>
      <div className={showNavigation ? "seller-shell grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start" : "seller-shell seller-shell-no-nav mx-auto max-w-3xl"}>
        {showNavigation ? <>
          <div className="seller-mobile-bar flex items-center justify-between gap-3 rounded-3xl border border-brand-200 bg-white p-3 shadow-sm lg:hidden">
            <BrandMark subtitle={activeNavigationItem?.label ?? "Kelola toko"} />
            <button className="seller-mobile-menu" type="button" aria-expanded={mobileNavigationOpen} aria-controls="seller-mobile-navigation" onClick={() => setMobileNavigationOpen((open) => !open)}>
              <Icon name={mobileNavigationOpen ? "close" : "menu"} size={19} />
              {mobileNavigationOpen ? "Tutup" : "Menu"}
            </button>
          </div>
          {mobileNavigationOpen ? <>
            <button className="seller-drawer-backdrop fixed inset-0 z-20 bg-[#1d1b20]/40 lg:hidden" type="button" aria-label="Tutup menu penjual" onClick={() => setMobileNavigationOpen(false)} />
            <aside id="seller-mobile-navigation" className="seller-mobile-drawer fixed inset-y-0 left-0 z-30 flex w-[min(86vw,320px)] flex-col gap-5 overflow-y-auto bg-white p-4 shadow-2xl lg:hidden" role="dialog" aria-modal="true" aria-label="Menu penjual">
              <div className="flex items-center justify-between gap-3 border-b border-brand-100 pb-4">
                <BrandMark dark subtitle="Ruang penjual" />
                <button className="icon-button" type="button" aria-label="Tutup menu penjual" onClick={() => setMobileNavigationOpen(false)}><Icon name="close" size={20} /></button>
              </div>
              <div>
                <p className="seller-navigation-label">Kelola toko</p>
                <SellerNavigation activeSection={activeSection} onNavigate={() => setMobileNavigationOpen(false)} />
              </div>
            </aside>
          </> : null}
          <aside className="seller-sidebar hidden rounded-3xl border border-brand-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:block">
          <BrandMark dark subtitle="Ruang penjual" />
          <p className="seller-navigation-label">Kelola toko</p>
          <SellerNavigation activeSection={activeSection} />
          <div className="seller-sidebar-footer"><Icon name="store" size={18} /><span>Kelola katalog Anda</span><button className="button button-text" type="button" onClick={onLogout}><Icon name="logout" size={17} />{ui.logout}</button></div>
          </aside>
        </> : null}
        <div className="seller-content min-w-0">
          {!showNavigation ? <div className="seller-minimal-header"><a href="/" data-nav="true" aria-label={ui.appName}><BrandMark subtitle="Ruang penjual" /></a><button className="button button-text" type="button" onClick={onLogout}><Icon name="logout" size={17} />{ui.logout}</button></div> : null}
          <header className="seller-content-header mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-brand-200 pb-5">
            <div className="grid gap-2">
              <p className="eyebrow">Ruang penjual</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <button className="button button-text" type="button" onClick={onLogout}><Icon name="logout" size={17} />{ui.logout}</button>
          </header>
          <section className="seller-content-body grid min-w-0 gap-5">{children}</section>
        </div>
      </div>
      <AdsenseSlot placement="SELLER" />
    </>
  );
}

function pageCopy(section: SellerSection): { title: string; description: string } {
  if (section === "shop") return { title: "Profil toko", description: "Perbarui informasi yang pelanggan lihat di katalog toko Anda." };
  if (section === "products") return { title: "Produk toko", description: "Kelola foto, harga, kategori, deskripsi, dan ketersediaan produk." };
  if (section === "phone") return { title: "Nomor WhatsApp", description: "Atur nomor yang menerima pesanan pelanggan melalui WhatsApp." };
  if (section === "pin") return { title: "Keamanan akun", description: "Perbarui PIN masuk untuk menjaga akses ke akun penjual." };
  return { title: ui.sellerDashboard, description: "Lihat status toko dan kelola katalog melalui menu penjual." };
}

export function SellerDashboardPage({ setupMode = false, section = "overview" }: Props) {
  const [me, setMe] = useState<SellerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getSellerMe()
      .then(setMe)
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 401) {
          navigate("/seller/login");
          return;
        }
        setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function logout() {
    await logoutSeller().catch((reason: unknown) => console.warn("Keluar dari sesi penjual gagal.", reason));
    navigate("/");
  }

  function savedShop(shop: SellerShop) {
    setMe((current) => current ? { ...current, shop } : current);
    if (setupMode) navigate("/seller/dashboard");
  }

  if (loading) return <div className="loading-state">{ui.loading}</div>;
  if (error || !me) {
    return (
      <div className="error-state" role="alert">
        <h1>Sesi penjual tidak tersedia</h1>
        <p>{error ?? ui.errorGeneric}</p>
        <div className="card-actions">
          <a className="button button-primary" href="/seller/login" data-nav="true">{ui.login}</a>
          <a className="button button-text" href="/" data-nav="true">{ui.home}</a>
        </div>
      </div>
    );
  }

  if (me.seller.pinResetRequired && section !== "pin") {
    return (
      <SellerPageLayout title="Perbarui PIN" description="PIN sementara harus diganti sebelum Anda mengelola toko." showNavigation={false} onLogout={logout}>
        <PinChangeForm required onChanged={load} />
      </SellerPageLayout>
    );
  }

  if (setupMode && !me.shop) {
    return (
      <SellerPageLayout title="Buat profil toko" description="Lengkapi profil toko agar katalog Anda dapat dibagikan kepada pelanggan." showNavigation={false} onLogout={logout}>
        <ShopForm shop={null} onSaved={savedShop} />
      </SellerPageLayout>
    );
  }

  const copy = pageCopy(section);
  let content: React.ReactNode;
  if (section === "shop") {
    content = me.shop ? <ShopForm shop={me.shop} onSaved={savedShop} /> : <div className="info-state"><h2>Profil toko belum dibuat</h2><p>Buat profil toko terlebih dahulu sebelum mengatur informasi toko.</p><a className="button button-primary" href="/seller/setup" data-nav="true"><Icon name="store" size={17} />Buat profil toko</a></div>;
  } else if (section === "products") {
    content = <ProductManager enabled={Boolean(me.shop)} />;
  } else if (section === "phone") {
    content = <PhoneChangeForm currentPhone={me.seller.phone} onChanged={(phone) => setMe((current) => current ? { ...current, seller: { ...current.seller, phone } } : current)} />;
  } else if (section === "pin") {
    content = <PinChangeForm required={false} onChanged={load} />;
  } else {
    content = (
      <div className="seller-overview-grid">
        <div className="seller-overview-main">
          <section className="seller-status-card">
            <div><p className="eyebrow">Status toko</p><h2>{me.shop ? me.shop.name : "Profil toko belum dibuat"}</h2><p>{me.shop ? "Katalog Anda siap dikelola dan dibagikan kepada pelanggan." : "Buat profil toko untuk mulai menambahkan produk."}</p></div>
            {me.shop ? <><span className="status-badge">{me.shop.visibilityStatus === "HIDDEN" ? "Disembunyikan superadmin" : "Tampil untuk pelanggan"}</span><div className="card-actions"><a className="button button-primary" href={`/${me.shop.slug}`} data-nav="true"><Icon name="external" size={17} />Lihat katalog</a><a className="button button-secondary" href="/seller/shop" data-nav="true"><Icon name="edit" size={17} />Edit profil toko</a></div></> : <a className="button button-primary" href="/seller/setup" data-nav="true"><Icon name="store" size={17} />Buat profil toko</a>}
          </section>
          <div className="seller-stats" aria-label="Ringkasan katalog">
            <article className="seller-stat"><strong>{me.productCount}</strong><span>Total produk</span></article>
            <article className="seller-stat"><strong>{me.availableProductCount}</strong><span>Produk tersedia</span></article>
          </div>
        </div>
        <div className="seller-action-grid">
          <a className="seller-action-card" href={me.shop ? `/${me.shop.slug}` : "/seller/setup"} data-nav="true"><span className="seller-action-icon"><Icon name="external" size={19} /></span><span><strong>{me.shop ? "Buka toko publik" : "Buat profil toko"}</strong><span>{me.shop ? "Lihat tampilan katalog Anda." : "Lengkapi informasi toko Anda."}</span></span><Icon name="arrow-right" size={18} /></a>
          <a className="seller-action-card" href="/seller/products" data-nav="true"><span className="seller-action-icon"><Icon name="package" size={19} /></span><span><strong>Kelola katalog</strong><span>Tambah, ubah, atau atur produk.</span></span><Icon name="arrow-right" size={18} /></a>
        </div>
      </div>
    );
  }

  return <SellerPageLayout title={copy.title} description={copy.description} activeSection={section} onLogout={logout}>{content}</SellerPageLayout>;
}
