import { useEffect, useState, type FormEvent } from "react";
import { ApiError, createSellerShop, updateSellerShop, uploadMedia, type SellerShop } from "../api";
import { LocationPicker, type AddressValues } from "./LocationPicker";
import { ui } from "../../shared/i18n";
import { validateImageFile } from "../../shared/validation";
import { Icon } from "./Icon";

type Props = { shop: SellerShop | null; onSaved: (shop: SellerShop) => void; onCancel?: () => void };
type FormValues = AddressValues & { name: string; slug: string; description: string; addressDetail: string; profileMediaId: number | null };

function fromShop(shop: SellerShop | null): FormValues {
  return {
    name: shop?.name ?? "", slug: shop?.slug ?? "", description: shop?.description ?? "", profileMediaId: shop?.profileMediaId ?? null,
    provinceCode: shop?.provinceCode ?? "", cityRegencyCode: shop?.cityRegencyCode ?? "", districtCode: shop?.districtCode ?? "", addressDetail: shop?.addressDetail ?? "",
  };
}

export function ShopForm({ shop, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(() => fromShop(shop));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(shop?.profileImageUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSetup = shop === null;

  useEffect(() => { setValues(fromShop(shop)); setFile(null); setPreview(shop?.profileImageUrl ?? null); }, [shop]);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (file) {
      const imageErrors = validateImageFile(file);
      if (imageErrors.length > 0) { setError(imageErrors[0] ?? "Gambar tidak valid."); return; }
    }
    setBusy(true);
    setStatus(file ? ui.uploading : ui.saving);
    try {
      let profileMediaId = values.profileMediaId;
      if (file) profileMediaId = (await uploadMedia(file, `Foto profil ${values.name}`)).id;
      setStatus(ui.saving);
      const payload = { name: values.name, description: values.description || null, profileMediaId, provinceCode: values.provinceCode, cityRegencyCode: values.cityRegencyCode, districtCode: values.districtCode, addressDetail: values.addressDetail, ...(isSetup ? { slug: values.slug.toLowerCase().trim() } : {}) };
      const saved = isSetup ? await createSellerShop(payload) : await updateSellerShop(payload);
      onSaved(saved);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  function setAddress(address: AddressValues) { setValues((current) => ({ ...current, ...address })); }
  return (
    <form className="form-card shop-form-card" onSubmit={submit}>
      <div className="form-card-heading"><div><p className="eyebrow">Informasi toko</p><h2>{isSetup ? "Buat profil toko" : "Edit profil toko"}</h2></div>{!isSetup ? <span className="saved-badge"><Icon name="check" size={15} />Tersimpan</span> : null}</div>
      <div className="upload-field"><div className="upload-preview">{preview ? <img src={preview} alt="Pratinjau foto profil toko" /> : <Icon name="store" size={30} />}</div><div className="upload-copy"><strong>Foto profil toko</strong><span className="field-help">Gunakan foto yang mewakili toko Anda.</span><label className="button button-secondary" htmlFor="shop-profile"><Icon name="image" size={16} />{preview ? "Ubah foto" : "Pilih foto"}</label>{values.profileMediaId && !file ? <button className="button button-text" type="button" onClick={() => { setValues({ ...values, profileMediaId: null }); setPreview(null); }}>Hapus foto</button> : null}</div><input className="file-input" id="shop-profile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); setPreview(selected ? URL.createObjectURL(selected) : preview); }} /><span className="field-help">JPG, PNG, atau WebP, maksimal 5 MB.</span></div>
      <div className="field"><label htmlFor="shop-name">Nama toko</label><input id="shop-name" value={values.name} maxLength={120} onChange={(event) => setValues({ ...values, name: event.target.value })} required /></div>
      <div className="field"><label htmlFor="shop-slug">URL toko</label><div className="input-with-icon"><input id="shop-slug" value={values.slug} readOnly={!isSetup} onChange={(event) => setValues({ ...values, slug: event.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="nama-toko" required /><Icon name="lock" size={17} /></div><span className="field-help">{isSetup ? "URL ini tidak dapat diubah setelah toko dibuat." : `Katalog: /${values.slug}`}</span></div>
      <div className="field"><label htmlFor="shop-description">Deskripsi toko (opsional)</label><textarea id="shop-description" value={values.description} maxLength={500} onChange={(event) => setValues({ ...values, description: event.target.value })} /></div>
      <LocationPicker value={values} onChange={setAddress} />
      <div className="field"><label htmlFor="shop-address">Detail alamat</label><textarea id="shop-address" value={values.addressDetail} maxLength={500} onChange={(event) => setValues({ ...values, addressDetail: event.target.value })} placeholder="Nama jalan, nomor, atau patokan" required /></div>
      {status ? <div className="info-state" role="status" aria-live="polite">{status}</div> : null}
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}><Icon name="check" size={17} />{busy ? ui.loading : isSetup ? "Simpan profil toko" : "Simpan perubahan"}</button>{onCancel ? <button className="button button-text" type="button" onClick={onCancel}>{ui.cancel}</button> : null}</div>
    </form>
  );
}
