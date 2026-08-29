import { useEffect, useState } from "react";
import { ApiError, getSellerMe, logoutSeller, type SellerMe, type SellerShop } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { PhoneChangeForm, PinChangeForm } from "../components/AccountSecurityForms";
import { ProductManager } from "../components/ProductManager";
import { ShopForm } from "../components/ShopForm";
import { ui } from "../../shared/i18n";

function navigate(path: string) { window.history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); }

export function SellerDashboardPage({ setupMode = false, section }: { setupMode?: boolean; section?: "shop" | "products" }) {
  const [me, setMe] = useState<SellerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingShop, setEditingShop] = useState(setupMode);

  useEffect(() => {
    if (section === "shop") setEditingShop(true);
  }, [section]);

  function load() {
    setLoading(true); setError(null);
    getSellerMe().then((result) => { setMe(result); if (!result.shop) setEditingShop(true); }).catch((reason: unknown) => { if (reason instanceof ApiError && reason.status === 401) { navigate("/seller/login"); return; } setError(reason instanceof ApiError ? reason.message : ui.errorGeneric); }).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function logout() { await logoutSeller().catch((reason: unknown) => console.warn("Keluar dari sesi penjual gagal.", reason)); navigate("/"); }
  function savedShop(shop: SellerShop) { setMe((current) => current ? { ...current, shop } : current); setEditingShop(false); }

  if (loading) return <div className="loading-state">{ui.loading}</div>;
  if (error || !me) return <div className="error-state" role="alert"><h1>Sesi penjual tidak tersedia</h1><p>{error ?? ui.errorGeneric}</p><div className="card-actions"><a className="button button-primary" href="/seller/login" data-nav="true">{ui.login}</a><a className="button button-text" href="/" data-nav="true">{ui.home}</a></div></div>;
  if (me.seller.pinResetRequired) return <><PinChangeForm required onChanged={load} /><button className="button button-text" type="button" onClick={logout}>{ui.logout}</button><AdsenseSlot placement="SELLER" /></>;
  return (
    <>
      <section className="hero"><h1>{ui.sellerDashboard}</h1><p>Kelola katalog dan arahkan pelanggan ke WhatsApp.</p><div className="card-actions"><button className="button button-text" type="button" onClick={logout}>{ui.logout}</button></div></section>
      <div className="dashboard-grid">
        <div>
          <section className="info-state"><h2>Status toko</h2><p>{me.shop ? `Toko ${me.shop.name} siap ditampilkan.` : "Profil toko belum dibuat."}</p>{me.shop ? <><span className={`status-badge${me.shop.visibilityStatus === "HIDDEN" ? " error" : ""}`}>{me.shop.visibilityStatus === "HIDDEN" ? "Disembunyikan superadmin" : "Tampil untuk pelanggan"}</span><div className="card-actions"><a className="button button-primary" href={`/${me.shop.slug}`} data-nav="true">Lihat katalog</a><button className="button button-secondary" type="button" onClick={() => setEditingShop(true)}>Edit profil toko</button></div></> : null}</section>
          {editingShop ? <ShopForm shop={me.shop} onSaved={savedShop} onCancel={me.shop ? () => setEditingShop(false) : undefined} /> : null}
          <div className="section-heading"><div><h2>Ringkasan katalog</h2><p>{me.productCount} produk, {me.availableProductCount} tersedia</p></div></div>
          <ProductManager enabled={Boolean(me.shop)} />
        </div>
        <aside>
          <PhoneChangeForm currentPhone={me.seller.phone} onChanged={(phone) => setMe((current) => current ? { ...current, seller: { ...current.seller, phone } } : current)} />
          <PinChangeForm required={false} onChanged={load} />
        </aside>
      </div>
      <AdsenseSlot placement="SELLER" />
    </>
  );
}
