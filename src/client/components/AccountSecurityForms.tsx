import { useState, type FormEvent } from "react";
import { ApiError, changeSellerPhone, changeSellerPin } from "../api";
import { ui } from "../../shared/i18n";

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
  return <form className="form-card" onSubmit={submit}><h2>{required ? "Ganti PIN untuk melanjutkan" : "Ganti PIN"}</h2>{required ? <p className="muted">Superadmin meminta Anda mengganti PIN sementara sebelum mengelola toko.</p> : null}<div className="field"><label htmlFor="current-pin">PIN saat ini</label><input id="current-pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div><div className="field"><label htmlFor="new-pin">PIN baru</label><input id="new-pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div><div className="field"><label htmlFor="new-pin-confirm">Konfirmasi PIN baru</label><input id="new-pin-confirm" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div>{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary" type="submit" disabled={busy}>{busy ? ui.loading : ui.save}</button></form>;
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
  return <form className="form-card" onSubmit={submit}><h2>Nomor telepon dan WhatsApp</h2><p className="muted">Nomor saat ini: {currentPhone}</p><div className="field"><label htmlFor="phone-current-pin">Konfirmasi PIN</label><input id="phone-current-pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></div><div className="field"><label htmlFor="phone-new">Nomor telepon baru</label><input id="phone-new" type="tel" inputMode="tel" value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="08xxxxxxxxxx" required /></div>{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-secondary" type="submit" disabled={busy}>{busy ? ui.loading : "Perbarui nomor"}</button></form>;
}
