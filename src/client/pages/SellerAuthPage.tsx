import { useState, type FormEvent } from "react";
import { ApiError, loginSeller, registerSeller } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
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
    <>
      <section className="hero"><h1>{isRegister ? ui.register : ui.login}</h1><p>Kelola katalog toko Anda dan terima pesanan melalui WhatsApp.</p></section>
      <form className="form-card" onSubmit={submit}>
        <div className="field"><label htmlFor="seller-phone">Nomor telepon</label><input id="seller-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08xxxxxxxxxx" required /></div>
        <div className="field"><label htmlFor="seller-pin">PIN enam digit</label><input id="seller-pin" type="password" inputMode="numeric" autoComplete={isRegister ? "new-password" : "current-password"} pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div>
        {isRegister ? <div className="field"><label htmlFor="seller-pin-confirm">Konfirmasi PIN</label><input id="seller-pin-confirm" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div> : null}
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? ui.loading : isRegister ? ui.register : ui.login}</button>
        <a href={isRegister ? "/seller/login" : "/seller/register"} data-nav="true">{isRegister ? "Sudah memiliki akun? Masuk" : "Belum memiliki akun? Daftar sebagai penjual"}</a>
      </form>
      <AdsenseSlot placement="SELLER" />
    </>
  );
}
