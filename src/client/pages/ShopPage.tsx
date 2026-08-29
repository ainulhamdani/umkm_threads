import { useEffect, useMemo, useState } from "react";
import { ApiError, getShop, trackEvent } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { CartDrawer, type CartLine } from "../components/CartDrawer";
import { ProductCard } from "../components/ProductCard";
import { Icon } from "../components/Icon";
import { formatIdr, ui } from "../../shared/i18n";
import type { ProductSummary, PublicShop } from "../../shared/types";
import { removeMeta, setCanonical, setMeta } from "../seo";

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

function hydrateCart(stored: StoredCart, shop: PublicShop): { shopId: number; shopSlug: string; shopName: string; lines: CartLine[] } | null {
  if (stored.shopId !== shop.id || stored.shopSlug.toLowerCase() !== shop.slug.toLowerCase()) return null;
  const productById = new Map(shop.products.map((product) => [product.id, product]));
  const lines = stored.lines.flatMap((line) => {
    const product = productById.get(line.productId);
    return product && product.available && Number.isInteger(line.quantity) && line.quantity > 0 ? [{ product, quantity: Math.min(99, line.quantity) }] : [];
  });
  return lines.length > 0 ? { shopId: shop.id, shopSlug: shop.slug, shopName: shop.name, lines } : null;
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
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    setShop(null);
    setError(null);
    setCartReady(false);
    getShop(slug).then(async (loadedShop) => {
      setShop(loadedShop);
      const stored = readStoredCart();
      const sameShop = stored?.shopId === loadedShop.id && stored.shopSlug.toLowerCase() === loadedShop.slug.toLowerCase();
      if (sameShop && stored) {
        setCart(hydrateCart(stored, loadedShop));
      } else if (stored) {
        try {
          const previousShop = await getShop(stored.shopSlug);
          setCart(hydrateCart(stored, previousShop));
        } catch (reason: unknown) {
          console.warn("Keranjang dari toko sebelumnya tidak dapat dipulihkan.", reason);
          setCart(null);
        }
      } else {
        setCart(null);
      }
      setCartReady(true);
    }).catch((reason: unknown) => { setError(notFoundMessage(reason)); setCartReady(true); });
  }, [slug]);

  useEffect(() => {
    if (!cartReady) return;
    if (!cart) { window.localStorage.removeItem(CART_STORAGE_KEY); return; }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ shopId: cart.shopId, shopSlug: cart.shopSlug, shopName: cart.shopName, lines: cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })) } satisfies StoredCart));
  }, [cart, cartReady]);

  useEffect(() => {
    if (!shop) return;
    const description = `${shop.name} di ${locationText(shop)}. Lihat katalog produk UMKM dan hubungi penjual melalui WhatsApp.`;
    document.title = `${shop.name} | ${ui.appName}`;
    setMeta("description", description);
    setMeta("robots", "index,follow");
    setMeta("og:title", `${shop.name} | ${ui.appName}`, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", new URL(`/${shop.slug}`, window.location.origin).toString(), "property");
    const image = shop.profileImageUrl ?? shop.products[0]?.imageUrl;
    if (image) setMeta("og:image", new URL(image, window.location.origin).toString(), "property");
    else removeMeta("og:image", "property");
    setCanonical(`/${shop.slug}`);
  }, [shop]);

  useEffect(() => {
    if (error) setMeta("robots", "noindex,nofollow");
  }, [error]);

  const quantityByProduct = useMemo(() => new Map(cart?.lines.map((line) => [line.product.id, line.quantity]) ?? []), [cart]);

  function changeQuantity(product: ProductSummary, nextQuantity: number) {
    if (!shop || !product.available) return;
    if (cart && cart.shopId !== shop.id) {
      const replace = window.confirm("Keranjang berisi produk dari toko lain. Ganti isi keranjang dengan produk toko ini?");
      if (!replace) return;
      setCart({ shopId: shop.id, shopSlug: shop.slug, shopName: shop.name, lines: [] });
    }
    const previousQuantity = quantityByProduct.get(product.id) ?? 0;
    if (previousQuantity === 0 && nextQuantity > 0) trackEvent("product_added_to_cart", { productId: product.id });
    setCart((current) => {
      const base = current && current.shopId === shop.id ? current : { shopId: shop.id, shopSlug: shop.slug, shopName: shop.name, lines: [] };
      const withoutProduct = base.lines.filter((line) => line.product.id !== product.id);
      return nextQuantity > 0 ? { ...base, lines: [...withoutProduct, { product, quantity: Math.min(99, nextQuantity) }] } : { ...base, lines: withoutProduct };
    });
  }

  function removeProduct(productId: number) {
    setCart((current) => current ? { ...current, lines: current.lines.filter((line) => line.product.id !== productId) } : current);
  }

  async function shareShop() {
    const shareData = { title: shop?.name ?? ui.appName, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData).catch((reason: unknown) => console.warn("Berbagi toko dibatalkan.", reason));
      return;
    }
    if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href).catch((reason: unknown) => console.warn("Tautan toko tidak dapat disalin.", reason));
  }

  if (error) return <div className="error-state" role="alert"><h1>{error.includes("tidak ditemukan") ? "Toko tidak ditemukan" : "Toko belum dapat dimuat"}</h1><p>{error}</p><a href="/" data-nav="true">Kembali ke beranda</a></div>;
  if (!shop) return <div className="loading-state" aria-live="polite">{ui.loading}</div>;
  const initial = shop.name.trim().charAt(0).toUpperCase() || "T";
  const cartCount = cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const cartSubtotal = cart?.lines.reduce((sum, line) => sum + line.product.priceIdr * line.quantity, 0) ?? 0;
  return (
    <>
      <section className="shop-hero">
        <div className="shop-card-header">
          {shop.profileImageUrl ? <img className="avatar" src={shop.profileImageUrl} alt={`Foto profil ${shop.name}`} /> : <div className="avatar avatar-placeholder" aria-hidden="true">{initial}</div>}
          <div><h1>{shop.name}</h1><p className="shop-location">{locationText(shop)}</p></div>
        </div>
        <p className="shop-address">{shop.address.addressDetail}</p>
        {shop.description ? <p>{shop.description}</p> : null}
        <div className="shop-phone"><Icon name="phone" size={16} />Nomor WhatsApp: {shop.phone}</div>
        <div className="card-actions"><a className="button button-text" href="/" data-nav="true"><Icon name="home" size={17} />{ui.home}</a><button className="button button-secondary" type="button" onClick={() => void shareShop()}><Icon name="share" size={17} />Bagikan toko</button><button className="button button-primary" type="button" onClick={() => setCartOpen(true)}><Icon name="cart" size={17} />{ui.cart} ({cartCount})</button></div>
      </section>
      <AdsenseSlot placement="SHOP" />
      <section aria-labelledby="product-list-heading">
        <div className="section-heading"><h2 id="product-list-heading">{ui.products}</h2></div>
        {shop.products.length === 0 ? <div className="empty-state">{ui.noProducts}</div> : <div className="product-grid">{shop.products.map((product) => <ProductCard key={product.id} product={product} quantity={quantityByProduct.get(product.id) ?? 0} onChange={(quantity) => changeQuantity(product, quantity)} />)}</div>}
      </section>
      {cartCount > 0 && cart ? <button className="cart-floating" type="button" onClick={() => setCartOpen(true)}><span className="cart-floating-icon"><Icon name="cart" size={21} /></span><span><strong>{ui.cart}</strong><span>{cartCount} produk</span></span><strong>{formatIdr(cartSubtotal)}</strong><Icon name="arrow-right" size={18} /></button> : null}
      {cartOpen && cart ? <CartDrawer slug={cart.shopSlug} shopName={cart.shopName} lines={cart.lines} onClose={() => setCartOpen(false)} onRemove={removeProduct} /> : null}
    </>
  );
}
