import { useState, type FormEvent } from "react";
import { ApiError, loginSeller, registerSeller } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { BrandMark } from "../components/BrandMark";
import { Icon } from "../components/Icon";
import { ui } from "../../shared/i18n";

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function SellerAuthPage({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (isRegister && pin !== confirmation) { setError("Konfirmasi PIN tidak sama."); return; }
    setBusy(true);
    try {
      if (isRegister) { await registerSeller(phone, pin); navigate("/seller/setup"); }
      else { await loginSeller(phone, pin); navigate("/seller/dashboard"); }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header"><a href="/" data-nav="true" aria-label={ui.appName}><BrandMark subtitle="Portal penjual" /></a><a className="auth-back" href="/" data-nav="true"><Icon name="home" size={17} />Kembali ke marketplace</a></header>
      <div className="auth-layout">
        <section className="auth-intro"><div className="auth-art"><Icon name="store" size={76} /></div><p className="eyebrow">Ruang penjual</p><h1>{isRegister ? "Mulai jualan di katalog lokal Indonesia" : "Kelola toko dari satu tempat"}</h1><p>Atur katalog produk Anda dan terima pesanan langsung melalui WhatsApp.</p></section>
        <form className="form-card auth-card" onSubmit={submit}>
          <BrandMark subtitle="Ruang penjual" />
          <h1>{isRegister ? "Daftar sebagai penjual" : "Masuk sebagai penjual"}</h1>
          <p className="auth-card-subtitle">{isRegister ? "Mulai jualan di katalog lokal Indonesia." : "Kelola katalog toko dan pesanan WhatsApp Anda."}</p>
          <div className="field"><label htmlFor="seller-phone">Nomor WhatsApp</label><input id="seller-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08xxxxxxxxxx" required /></div>
          <div className="field"><label htmlFor="seller-pin">PIN 6 angka</label><input id="seller-pin" type="password" inputMode="numeric" autoComplete={isRegister ? "new-password" : "current-password"} pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /><span className="field-help">Gunakan PIN numerik untuk mengakses dasbor penjual.</span></div>
          {isRegister ? <div className="field"><label htmlFor="seller-pin-confirm">Konfirmasi PIN</label><input id="seller-pin-confirm" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></div> : null}
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? ui.loading : isRegister ? "Buat akun" : ui.login}</button></div>
          <p className="auth-card-footer"><a href={isRegister ? "/seller/login" : "/seller/register"} data-nav="true">{isRegister ? "Sudah memiliki akun? Masuk" : "Belum memiliki akun? Daftar sebagai penjual"}</a></p>
          <div className="auth-security-note"><Icon name="shield" size={18} />{isRegister ? "PIN digunakan untuk masuk ke dasbor penjual." : "Masuk tanpa OTP. Aktivitas akun tetap terlindungi."}</div>
        </form>
      </div>
      <AdsenseSlot placement="SELLER" />
    </div>
  );
}
