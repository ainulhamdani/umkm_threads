import { Icon } from "./Icon";

export function BrandMark({ dark = false, subtitle }: { dark?: boolean; subtitle?: string }) {
  return (
    <span className={`brand-lockup${dark ? " brand-lockup-dark" : ""}`}>
      <span className="brand-mark" aria-hidden="true"><Icon name="store" size={21} /></span>
      <span className="brand-copy">
        <strong>Threads UMKM</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </span>
  );
}
