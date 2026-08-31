import { formatIdr, ui } from "../../shared/i18n";
import type { PublicProduct } from "../../shared/types";
import { Icon } from "./Icon";

function locationText(product: PublicProduct): string {
  const address = product.shop.address;
  return [address.districtName, address.cityRegencyName, address.provinceName].filter(Boolean).join(" · ");
}

function shopHref(product: PublicProduct): string {
  return `/${product.shop.slug}`;
}

export function PublicProductCard({ product }: { product: PublicProduct }) {
  const href = shopHref(product);
  return (
    <article className="discovery-product-card">
      <a className="discovery-product-image-link" href={href} data-nav="true" aria-label={`${product.name}, ${ui.viewShop.toLowerCase()} ${product.shop.name}`}>
        <img className="discovery-product-image" src={product.imageUrl} alt={`Foto produk ${product.name}`} loading="lazy" />
      </a>
      <div className="discovery-product-body">
        <div className="discovery-product-category-row">
          <span className="chip">{product.primaryCategory.label}</span>
          {product.secondaryCategories.slice(0, 1).map((category) => <span className="chip" key={category.code}>{category.label}</span>)}
        </div>
        <a className="discovery-product-name" href={href} data-nav="true">{product.name}</a>
        <strong className="discovery-product-price">{formatIdr(product.priceIdr)}</strong>
        {product.description ? <p className="discovery-product-description">{product.description}</p> : null}
        <div className="discovery-product-shop">
          <Icon name="store" size={15} />
          <span>{product.shop.name}</span>
          <span className="discovery-product-location">{locationText(product)}</span>
        </div>
        <a className="button button-secondary discovery-product-action" href={href} data-nav="true"><Icon name="external" size={16} />{ui.viewShop}</a>
      </div>
    </article>
  );
}
