import { useEffect, useState, type FormEvent } from "react";
import { ApiError, createSellerProduct, updateSellerProduct, uploadMedia } from "../api";
import { formatIdr, ui } from "../../shared/i18n";
import type { ProductCategory, SellerProduct } from "../../shared/types";
import { validateImageFile } from "../../shared/validation";

type Props = { categories: ProductCategory[]; product: SellerProduct | null; onSaved: (product: SellerProduct) => void; onCancel: () => void };

export function ProductForm({ categories, product, onSaved, onCancel }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.priceIdr) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [primary, setPrimary] = useState(product?.primaryCategoryCode ?? categories[0]?.code ?? "");
  const [secondary, setSecondary] = useState<string[]>(product?.secondaryCategoryCodes ?? []);
  const [available, setAvailable] = useState(product?.available ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(product?.imageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(product?.name ?? ""); setPrice(product ? String(product.priceIdr) : ""); setDescription(product?.description ?? ""); setPrimary(product?.primaryCategoryCode ?? categories[0]?.code ?? ""); setSecondary(product?.secondaryCategoryCodes ?? []); setAvailable(product?.available ?? true); setFile(null); setPreview(product?.imageUrl ?? null); }, [product, categories]);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  function setSelectedCategory(code: string, selected: boolean) {
    if (selected) {
      if (secondary.length >= 2) { setError("Pilih paling banyak dua kategori tambahan."); return; }
      if (code !== primary) setSecondary([...secondary, code]);
    } else setSecondary(secondary.filter((item) => item !== code));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!product && !file) { setError("Foto produk wajib dipilih."); return; }
    if (file) {
      const imageErrors = validateImageFile(file);
      if (imageErrors.length > 0) { setError(imageErrors[0] ?? "Gambar tidak valid."); return; }
    }
    setBusy(true);
    try {
      let mediaId = product?.mediaId;
      if (file) mediaId = (await uploadMedia(file, `Foto produk ${name}`)).id;
      const payload = { mediaId, name, priceIdr: Number(price), primaryCategoryCode: primary, secondaryCategoryCodes: secondary, description: description || null, available };
      const saved = product ? await updateSellerProduct(product.id, payload) : await createSellerProduct(payload);
      onSaved(saved);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : ui.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h2>{product ? "Edit produk" : "Tambah produk"}</h2>
      <div className="field"><label htmlFor="product-name">Nama produk</label><input id="product-name" value={name} maxLength={160} onChange={(event) => setName(event.target.value)} required /></div>
      <div className="field"><label htmlFor="product-price">Harga (IDR)</label><input id="product-price" type="number" min="1" step="1" value={price} onChange={(event) => setPrice(event.target.value)} required /><span className="field-help">Contoh: {formatIdr(25000)}.</span></div>
      <div className="field"><label htmlFor="product-image">Foto produk</label><input id="product-image" type="file" accept="image/jpeg,image/png,image/webp" required={!product} onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected) setPreview(URL.createObjectURL(selected)); }} /><span className="field-help">JPG, PNG, atau WebP, maksimal 5 MB.</span>{preview ? <img className="product-form-preview" src={preview} alt={`Pratinjau foto ${name || "produk"}`} /> : null}</div>
      <div className="field"><label htmlFor="product-primary">Kategori utama</label><select id="product-primary" value={primary} onChange={(event) => { const next = event.target.value; setPrimary(next); setSecondary(secondary.filter((item) => item !== next)); }} required><option value="">Pilih kategori utama</option>{categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}</select></div>
      <fieldset className="field"><legend>Kategori tambahan (maksimal dua)</legend>{categories.map((category) => <label className="checkbox-row" key={category.code}><input type="checkbox" checked={secondary.includes(category.code)} disabled={category.code === primary} onChange={(event) => setSelectedCategory(category.code, event.target.checked)} />{category.label}</label>)}</fieldset>
      <div className="field"><label htmlFor="product-description">Deskripsi (opsional)</label><textarea id="product-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
      <label className="checkbox-row"><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />{ui.available}</label>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? ui.loading : ui.save}</button><button className="button button-text" type="button" onClick={onCancel}>{ui.cancel}</button></div>
    </form>
  );
}
