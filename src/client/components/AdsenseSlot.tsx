import { ui } from "../../shared/i18n";

export function AdsenseSlot({ placement }: { placement: "HOME" | "SHOP" | "SELLER" | "ADMIN" }) {
  return (
    <aside className="ad-slot" aria-label={`${ui.adsLabel} ${placement}`}>
      <span>{ui.adsLabel}</span>
    </aside>
  );
}
