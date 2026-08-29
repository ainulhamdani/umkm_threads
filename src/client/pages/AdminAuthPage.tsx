import { useState, type FormEvent } from "react";
import { ApiError, loginAdmin } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { ui } from "../../shared/i18n";

function navigate(path: string) { window.history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); }

export function AdminAuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await loginAdmin(email, password); navigate("/admin"); } catch (reason) { setError(reason instanceof ApiError ? reason.message : ui.errorGeneric); } finally { setBusy(false); }
  }
  return <><section className="hero"><h1>Masuk sebagai superadmin</h1><p>Kelola keamanan dan visibilitas marketplace.</p></section><form className="form-card" onSubmit={submit}><div className="field"><label htmlFor="admin-email">Alamat email</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="field"><label htmlFor="admin-password">Kata sandi</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary" type="submit" disabled={busy}>{busy ? ui.loading : ui.login}</button></form><AdsenseSlot placement="ADMIN" /></>;
}
