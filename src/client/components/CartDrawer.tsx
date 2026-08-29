import { useState, type FormEvent } from "react";
import { ApiError, createWhatsAppLink, trackEvent } from "../api";
import { formatIdr, ui } from "../../shared/i18n";
import type { ProductSummary } from "../../shared/types";
import { Icon } from "./Icon";

export type CartLine = { product: ProductSummary; quantity: number };

type Props = {
  slug: string;
  shopName: string;
  lines: CartLine[];
  onClose: () => void;
  onRemove: (productId: number) => void;
};

export function CartDrawer({ slug, shopName, lines, onClose, onRemove }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const subtotal = lines.reduce((sum, line) => sum + line.product.priceIdr * line.quantity, 0);

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await createWhatsAppLink(slug, lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })), customerName.trim(), customerNote.trim());
      window.location.href = result.whatsappUrl;
    } catch (reason) {
      trackEvent("whatsapp_link_generation_failed");
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="cart-backdrop" aria-hidden="true" onClick={onClose} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-heading">
        <div className="cart-header"><div><p className="eyebrow">Pesanan</p><h2 id="cart-heading">{ui.cart}</h2></div><button className="icon-button" type="button" aria-label={ui.close} onClick={onClose}><Icon name="close" size={20} /></button></div>
        <p className="cart-shop-label"><Icon name="store" size={16} />{shopName}</p>
        {lines.length === 0 ? <div className="empty-state">{ui.emptyCart}</div> : (
          <>
            <div className="cart-lines">
              {lines.map((line) => <div className="cart-line" key={line.product.id}><div><strong>{line.product.name}</strong><p className="muted">{line.quantity} × {formatIdr(line.product.priceIdr)}</p></div><div className="cart-line-end"><strong>{formatIdr(line.product.priceIdr * line.quantity)}</strong><button className="button button-text" type="button" onClick={() => onRemove(line.product.id)}>Hapus</button></div></div>)}
            </div>
            <div className="cart-summary"><span>{ui.subtotal}</span><span>{formatIdr(subtotal)}</span></div>
            <form className="form-card cart-form" onSubmit={checkout}>
              <div className="field"><label htmlFor="customer-name">Nama pelanggan (opsional)</label><input id="customer-name" value={customerName} maxLength={100} onChange={(event) => setCustomerName(event.target.value)} /></div>
              <div className="field"><label htmlFor="customer-note">{ui.customerNote}</label><textarea id="customer-note" value={customerNote} maxLength={500} onChange={(event) => setCustomerNote(event.target.value)} /></div>
              {error ? <div className="form-error" role="alert">{error}</div> : null}
              <button className="button button-primary" type="submit" disabled={submitting}><Icon name="phone" size={18} />{submitting ? ui.loading : ui.orderWhatsapp}</button>
            </form>
          </>
        )}
      </aside>
    </>
  );
}
