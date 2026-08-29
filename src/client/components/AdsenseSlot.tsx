import { useEffect, useState } from "react";
import { getAdPlacement } from "../api";
import { ui } from "../../shared/i18n";

export function AdsenseSlot({ placement }: { placement: "HOME" | "SHOP" | "SELLER" | "ADMIN" }) {
  const [config, setConfig] = useState<{ enabled: boolean; clientId: string; slotId: string } | null>(null);
  useEffect(() => { getAdPlacement(placement).then(setConfig).catch((reason: unknown) => console.warn("Konfigurasi iklan tidak dapat dimuat.", reason)); }, [placement]);
  useEffect(() => {
    if (!config?.enabled) return;
    const scriptSelector = `script[data-adsense-client="${config.clientId}"]`;
    if (!document.querySelector(scriptSelector)) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.adsenseClient = config.clientId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.clientId)}`;
      document.head.appendChild(script);
    }
    const ads = (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ?? [];
    ads.push({});
    (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = ads;
  }, [config]);
  if (!config?.enabled) return <aside className="ad-slot" aria-label={ui.adsLabel}><span>{config ? ui.adsUnavailable : ui.loading}</span></aside>;
  return (
    <aside className="ad-slot" aria-label={ui.adsLabel}>
      <ins className="adsbygoogle" style={{ display: "block", width: "100%" }} data-ad-client={config.clientId} data-ad-slot={config.slotId} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
