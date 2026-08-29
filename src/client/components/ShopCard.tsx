import { formatIdr, ui } from "../../shared/i18n";
import type { ProductSummary, ShopSearchItem } from "../../shared/types";

function locationText(item: ShopSearchItem): string {
  const address = item.shop.address;
  return [address.provinceName, address.cityRegencyName, address.districtName].filter(Boolean).join(" · ");
}

function Preview({ product }: { product: ProductSummary }) {
  return (
    <figure className="product-preview">
      <img src={product.imageUrl} alt={`Foto ${product.name}`} loading="lazy" />
      <figcaption>{product.name}<span>{formatIdr(product.priceIdr)}</span></figcaption>
    </figure>
  );
}

export function ShopCard({ item }: { item: ShopSearchItem }) {
  const { shop, matchingProducts } = item;
  const initial = shop.name.trim().charAt(0).toUpperCase() || "T";
  return (
    <article className="shop-card">
      <div className="shop-card-body">
        <div className="shop-card-header">
          {shop.profileImageUrl ? <img className="avatar" src={shop.profileImageUrl} alt={`Foto profil ${shop.name}`} loading="lazy" /> : <div className="avatar avatar-placeholder" aria-hidden="true">{initial}</div>}
          <div>
            <h3>{shop.name}</h3>
            <p className="shop-location">{locationText(item)}</p>
          </div>
        </div>
        <p className="shop-address">{shop.address.addressDetail}</p>
        <div className="product-preview-grid">
          {matchingProducts.slice(0, 4).map((product) => <Preview key={product.id} product={product} />)}
        </div>
        <div className="card-actions">
          <a className="button button-primary" href={`/${shop.slug}`} data-nav="true">{ui.viewShop}</a>
        </div>
      </div>
    </article>
  );
}
