import { useEffect, useState, type FormEvent } from "react";
import { getAdminAdsense, updateAdminAdsense, type AdsenseSettings } from "../api";
import { adminErrorMessage } from "../admin-utils";
import { AdminPageLayout } from "../components/AdminPageLayout";
import { Icon } from "../components/Icon";
import { ui } from "../../shared/i18n";

function adPlacementLabel(placement: keyof AdsenseSettings["slots"]): string {
  return placement === "HOME" ? "beranda" : placement === "SHOP" ? "toko" : placement === "SELLER" ? "penjual" : "superadmin";
}

export function AdminAdsensePage() {
  const [ads, setAds] = useState<AdsenseSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAdsense()
      .then(setAds)
      .catch((reason: unknown) => {
        const nextError = adminErrorMessage(reason);
        if (nextError) setError(nextError);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveAds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ads) return;
    try {
      setError(null);
      setAds(await updateAdminAdsense(ads));
      setMessage("Pengaturan iklan tersimpan.");
    } catch (reason) {
      const nextError = adminErrorMessage(reason);
      if (nextError) setError(nextError);
    }
  }

  if (loading && !ads) return <div className="loading-state">{ui.loading}</div>;
  if (error && !ads) return <div className="error-state" role="alert"><h1>Pengaturan AdSense tidak tersedia</h1><p>{error}</p><a className="button button-primary" href="/admin/login" data-nav="true">{ui.login}</a></div>;
  return (
    <AdminPageLayout activeSection="adsense" title="AdSense" description="Atur client ID dan slot iklan untuk setiap area aplikasi.">
      {message ? <div className="info-state" role="status">{message}</div> : null}
      {error ? <div className="error-state" role="alert">{error}</div> : null}
      {ads ? <form className="form-card admin-panel admin-ads-form" onSubmit={saveAds}><div className="admin-panel-heading"><div><h2>Konfigurasi iklan</h2><p>Perubahan hanya dapat dilakukan oleh superadmin.</p></div><Icon name="settings" size={21} /></div><label className="checkbox-row"><input type="checkbox" checked={ads.enabled} onChange={(event) => setAds({ ...ads, enabled: event.target.checked })} />Aktifkan iklan</label><div className="field"><label htmlFor="ads-client">ID klien AdSense</label><input id="ads-client" value={ads.clientId} onChange={(event) => setAds({ ...ads, clientId: event.target.value })} placeholder="ca-pub-..." /></div>{(["HOME", "SHOP", "SELLER", "ADMIN"] as const).map((placement) => <div className="field" key={placement}><label htmlFor={"ads-" + placement}>Slot {adPlacementLabel(placement)}</label><input id={"ads-" + placement} value={ads.slots[placement]} onChange={(event) => setAds({ ...ads, slots: { ...ads.slots, [placement]: event.target.value } })} /></div>)}<button className="button button-primary" type="submit"><Icon name="check" size={17} />Simpan pengaturan AdSense</button></form> : null}
    </AdminPageLayout>
  );
}
