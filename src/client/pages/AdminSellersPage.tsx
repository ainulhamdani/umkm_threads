import { useEffect, useState, type FormEvent } from "react";
import { listAdminSellers, resetSellerPin, type AdminSeller } from "../api";
import { adminErrorMessage } from "../admin-utils";
import { AdminPageLayout } from "../components/AdminPageLayout";
import { Icon } from "../components/Icon";
import { ui } from "../../shared/i18n";

export function AdminSellersPage() {
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

  async function pinReset(seller: AdminSeller) {
    try {
      setError(null);
      const result = await resetSellerPin(seller.id);
      setMessage("PIN sementara untuk " + seller.phone + ": " + result.temporaryPin + ". Simpan atau sampaikan dengan aman.");
      load();
    } catch (reason) {
      const nextError = adminErrorMessage(reason);
      if (nextError) setError(nextError);
    }
  }

  return (
    <AdminPageLayout activeSection="sellers" title="Penjual" description="Dukung akun penjual dan kelola akses mereka ke platform.">
      {message ? <div className="info-state" role="status">{message}</div> : null}
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      <form className="filter-panel admin-search" onSubmit={submitSearch}><div className="field"><label htmlFor="admin-seller-search">Cari penjual</label><input id="admin-seller-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nomor telepon atau nama toko" /></div><button className="button button-primary" type="submit"><Icon name="search" size={17} />{ui.search}</button></form>
      {loading ? <div className="loading-state">{ui.loading}</div> : <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Daftar penjual</h2><p>{sellers.length} penjual ditemukan</p></div><Icon name="users" size={21} /></div><div className="admin-list">{sellers.length === 0 ? <div className="empty-state">Belum ada data penjual.</div> : sellers.map((seller) => <article className="admin-list-row" key={seller.id}><div className="admin-list-row-main"><span className="admin-avatar">{seller.phone.slice(-2)}</span><div><strong>{seller.phone}</strong><p className="muted">{seller.shop ? seller.shop.name + " · /" + seller.shop.slug : "Profil toko belum dibuat"}</p><p className="muted">{seller.productCount} produk</p></div></div><span className={"status-badge" + (seller.status === "SUSPENDED" ? " error" : "")}>{seller.status === "SUSPENDED" ? "Ditangguhkan" : seller.pinResetRequired ? "Perlu ganti PIN" : "Aktif"}</span><div className="admin-list-row-actions"><button className="button button-secondary" type="button" onClick={() => pinReset(seller)}><Icon name="lock" size={15} />Atur ulang PIN</button></div></article>)}</div></section>}
    </AdminPageLayout>
  );
}
