import { useEffect, useState } from "react";
import { ApiError, getCategories, listSellerProducts } from "../api";
import { ui } from "../../shared/i18n";
import type { ProductCategory, SellerProduct } from "../../shared/types";
import { ProductForm } from "./ProductForm";

type Props = {
  productId?: number;
  onSaved: (product: SellerProduct) => void;
  onCancel: () => void;
};

export function ProductEditor({ productId, onSaved, onCancel }: Props) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setProduct(null);

    const productRequest = productId === undefined
      ? Promise.resolve<SellerProduct | null>(null)
      : listSellerProducts().then((result) => result.items.find((item) => item.id === productId) ?? null);

    Promise.all([getCategories(), productRequest])
      .then(([categoryResult, selectedProduct]) => {
        if (!active) return;
        if (productId !== undefined && !selectedProduct) {
          setError("Produk tidak ditemukan atau bukan milik toko Anda.");
          return;
        }
        setCategories(categoryResult.items);
        setProduct(selectedProduct);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) return <div className="loading-state">{ui.loading}</div>;
  if (error) {
    return (
      <div className="error-state" role="alert">
        <h2>Produk tidak dapat dibuka</h2>
        <p>{error}</p>
        <a className="button button-secondary" href="/seller/products" data-nav="true">Kembali ke produk</a>
      </div>
    );
  }
  if (categories.length === 0) {
    return (
      <div className="error-state" role="alert">
        <h2>Kategori produk belum tersedia</h2>
        <p>Produk belum dapat dibuat sampai kategori produk tersedia.</p>
        <button className="button button-secondary" type="button" onClick={onCancel}>Kembali ke produk</button>
      </div>
    );
  }

  return <ProductForm categories={categories} product={product} onSaved={onSaved} onCancel={onCancel} />;
}
