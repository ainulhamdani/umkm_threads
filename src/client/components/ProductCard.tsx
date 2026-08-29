import { formatIdr, ui } from "../../shared/i18n";
import type { ProductSummary } from "../../shared/types";
import { Icon } from "./Icon";

type Props = { product: ProductSummary; quantity: number; onChange: (quantity: number) => void };

export function ProductCard({ product, quantity, onChange }: Props) {
  return (
    <article className="product-card">
      <img src={product.imageUrl} alt={`Foto produk ${product.name}`} loading="lazy" />
      <div className="product-card-body">
        <div className="chip-row">
          <span className="chip">{product.primaryCategory.label}</span>
          {product.secondaryCategories.map((category) => <span className="chip" key={category.code}>{category.label}</span>)}
        </div>
        <h3>{product.name}</h3>
        <div className="price">{formatIdr(product.priceIdr)}</div>
        {product.description ? <p className="muted">{product.description}</p> : null}
        {product.available ? (
          quantity === 0 ? <button className="button button-primary" type="button" onClick={() => onChange(1)}><Icon name="plus" size={17} />{ui.addToCart}</button> : (
            <div className="quantity-control" aria-label={`${ui.quantity} ${product.name}`}>
              <button type="button" aria-label={`Kurangi jumlah ${product.name}`} onClick={() => onChange(Math.max(0, quantity - 1))}><Icon name="minus" size={17} /></button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label={`Tambah jumlah ${product.name}`} disabled={quantity >= 99} onClick={() => onChange(Math.min(99, quantity + 1))}><Icon name="plus" size={17} /></button>
            </div>
          )
        ) : <span className="unavailable">{ui.unavailable}</span>}
      </div>
    </article>
  );
}
