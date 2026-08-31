import { useEffect, useState } from "react";
import { getAdPlacement } from "../api";
import { ui } from "../../shared/i18n";

export function AdsenseSlot({ placement, showUnavailable = false }: { placement: "HOME" | "SHOP" | "SELLER" | "ADMIN"; showUnavailable?: boolean }) {
  const [config, setConfig] = useState<{ enabled: boolean; clientId: string; slotId: string } | null>(null);
  useEffect(() => { getAdPlacement(placement).then(setConfig).catch((reason: unknown) => { console.warn("Konfigurasi iklan tidak dapat dimuat.", reason); setConfig({ enabled: false, clientId: "", slotId: "" }); }); }, [placement]);
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
  if (!config) return showUnavailable ? <aside className="ad-slot" aria-label={ui.adsLabel}><span>{ui.loading}</span></aside> : null;
  if (!config.enabled) return showUnavailable ? <aside className="ad-slot" aria-label={ui.adsLabel}><span>{ui.adsUnavailable}</span></aside> : null;
  return (
    <aside className="ad-slot" aria-label={ui.adsLabel}>
      <ins className="adsbygoogle" style={{ display: "block", width: "100%" }} data-ad-client={config.clientId} data-ad-slot={config.slotId} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
