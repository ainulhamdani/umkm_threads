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

const navigationItems: Array<{ section: SellerSection; label: string; href: string; icon: string }> = [
  { section: "overview", label: "Ringkasan", href: "/seller/dashboard", icon: "⌂" },
  { section: "shop", label: "Profil toko", href: "/seller/shop", icon: "▤" },
  { section: "products", label: "Produk", href: "/seller/products", icon: "＋" },
  { section: "phone", label: "Nomor WhatsApp", href: "/seller/phone", icon: "☎" },
  { section: "pin", label: "Keamanan", href: "/seller/pin", icon: "⚙" },
];

function SellerNavigation({ activeSection }: { activeSection?: SellerSection }) {
  return (
    <nav className="flex gap-2 overflow-x-auto lg:grid lg:overflow-visible" aria-label="Menu penjual">
      {navigationItems.map((item) => (
        <a className={`group flex min-h-12 flex-none items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold no-underline transition-colors lg:w-full ${activeSection === item.section ? "bg-brand-600 text-white shadow-sm" : "text-[#49454f] hover:bg-brand-100"}`} href={item.href} data-nav="true" aria-current={activeSection === item.section ? "page" : undefined} key={item.section}>
          <span className={`grid size-9 place-items-center rounded-xl text-base ${activeSection === item.section ? "bg-white/20" : "bg-brand-100 text-brand-900"}`} aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

function SellerPageLayout({ title, description, activeSection, showNavigation = true, onLogout, children }: { title: string; description: string; activeSection?: SellerSection; showNavigation?: boolean; onLogout: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className={showNavigation ? "grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start" : "mx-auto max-w-3xl"}>
        {showNavigation ? <aside className="rounded-3xl border border-brand-200 bg-white p-3 shadow-sm lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-3 border-b border-brand-100 px-3 py-2">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-600 font-extrabold text-white">TU</span>
            <div>
              <strong className="block text-sm font-extrabold text-brand-900">Threads UMKM</strong>
              <span className="text-xs text-[#79747e]">Ruang penjual</span>
            </div>
          </div>
          <p className="mb-2 px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[#79747e]">Kelola toko</p>
          <SellerNavigation activeSection={activeSection} />
        </aside> : null}
        <div className="min-w-0">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-brand-200 pb-5">
            <div className="grid gap-2">
              <p className="eyebrow">Ruang penjual</p>
              <h1 className="m-0 text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">{title}</h1>
              <p className="m-0 max-w-2xl text-sm leading-6 text-[#49454f]">{description}</p>
            </div>
            <button className="inline-flex min-h-12 items-center justify-center rounded-full px-3 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-100" type="button" onClick={onLogout}>{ui.logout}</button>
          </header>
          <section className="grid min-w-0 gap-5">{children}</section>
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
        <section className="grid gap-5 rounded-3xl border border-brand-200 bg-brand-100 p-6 text-[#49454f] shadow-sm">
          <div>
            <p className="eyebrow">Status toko</p>
            <h2 className="mb-1 mt-2 text-2xl font-extrabold text-brand-900">{me.shop ? me.shop.name : "Profil toko belum dibuat"}</h2>
            <p className="m-0 leading-6">{me.shop ? "Katalog Anda siap dikelola dan dibagikan kepada pelanggan." : "Buat profil toko untuk mulai menambahkan produk."}</p>
          </div>
          {me.shop ? <>
            <span className={`inline-flex min-h-7 w-fit items-center rounded-full px-2.5 text-xs font-bold ${me.shop.visibilityStatus === "HIDDEN" ? "bg-[#ffdad6] text-[#410002]" : "bg-[#c8ffc7] text-[#002106]"}`}>{me.shop.visibilityStatus === "HIDDEN" ? "Disembunyikan superadmin" : "Tampil untuk pelanggan"}</span>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-5 font-bold text-white no-underline shadow-sm transition-colors hover:bg-brand-900" href={`/${me.shop.slug}`} data-nav="true">Lihat katalog</a>
              <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 font-bold text-brand-900 no-underline transition-colors hover:bg-brand-200" href="/seller/shop" data-nav="true">Edit profil toko</a>
            </div>
          </> : <a className="inline-flex min-h-12 w-fit items-center justify-center rounded-full bg-brand-600 px-5 font-bold text-white no-underline shadow-sm transition-colors hover:bg-brand-900" href="/seller/setup" data-nav="true">Buat profil toko</a>}
        </section>
        <div className="grid grid-cols-2 gap-3" aria-label="Ringkasan katalog">
          <article className="grid gap-1 rounded-3xl border border-brand-200 bg-white p-5 shadow-sm"><strong className="text-3xl font-extrabold leading-none text-brand-900">{me.productCount}</strong><span className="text-sm text-[#79747e]">Total produk</span></article>
          <article className="grid gap-1 rounded-3xl border border-brand-200 bg-white p-5 shadow-sm"><strong className="text-3xl font-extrabold leading-none text-brand-900">{me.availableProductCount}</strong><span className="text-sm text-[#79747e]">Produk tersedia</span></article>
        </div>
      </>
    );
  }

  return <SellerPageLayout title={copy.title} description={copy.description} activeSection={section} onLogout={logout}>{content}</SellerPageLayout>;
}
