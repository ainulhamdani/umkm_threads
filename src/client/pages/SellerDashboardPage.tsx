import { useEffect, useState } from "react";
import { ApiError, getSellerMe, logoutSeller, type SellerMe, type SellerShop } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { PhoneChangeForm, PinChangeForm } from "../components/AccountSecurityForms";
import { ProductManager } from "../components/ProductManager";
import { ShopForm } from "../components/ShopForm";
import { ui } from "../../shared/i18n";

export type SellerSection = "overview" | "shop" | "products" | "phone" | "pin";

type Props = { setupMode?: boolean; section?: SellerSection };

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const navigationItems: Array<{ section: SellerSection; label: string; href: string }> = [
  { section: "overview", label: "Ringkasan", href: "/seller/dashboard" },
  { section: "shop", label: "Profil toko", href: "/seller/shop" },
  { section: "products", label: "Produk", href: "/seller/products" },
  { section: "phone", label: "Nomor WhatsApp", href: "/seller/phone" },
  { section: "pin", label: "Keamanan", href: "/seller/pin" },
];

function SellerNavigation({ activeSection }: { activeSection?: SellerSection }) {
  return (
    <nav className="seller-nav" aria-label="Menu penjual">
      {navigationItems.map((item) => (
        <a className={activeSection === item.section ? "active" : ""} href={item.href} data-nav="true" aria-current={activeSection === item.section ? "page" : undefined} key={item.section}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function SellerPageLayout({ title, description, activeSection, showNavigation = true, onLogout, children }: { title: string; description: string; activeSection?: SellerSection; showNavigation?: boolean; onLogout: () => void; children: React.ReactNode }) {
  return (
    <>
      <section className="hero seller-hero">
        <p className="eyebrow">Ruang penjual</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="card-actions">
          <button className="button button-text" type="button" onClick={onLogout}>{ui.logout}</button>
        </div>
      </section>
      {showNavigation ? <SellerNavigation activeSection={activeSection} /> : null}
      <section className="seller-content">{children}</section>
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
    content = me.shop ? <ShopForm shop={me.shop} onSaved={savedShop} /> : <div className="info-state"><h2>Profil toko belum dibuat</h2><p>Buat profil toko terlebih dahulu sebelum mengatur informasi toko.</p><a className="button button-primary" href="/seller/setup" data-nav="true">Buat profil toko</a></div>;
  } else if (section === "products") {
    content = <ProductManager enabled={Boolean(me.shop)} />;
  } else if (section === "phone") {
    content = <PhoneChangeForm currentPhone={me.seller.phone} onChanged={(phone) => setMe((current) => current ? { ...current, seller: { ...current.seller, phone } } : current)} />;
  } else if (section === "pin") {
    content = <PinChangeForm required={false} onChanged={load} />;
  } else {
    content = (
      <>
        <section className="seller-overview-card info-state">
          <div>
            <p className="eyebrow">Status toko</p>
            <h2>{me.shop ? me.shop.name : "Profil toko belum dibuat"}</h2>
            <p>{me.shop ? "Katalog Anda siap dikelola dan dibagikan kepada pelanggan." : "Buat profil toko untuk mulai menambahkan produk."}</p>
          </div>
          {me.shop ? <>
            <span className={`status-badge${me.shop.visibilityStatus === "HIDDEN" ? " error" : ""}`}>{me.shop.visibilityStatus === "HIDDEN" ? "Disembunyikan superadmin" : "Tampil untuk pelanggan"}</span>
            <div className="card-actions">
              <a className="button button-primary" href={`/${me.shop.slug}`} data-nav="true">Lihat katalog</a>
              <a className="button button-secondary" href="/seller/shop" data-nav="true">Edit profil toko</a>
            </div>
          </> : <a className="button button-primary" href="/seller/setup" data-nav="true">Buat profil toko</a>}
        </section>
        <div className="seller-stat-grid" aria-label="Ringkasan katalog">
          <article className="seller-stat-card"><strong>{me.productCount}</strong><span>Total produk</span></article>
          <article className="seller-stat-card"><strong>{me.availableProductCount}</strong><span>Produk tersedia</span></article>
        </div>
      </>
    );
  }

  return <SellerPageLayout title={copy.title} description={copy.description} activeSection={section} onLogout={logout}>{content}</SellerPageLayout>;
}
