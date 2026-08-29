import { useEffect, useState } from "react";
import { ApiError, getCategories, listSellerProducts, updateSellerProduct } from "../api";
import { formatIdr, ui } from "../../shared/i18n";
import type { ProductCategory, SellerProduct } from "../../shared/types";
import { ProductForm } from "./ProductForm";
import { Icon } from "./Icon";

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
    <section className="seller-products-panel" aria-labelledby="seller-products-heading">
      <div className="section-heading"><div><p className="eyebrow">Kelola katalog</p><h2 id="seller-products-heading">{ui.products}</h2><p>{products.length} produk</p></div><button className="button button-primary" type="button" onClick={() => { setAdding(true); setEditing(null); }}><Icon name="plus" size={18} />Tambah produk</button></div>
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      {adding ? <ProductForm categories={categories} product={null} onSaved={saved} onCancel={() => setAdding(false)} /> : null}
      {editing ? <ProductForm categories={categories} product={editing} onSaved={saved} onCancel={() => setEditing(null)} /> : null}
      {products.length === 0 ? <div className="empty-state">{ui.noProducts}</div> : <div className="data-list product-manager-list">{products.map((product) => <article className="data-row seller-product-row" key={product.id}><div className="product-row-main"><img className="product-row-image" src={product.imageUrl} alt={`Foto produk ${product.name}`} /><div><strong>{product.name}</strong><p className="muted">{formatIdr(product.priceIdr)}</p><div className="chip-row"><span className="chip">{product.primaryCategory.label}</span>{product.secondaryCategories.slice(0, 2).map((category) => <span className="chip" key={category.code}>{category.label}</span>)}</div></div></div><span className={`status-badge${product.visibilityStatus === "HIDDEN" ? " error" : ""}`}>{product.visibilityStatus === "HIDDEN" ? "Disembunyikan superadmin" : product.available ? ui.available : ui.unavailable}</span><div className="card-actions"><button className="button button-secondary" type="button" onClick={() => { setEditing(product); setAdding(false); }}><Icon name="edit" size={16} />Edit</button><button className="button button-text" type="button" onClick={() => toggle(product)}>{product.available ? "Tandai tidak tersedia" : "Tandai tersedia"}</button></div></article>)}</div>}
    </section>
  );
}
