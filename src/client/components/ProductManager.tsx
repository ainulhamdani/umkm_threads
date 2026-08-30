import { useEffect, useState } from "react";
import { ApiError, listSellerProducts, updateSellerProduct } from "../api";
import { formatIdr, ui } from "../../shared/i18n";
import type { SellerProduct } from "../../shared/types";
import { Icon } from "./Icon";

export function ProductManager({ enabled }: { enabled: boolean }) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    listSellerProducts()
      .then((productResult) => setProducts(productResult.items))
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric))
      .finally(() => setLoading(false));
  }, [enabled]);

  async function toggle(product: SellerProduct) {
    try {
      setError(null);
      const updated = await updateSellerProduct(product.id, { available: !product.available });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    }
  }

  if (!enabled) return <div className="info-state">Buat profil toko untuk mulai menambahkan produk.</div>;
  if (loading) return <div className="loading-state">{ui.loading}</div>;
  return (
    <section className="seller-products-panel" aria-labelledby="seller-products-heading">
      <div className="section-heading"><div><p className="eyebrow">Kelola katalog</p><h2 id="seller-products-heading">{ui.products}</h2><p>{products.length} produk</p></div><a className="button button-primary" href="/seller/products/new" data-nav="true"><Icon name="plus" size={18} />Tambah produk</a></div>
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      {products.length === 0 ? <div className="empty-state">{ui.noProducts}</div> : <div className="data-list product-manager-list">{products.map((product) => <article className="data-row seller-product-row" key={product.id}><div className="product-row-main"><img className="product-row-image" src={product.imageUrl} alt={`Foto produk ${product.name}`} /><div><strong>{product.name}</strong><p className="muted">{formatIdr(product.priceIdr)}</p><div className="chip-row"><span className="chip">{product.primaryCategory.label}</span>{product.secondaryCategories.slice(0, 2).map((category) => <span className="chip" key={category.code}>{category.label}</span>)}</div></div></div><span className={`status-badge${product.visibilityStatus === "HIDDEN" ? " error" : ""}`}>{product.visibilityStatus === "HIDDEN" ? "Disembunyikan superadmin" : product.available ? ui.available : ui.unavailable}</span><div className="card-actions"><a className="button button-secondary" href={`/seller/products/${product.id}/edit`} data-nav="true"><Icon name="edit" size={16} />Edit</a><button className="button button-text" type="button" onClick={() => toggle(product)}>{product.available ? "Tandai tidak tersedia" : "Tandai tersedia"}</button></div></article>)}</div>}
    </section>
  );
}
