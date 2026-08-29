import { useEffect, useState } from "react";
import { ApiError, getCategories, listSellerProducts, updateSellerProduct } from "../api";
import { formatIdr, ui } from "../../shared/i18n";
import type { ProductCategory, SellerProduct } from "../../shared/types";
import { ProductForm } from "./ProductForm";

export function ProductManager({ enabled }: { enabled: boolean }) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [editing, setEditing] = useState<SellerProduct | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    Promise.all([getCategories(), listSellerProducts()]).then(([categoryResult, productResult]) => { setCategories(categoryResult.items); setProducts(productResult.items); }).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric)).finally(() => setLoading(false));
  }, [enabled]);

  function saved(product: SellerProduct) {
    setProducts((current) => { const exists = current.some((item) => item.id === product.id); return exists ? current.map((item) => item.id === product.id ? product : item) : [product, ...current]; });
    setAdding(false);
    setEditing(null);
  }

  async function toggle(product: SellerProduct) {
    try { setError(null); saved(await updateSellerProduct(product.id, { available: !product.available })); } catch (reason) { setError(reason instanceof ApiError ? reason.message : ui.errorGeneric); }
  }

  if (!enabled) return <div className="info-state">Buat profil toko untuk mulai menambahkan produk.</div>;
  if (loading) return <div className="loading-state">{ui.loading}</div>;
  return (
    <section aria-labelledby="seller-products-heading">
      <div className="section-heading"><div><h2 id="seller-products-heading">{ui.products}</h2><p>{products.length} produk</p></div><button className="button button-primary" type="button" onClick={() => { setAdding(true); setEditing(null); }}>Tambah produk</button></div>
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      {adding ? <ProductForm categories={categories} product={null} onSaved={saved} onCancel={() => setAdding(false)} /> : null}
      {editing ? <ProductForm categories={categories} product={editing} onSaved={saved} onCancel={() => setEditing(null)} /> : null}
      {products.length === 0 ? <div className="empty-state">{ui.noProducts}</div> : <div className="data-list">{products.map((product) => <article className="data-row" key={product.id}><div className="shop-card-header"><img className="avatar" src={product.imageUrl} alt={`Foto produk ${product.name}`} /><div><strong>{product.name}</strong><p className="muted">{formatIdr(product.priceIdr)} · {product.primaryCategory.label}</p></div></div><span className={`status-badge${product.visibilityStatus === "HIDDEN" ? " error" : ""}`}>{product.visibilityStatus === "HIDDEN" ? "Disembunyikan superadmin" : product.available ? ui.available : ui.unavailable}</span><div className="card-actions"><button className="button button-secondary" type="button" onClick={() => { setEditing(product); setAdding(false); }}>Edit</button><button className="button button-text" type="button" onClick={() => toggle(product)}>{product.available ? "Tandai tidak tersedia" : "Tandai tersedia"}</button></div></article>)}</div>}
    </section>
  );
}
