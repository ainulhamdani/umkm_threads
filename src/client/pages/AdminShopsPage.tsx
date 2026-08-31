import { useEffect, useState, type FormEvent } from "react";
import { listAdminSellers, setShopVisibility, type AdminSeller } from "../api";
import { adminErrorMessage } from "../admin-utils";
import { AdminPageLayout } from "../components/AdminPageLayout";
import { Icon } from "../components/Icon";
import { ui } from "../../shared/i18n";

export function AdminShopsPage() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    listAdminSellers(search.trim())
      .then((result) => setSellers(result.items))
      .catch((reason: unknown) => {
        const nextError = adminErrorMessage(reason);
        if (nextError) setError(nextError);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    load();
  }

  async function toggleShop(seller: AdminSeller) {
    if (!seller.shop) return;
    try {
      setError(null);
      await setShopVisibility(seller.shop.id, seller.shop.visibilityStatus !== "PUBLISHED");
      setMessage("Visibilitas toko diperbarui.");
      load();
    } catch (reason) {
      const nextError = adminErrorMessage(reason);
      if (nextError) setError(nextError);
    }
  }

  const shops = sellers.filter((seller) => seller.shop !== null);
  return (
    <AdminPageLayout activeSection="shops" title="Toko" description="Tinjau katalog toko dan atur apakah toko terlihat oleh pelanggan.">
      {message ? <div className="info-state" role="status">{message}</div> : null}
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      <form className="filter-panel admin-search" onSubmit={submitSearch}><div className="field"><label htmlFor="admin-shop-search">Cari toko</label><input id="admin-shop-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama toko, slug, atau nomor telepon" /></div><button className="button button-primary" type="submit"><Icon name="search" size={17} />{ui.search}</button></form>
      {loading ? <div className="loading-state">{ui.loading}</div> : <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Daftar toko</h2><p>{shops.length} toko ditemukan</p></div><Icon name="store" size={21} /></div><div className="admin-list">{shops.length === 0 ? <div className="empty-state">Belum ada data toko.</div> : shops.map((seller) => { const shop = seller.shop; if (!shop) return null; return <article className="admin-list-row" key={shop.id}><div className="admin-list-row-main"><span className="admin-avatar"><Icon name="store" size={17} /></span><div><strong>{shop.name}</strong><p className="muted">{"/" + shop.slug}</p><p className="muted">Pemilik: {seller.phone}</p></div></div><span className={"status-badge" + (shop.visibilityStatus === "HIDDEN" ? " error" : "")}>{shop.visibilityStatus === "HIDDEN" ? "Disembunyikan" : "Tampil"}</span><div className="admin-list-row-actions"><button className="button button-text" type="button" onClick={() => toggleShop(seller)}><Icon name={shop.visibilityStatus === "PUBLISHED" ? "eye" : "check"} size={15} />{shop.visibilityStatus === "PUBLISHED" ? "Sembunyikan toko" : "Tampilkan toko"}</button></div></article>; })}</div></section>}
    </AdminPageLayout>
  );
}
