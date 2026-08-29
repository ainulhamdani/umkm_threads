import { useState, type FormEvent } from "react";
import { ApiError, loginAdmin } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { ui } from "../../shared/i18n";

function navigate(path: string) { window.history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); }

export function AdminAuthPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await loginAdmin(phone, pin); navigate("/admin"); } catch (reason) { setError(reason instanceof ApiError ? reason.message : ui.errorGeneric); } finally { setBusy(false); }
  }
  return <><section className="hero"><h1>Masuk sebagai superadmin</h1><p>Kelola keamanan dan visibilitas marketplace.</p></section><form className="form-card" onSubmit={submit}><div className="field"><label htmlFor="admin-phone">Nomor telepon</label><input id="admin-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div><div className="field"><label htmlFor="admin-pin">PIN enam digit</label><input id="admin-pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div>{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary" type="submit" disabled={busy}>{busy ? ui.loading : ui.login}</button></form><AdsenseSlot placement="ADMIN" /></>;
}
