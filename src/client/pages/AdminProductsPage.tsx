import { useEffect, useState, type FormEvent } from "react";
import { listAdminProducts, setProductVisibility, type AdminProduct } from "../api";
import { adminErrorMessage } from "../admin-utils";
import { AdminPageLayout } from "../components/AdminPageLayout";
import { Icon } from "../components/Icon";
import { formatIdr, ui } from "../../shared/i18n";

export function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    listAdminProducts(search.trim())
      .then((result) => setProducts(result.items))
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

  async function toggleProduct(product: AdminProduct) {
    try {
      setError(null);
      await setProductVisibility(product.id, product.visibilityStatus !== "PUBLISHED");
      setMessage("Visibilitas produk diperbarui.");
      load();
    } catch (reason) {
      const nextError = adminErrorMessage(reason);
      if (nextError) setError(nextError);
    }
  }

  return (
    <AdminPageLayout activeSection="products" title="Produk" description="Moderasi produk yang tampil di katalog publik marketplace.">
      {message ? <div className="info-state" role="status">{message}</div> : null}
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      <form className="filter-panel admin-search" onSubmit={submitSearch}><div className="field"><label htmlFor="admin-product-search">Cari produk</label><input id="admin-product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama produk atau nama toko" /></div><button className="button button-primary" type="submit"><Icon name="search" size={17} />{ui.search}</button></form>
      {loading ? <div className="loading-state">{ui.loading}</div> : <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Moderasi produk</h2><p>{products.length} produk ditemukan</p></div><Icon name="package" size={21} /></div><div className="admin-list">{products.length === 0 ? <div className="empty-state">Belum ada data produk.</div> : products.map((product) => <article className="admin-list-row" key={product.id}><div className="admin-list-row-main"><img className="admin-product-image" src={product.imageUrl} alt={"Foto " + product.name} /><div><strong>{product.name}</strong><p className="muted">{product.shopName + " · " + formatIdr(product.priceIdr)}</p><span className="chip">{product.primaryCategory.label}</span></div></div><span className={"status-badge" + (product.visibilityStatus === "HIDDEN" ? " error" : "")}>{product.visibilityStatus === "HIDDEN" ? "Disembunyikan" : product.available ? "Tersedia" : "Tidak tersedia"}</span><div className="admin-list-row-actions"><button className="button button-text" type="button" onClick={() => toggleProduct(product)}><Icon name={product.visibilityStatus === "PUBLISHED" ? "eye" : "check"} size={15} />{product.visibilityStatus === "PUBLISHED" ? "Sembunyikan" : "Pulihkan"}</button></div></article>)}</div></section>}
    </AdminPageLayout>
  );
}
