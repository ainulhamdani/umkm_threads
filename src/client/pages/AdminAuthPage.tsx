import { useState, type FormEvent } from "react";
import { ApiError, loginAdmin } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { BrandMark } from "../components/BrandMark";
import { Icon } from "../components/Icon";
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
  return <div className="auth-page admin-auth-page"><header className="auth-header"><a href="/" data-nav="true" aria-label={ui.appName}><BrandMark subtitle="Pengelolaan platform" /></a><a className="auth-back" href="/" data-nav="true"><Icon name="home" size={17} />Kembali ke marketplace</a></header><div className="auth-layout"><section className="auth-intro"><div className="auth-art"><Icon name="shield" size={76} /></div><p className="eyebrow">Pengelolaan platform</p><h1>Jaga katalog lokal tetap aman dan terlihat.</h1><p>Kelola visibilitas toko, dukung penjual, dan pantau pengaturan platform dari satu konsol.</p></section><form className="form-card auth-card" onSubmit={submit}><BrandMark subtitle="Pengelola platform" /><h1>Masuk superadmin</h1><p className="auth-card-subtitle">Akses khusus untuk pengelola Threads UMKM.</p><div className="field"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@contoh.id" required /></div><div className="field"><label htmlFor="admin-password">Kata sandi</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" required /></div>{error ? <div className="form-error" role="alert">{error}</div> : null}<div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}><Icon name="lock" size={17} />{busy ? ui.loading : ui.login}</button></div><div className="auth-security-note"><Icon name="shield" size={18} />Aktivitas dicatat untuk keamanan.</div></form></div><AdsenseSlot placement="ADMIN" /></div>;
}
