import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getAdminAdsense,
  listAdminProducts,
  listAdminSellers,
  listAuditLogs,
  logoutAdmin,
  resetSellerPin,
  setProductVisibility,
  setShopVisibility,
  updateAdminAdsense,
  type AdminProduct,
  type AdminSeller,
  type AdsenseSettings,
  type AuditLog,
} from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { BrandMark } from "../components/BrandMark";
import { Icon } from "../components/Icon";
import { formatIdr, ui } from "../../shared/i18n";

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function actionLabel(code: string): string {
  const labels: Record<string, string> = {
    SELLER_REGISTERED: "Penjual mendaftar",
    SELLER_LOGIN_SUCCEEDED: "Penjual masuk",
    SELLER_LOGIN_FAILED: "Percobaan masuk penjual gagal",
    SHOP_CREATED: "Toko dibuat",
    SHOP_UPDATED: "Profil toko diperbarui",
    PRODUCT_CREATED: "Produk dibuat",
    PRODUCT_UPDATED: "Produk diperbarui",
    PRODUCT_AVAILABILITY_CHANGED: "Ketersediaan produk diubah",
    SHOP_VISIBILITY_CHANGED: "Visibilitas toko diubah",
    PRODUCT_VISIBILITY_CHANGED: "Visibilitas produk diubah",
    SELLER_PIN_RESET: "PIN penjual diatur ulang",
    ADSENSE_SETTINGS_CHANGED: "Pengaturan iklan diubah",
    WHATSAPP_LINK_CREATED: "Tautan WhatsApp dibuat",
    seller_registered: "Penjual mendaftar",
    seller_login_success: "Penjual masuk",
    seller_login_failure: "Percobaan masuk penjual gagal",
    shop_created: "Toko dibuat",
    shop_updated: "Profil toko diperbarui",
    product_created: "Produk dibuat",
    product_updated: "Produk diperbarui",
    product_availability_changed: "Ketersediaan produk diubah",
    admin_visibility_changed: "Visibilitas konten diubah",
    seller_pin_reset: "PIN penjual diatur ulang",
    adsense_settings_changed: "Pengaturan iklan diubah",
    whatsapp_link_generated: "Tautan WhatsApp dibuat",
  };
  return labels[code] ?? "Aktivitas sistem";
}

function adPlacementLabel(placement: keyof AdsenseSettings["slots"]): string {
  return placement === "HOME" ? "beranda" : placement === "SHOP" ? "toko" : placement === "SELLER" ? "penjual" : "superadmin";
}

function AdminNavigation() {
  return <nav className="admin-nav" aria-label="Menu superadmin"><a href="/admin" data-nav="true" aria-current="page"><span className="seller-nav-icon"><Icon name="home" size={18} /></span>Ringkasan</a><a href="#sellers"><span className="seller-nav-icon"><Icon name="users" size={18} /></span>Penjual</a><a href="#sellers"><span className="seller-nav-icon"><Icon name="store" size={18} /></span>Toko</a><a href="#products"><span className="seller-nav-icon"><Icon name="package" size={18} /></span>Produk</a><a href="#adsense"><span className="seller-nav-icon"><Icon name="settings" size={18} /></span>AdSense</a><a href="#activity"><span className="seller-nav-icon"><Icon name="activity" size={18} /></span>Log aktivitas</a></nav>;
}

export function AdminPage() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [ads, setAds] = useState<AdsenseSettings | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([listAdminSellers(search), listAdminProducts(search), listAuditLogs(), getAdminAdsense()])
      .then(([sellerResult, productResult, logResult, adResult]) => {
        setSellers(sellerResult.items);
        setProducts(productResult.items);
        setLogs(logResult.items);
        setAds(adResult);
      })
      .catch((reason: unknown) => {
        if (reason instanceof ApiError && reason.status === 401) {
          navigate("/admin/login");
          return;
        }
        setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function searchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    load();
  }

  async function toggleShop(seller: AdminSeller) {
    if (!seller.shop) return;
    try {
      await setShopVisibility(seller.shop.id, seller.shop.visibilityStatus !== "PUBLISHED");
      setMessage("Visibilitas toko diperbarui.");
      load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    }
  }

  async function toggleProduct(product: AdminProduct) {
    try {
      await setProductVisibility(product.id, product.visibilityStatus !== "PUBLISHED");
      setMessage("Visibilitas produk diperbarui.");
      load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    }
  }

  async function pinReset(seller: AdminSeller) {
    try {
      const result = await resetSellerPin(seller.id);
      setMessage(`PIN sementara untuk ${seller.phone}: ${result.temporaryPin}. Simpan atau sampaikan dengan aman.`);
      load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    }
  }

  async function saveAds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ads) return;
    try {
      setAds(await updateAdminAdsense(ads));
      setMessage("Pengaturan iklan tersimpan.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    }
  }

  async function logout() {
    await logoutAdmin().catch((reason: unknown) => console.warn("Keluar dari sesi superadmin gagal.", reason));
    navigate("/");
  }

  if (loading && !ads) return <div className="loading-state">{ui.loading}</div>;
  if (error && !ads && sellers.length === 0) return <div className="error-state" role="alert"><h1>Konsol superadmin tidak tersedia</h1><p>{error}</p><a className="button button-primary" href="/admin/login" data-nav="true">{ui.login}</a></div>;

  const visibleShopCount = sellers.filter((seller) => seller.shop?.visibilityStatus === "PUBLISHED").length;
  const visibleProductCount = products.filter((product) => product.visibilityStatus === "PUBLISHED" && product.available).length;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar"><BrandMark dark subtitle="Konsol superadmin" /><AdminNavigation /><div className="admin-sidebar-footer"><button className="button button-text" type="button" onClick={logout}><Icon name="logout" size={17} />{ui.logout}</button></div></aside>
      <main className="admin-content">
        <div className="admin-mobile-bar"><BrandMark subtitle="Konsol superadmin" /><button className="button button-text" type="button" onClick={logout}><Icon name="logout" size={17} />{ui.logout}</button></div>
        <header className="admin-topbar"><div><p className="eyebrow">Pengelolaan platform</p><h1>{ui.adminConsole}</h1><p>Moderasi toko, dukung penjual, dan kelola penempatan iklan.</p></div><button className="button button-text admin-desktop-logout" type="button" onClick={logout}><Icon name="logout" size={17} />{ui.logout}</button></header>
        {error ? <div className="error-state" role="alert">{error}</div> : null}
        {message ? <div className="info-state" role="status">{message}</div> : null}
        <div className="admin-stat-grid" aria-label="Ringkasan platform"><article className="admin-stat"><Icon name="users" size={20} /><strong>{sellers.length}</strong><span>Total penjual</span></article><article className="admin-stat"><Icon name="store" size={20} /><strong>{visibleShopCount}</strong><span>Toko aktif</span></article><article className="admin-stat"><Icon name="package" size={20} /><strong>{visibleProductCount}</strong><span>Produk aktif</span></article></div>
        <form className="filter-panel admin-search" onSubmit={searchSubmit}><div className="field"><label htmlFor="admin-search">Cari penjual, toko, atau produk</label><input id="admin-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nomor telepon atau nama" /></div><button className="button button-primary" type="submit"><Icon name="search" size={17} />{ui.search}</button></form>
        <AdsenseSlot placement="ADMIN" />
        <div className="admin-panel-grid">
          <section className="admin-panel" id="sellers"><div className="admin-panel-heading"><div><h2>Penjual dan toko</h2><p>{sellers.length} penjual</p></div><Icon name="users" size={21} /></div><div className="admin-list">{sellers.length === 0 ? <div className="empty-state">Belum ada data penjual.</div> : sellers.map((seller) => <article className="admin-list-row" key={seller.id}><div className="admin-list-row-main"><span className="admin-avatar">{seller.phone.slice(-2)}</span><div><strong>{seller.phone}</strong><p className="muted">{seller.shop ? `${seller.shop.name} · /${seller.shop.slug}` : "Profil toko belum dibuat"}</p></div></div><span className={`status-badge${seller.shop?.visibilityStatus === "HIDDEN" ? " error" : ""}`}>{seller.shop?.visibilityStatus === "HIDDEN" ? "Toko disembunyikan" : seller.shop ? "Toko tampil" : "Belum ada toko"}</span><div className="admin-list-row-actions"><button className="button button-secondary" type="button" onClick={() => pinReset(seller)}><Icon name="lock" size={15} />Atur ulang PIN</button>{seller.shop ? <button className="button button-text" type="button" onClick={() => toggleShop(seller)}>{seller.shop.visibilityStatus === "PUBLISHED" ? "Sembunyikan toko" : "Tampilkan toko"}</button> : null}</div></article>)}</div></section>
          <section className="admin-panel" id="products"><div className="admin-panel-heading"><div><h2>Moderasi produk</h2><p>{products.length} produk</p></div><Icon name="package" size={21} /></div><div className="admin-list">{products.length === 0 ? <div className="empty-state">Belum ada data produk.</div> : products.map((product) => <article className="admin-list-row" key={product.id}><div className="admin-list-row-main"><img className="admin-product-image" src={product.imageUrl} alt={`Foto ${product.name}`} /><div><strong>{product.name}</strong><p className="muted">{product.shopName} · {formatIdr(product.priceIdr)}</p><span className="chip">{product.primaryCategory.label}</span></div></div><span className={`status-badge${product.visibilityStatus === "HIDDEN" ? " error" : ""}`}>{product.visibilityStatus === "HIDDEN" ? "Disembunyikan" : product.available ? "Tersedia" : "Tidak tersedia"}</span><div className="admin-list-row-actions"><button className="button button-text" type="button" onClick={() => toggleProduct(product)}><Icon name={product.visibilityStatus === "PUBLISHED" ? "eye" : "check"} size={15} />{product.visibilityStatus === "PUBLISHED" ? "Sembunyikan" : "Pulihkan"}</button></div></article>)}</div></section>
        </div>
        <div className="admin-panel-grid admin-lower-grid">
          {ads ? <form className="form-card admin-panel admin-ads-form" id="adsense" onSubmit={saveAds}><div className="admin-panel-heading"><div><h2>AdSense</h2><p>Konfigurasi ruang iklan platform.</p></div><Icon name="settings" size={21} /></div><label className="checkbox-row"><input type="checkbox" checked={ads.enabled} onChange={(event) => setAds({ ...ads, enabled: event.target.checked })} />Aktifkan iklan</label><div className="field"><label htmlFor="ads-client">ID klien AdSense</label><input id="ads-client" value={ads.clientId} onChange={(event) => setAds({ ...ads, clientId: event.target.value })} placeholder="ca-pub-..." /></div>{(["HOME", "SHOP", "SELLER", "ADMIN"] as const).map((placement) => <div className="field" key={placement}><label htmlFor={`ads-${placement}`}>Slot {adPlacementLabel(placement)}</label><input id={`ads-${placement}`} value={ads.slots[placement]} onChange={(event) => setAds({ ...ads, slots: { ...ads.slots, [placement]: event.target.value } })} /></div>)}<button className="button button-primary" type="submit"><Icon name="check" size={17} />Simpan pengaturan AdSense</button></form> : null}
          <section className="admin-panel" id="activity"><div className="admin-panel-heading"><div><h2>Log aktivitas</h2><p>{logs.length} aktivitas terbaru</p></div><Icon name="activity" size={21} /></div><div className="admin-log-list">{logs.length === 0 ? <div className="empty-state">Belum ada aktivitas.</div> : logs.map((log) => <article className="admin-log-item" key={log.id}><span className="admin-log-icon"><Icon name="activity" size={15} /></span><div><strong>{actionLabel(log.actionCode)}</strong><span>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</span></div></article>)}</div></section>
        </div>
      </main>
    </div>
  );
}
