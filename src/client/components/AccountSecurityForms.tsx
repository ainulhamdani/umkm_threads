import { useState, type FormEvent } from "react";
import { ApiError, changeSellerPhone, changeSellerPin } from "../api";
import { ui } from "../../shared/i18n";
import { Icon } from "./Icon";

export function PinChangeForm({ required, onChanged }: { required: boolean; onChanged: () => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPin !== confirmation) { setError("Konfirmasi PIN baru tidak sama."); return; }
    setError(null); setBusy(true);
    try { await changeSellerPin(currentPin, newPin); onChanged(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : ui.errorGeneric); } finally { setBusy(false); }
  }
  return <form className="form-card security-form-card" onSubmit={submit}><div className="form-card-heading"><div><p className="eyebrow">Keamanan akun</p><h2>{required ? "Ganti PIN untuk melanjutkan" : "Perbarui PIN"}</h2></div><span className="security-icon"><Icon name="shield" size={19} /></span></div>{required ? <p className="muted">Superadmin meminta Anda mengganti PIN sementara sebelum mengelola toko.</p> : <p className="muted">Gunakan PIN enam angka yang mudah diingat dan sulit ditebak.</p>}<div className="field"><label htmlFor="current-pin">PIN saat ini</label><input id="current-pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></div><div className="field"><label htmlFor="new-pin">PIN baru</label><input id="new-pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></div><div className="field"><label htmlFor="new-pin-confirm">Konfirmasi PIN baru</label><input id="new-pin-confirm" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></div><div className="security-tip"><Icon name="lock" size={17} />PIN harus terdiri dari 6 angka.</div>{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary" type="submit" disabled={busy}><Icon name="lock" size={17} />{busy ? ui.loading : "Simpan PIN baru"}</button></form>;
}

export function PhoneChangeForm({currentPhone, onChanged}: { currentPhone: string; onChanged: (phone: string) => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setBusy(true);
    try { await changeSellerPhone(currentPin, newPhone); onChanged(newPhone); setCurrentPin(""); setNewPhone(""); } catch (reason) { setError(reason instanceof ApiError ? reason.message : ui.errorGeneric); } finally { setBusy(false); }
  }
  return <form className="form-card security-form-card" onSubmit={submit}><div className="form-card-heading"><div><p className="eyebrow">Pengaturan kontak</p><h2>Nomor WhatsApp</h2></div><span className="security-icon"><Icon name="phone" size={19} /></span></div><p className="muted">Kelola nomor yang menerima pesanan pelanggan.</p><div className="current-setting"><span>Nomor saat ini</span><strong><Icon name="phone" size={17} />{currentPhone}</strong></div><div className="field"><label htmlFor="phone-current-pin">PIN saat ini</label><input id="phone-current-pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" required /></div><div className="field"><label htmlFor="phone-new">Nomor WhatsApp baru</label><input id="phone-new" type="tel" inputMode="tel" value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="08xxxxxxxxxx" required /><span className="field-help">Nomor ini digunakan untuk tombol pesan pelanggan.</span></div>{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary" type="submit" disabled={busy}><Icon name="check" size={17} />{busy ? ui.loading : "Simpan perubahan"}</button></form>;
}
