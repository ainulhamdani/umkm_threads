import { useEffect, useMemo, useState } from "react";
import { ApiError, getShop } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { CartDrawer, type CartLine } from "../components/CartDrawer";
import { ProductCard } from "../components/ProductCard";
import { ui } from "../../shared/i18n";
import type { ProductSummary, PublicShop } from "../../shared/types";

type StoredCart = { shopId: number; shopSlug: string; shopName: string; lines: Array<{ productId: number; quantity: number }> };
const CART_STORAGE_KEY = "threads-umkm-cart";

function readStoredCart(): StoredCart | null {
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as StoredCart;
    if (!value || typeof value.shopId !== "number" || !Array.isArray(value.lines)) return null;
    return value;
  } catch (error) {
    console.warn("Keranjang tersimpan tidak dapat dibaca.", error);
    return null;
  }
}

function locationText(shop: PublicShop): string {
  const address = shop.address;
  return [address.provinceName, address.cityRegencyName, address.districtName].filter(Boolean).join(" · ");
}

function notFoundMessage(error: unknown): string {
  return error instanceof ApiError && error.status === 404 ? "Toko tidak ditemukan." : ui.errorGeneric;
}

export function ShopPage({ slug }: { slug: string }) {
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ shopId: number; shopSlug: string; shopName: string; lines: CartLine[] } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    setShop(null);
    setError(null);
    getShop(slug).then((loadedShop) => {
      setShop(loadedShop);
      const stored = readStoredCart();
      if (stored?.shopId === loadedShop.id && stored.shopSlug.toLowerCase() === loadedShop.slug.toLowerCase()) {
        const productById = new Map(loadedShop.products.map((product) => [product.id, product]));
        const lines = stored.lines.flatMap((line) => {
          const product = productById.get(line.productId);
          return product && product.available && Number.isInteger(line.quantity) && line.quantity > 0 ? [{ product, quantity: Math.min(99, line.quantity) }] : [];
        });
        setCart({ shopId: loadedShop.id, shopSlug: loadedShop.slug, shopName: loadedShop.name, lines });
      } else {
        setCart(null);
      }
    }).catch((reason: unknown) => setError(notFoundMessage(reason)));
  }, [slug]);

  useEffect(() => {
    if (!cart) { window.localStorage.removeItem(CART_STORAGE_KEY); return; }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ shopId: cart.shopId, shopSlug: cart.shopSlug, shopName: cart.shopName, lines: cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })) } satisfies StoredCart));
  }, [cart]);

  const quantityByProduct = useMemo(() => new Map(cart?.lines.map((line) => [line.product.id, line.quantity]) ?? []), [cart]);

  function changeQuantity(product: ProductSummary, nextQuantity: number) {
    if (!shop || !product.available) return;
    if (cart && cart.shopId !== shop.id) {
      const replace = window.confirm("Keranjang berisi produk dari toko lain. Ganti isi keranjang dengan produk toko ini?");
      if (!replace) return;
      setCart({ shopId: shop.id, shopSlug: shop.slug, shopName: shop.name, lines: [] });
    }
    setCart((current) => {
      const base = current && current.shopId === shop.id ? current : { shopId: shop.id, shopSlug: shop.slug, shopName: shop.name, lines: [] };
      const withoutProduct = base.lines.filter((line) => line.product.id !== product.id);
      return nextQuantity > 0 ? { ...base, lines: [...withoutProduct, { product, quantity: Math.min(99, nextQuantity) }] } : { ...base, lines: withoutProduct };
    });
  }

  function removeProduct(productId: number) {
    setCart((current) => current ? { ...current, lines: current.lines.filter((line) => line.product.id !== productId) } : current);
  }

  if (error) return <div className="error-state" role="alert"><h1>{error.includes("tidak ditemukan") ? "Toko tidak ditemukan" : "Toko belum dapat dimuat"}</h1><p>{error}</p><a href="/" data-nav="true">Kembali ke beranda</a></div>;
  if (!shop) return <div className="loading-state" aria-live="polite">{ui.loading}</div>;
  const initial = shop.name.trim().charAt(0).toUpperCase() || "T";
  return (
    <>
      <section className="shop-hero">
        <div className="shop-card-header">
          {shop.profileImageUrl ? <img className="avatar" src={shop.profileImageUrl} alt={`Foto profil ${shop.name}`} /> : <div className="avatar avatar-placeholder" aria-hidden="true">{initial}</div>}
          <div><h1>{shop.name}</h1><p className="shop-location">{locationText(shop)}</p></div>
        </div>
        <p className="shop-address">{shop.address.addressDetail}</p>
        {shop.description ? <p>{shop.description}</p> : null}
        <p className="muted">Nomor WhatsApp: {shop.phone}</p>
        <div className="card-actions"><a className="button button-text" href="/" data-nav="true">{ui.home}</a><button className="button button-primary" type="button" onClick={() => setCartOpen(true)}>{ui.cart} ({cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0})</button></div>
      </section>
      <AdsenseSlot placement="SHOP" />
      <section aria-labelledby="product-list-heading">
        <div className="section-heading"><h2 id="product-list-heading">{ui.products}</h2></div>
        {shop.products.length === 0 ? <div className="empty-state">{ui.noProducts}</div> : <div className="product-grid">{shop.products.map((product) => <ProductCard key={product.id} product={product} quantity={quantityByProduct.get(product.id) ?? 0} onChange={(quantity) => changeQuantity(product, quantity)} />)}</div>}
      </section>
      {cartOpen && cart ? <CartDrawer slug={shop.slug} shopName={shop.name} lines={cart.lines} onClose={() => setCartOpen(false)} onRemove={removeProduct} /> : null}
    </>
  );
}
