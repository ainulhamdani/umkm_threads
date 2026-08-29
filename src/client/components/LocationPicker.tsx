import { useEffect, useState } from "react";
import { ApiError, getLocations } from "../api";
import { ui } from "../../shared/i18n";
import type { LocationOption } from "../../shared/types";

export type AddressValues = { provinceCode: string; cityRegencyCode: string; districtCode: string };

function SelectField({ id, label, value, options, disabled, loading = false, onChange }: { id: string; label: string; value: string; options: LocationOption[]; disabled?: boolean; loading?: boolean; onChange: (value: string) => void }) {
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} required value={value} disabled={disabled || loading} aria-busy={loading} onChange={(event) => onChange(event.target.value)}><option value="">{loading ? "Memuat wilayah..." : `Pilih ${label.toLowerCase()}`}</option>{options.map((option) => <option value={option.code} key={option.code}>{option.name}</option>)}</select></div>;
}

export function LocationPicker({ value, onChange }: { value: AddressValues; onChange: (value: AddressValues) => void }) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState({ provinces: true, cities: false, districts: false });
  useEffect(() => { getLocations("PROVINCE").then((response) => setProvinces(response.items)).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric)).finally(() => setLoading((current) => ({ ...current, provinces: false }))); }, []);
  useEffect(() => {
    if (!value.provinceCode) { setCities([]); setLoading((current) => ({ ...current, cities: false })); return; }
    setCities([]); setLoading((current) => ({ ...current, cities: true }));
    getLocations("CITY_REGENCY", value.provinceCode).then((response) => setCities(response.items)).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric)).finally(() => setLoading((current) => ({ ...current, cities: false })));
  }, [value.provinceCode]);
  useEffect(() => {
    if (!value.cityRegencyCode) { setDistricts([]); setLoading((current) => ({ ...current, districts: false })); return; }
    setDistricts([]); setLoading((current) => ({ ...current, districts: true }));
    getLocations("DISTRICT", value.cityRegencyCode).then((response) => setDistricts(response.items)).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric)).finally(() => setLoading((current) => ({ ...current, districts: false })));
  }, [value.cityRegencyCode]);
  return <div className="field-grid location-picker-grid">{error ? <div className="field-error" role="alert">{error}</div> : null}<SelectField id="seller-province" label={ui.province} value={value.provinceCode} options={provinces} loading={loading.provinces} onChange={(provinceCode) => onChange({ provinceCode, cityRegencyCode: "", districtCode: "" })} /><SelectField id="seller-city" label={ui.cityRegency} value={value.cityRegencyCode} options={cities} disabled={!value.provinceCode} loading={loading.cities} onChange={(cityRegencyCode) => onChange({ ...value, cityRegencyCode, districtCode: "" })} /><SelectField id="seller-district" label={ui.district} value={value.districtCode} options={districts} disabled={!value.cityRegencyCode} loading={loading.districts} onChange={(districtCode) => onChange({ ...value, districtCode })} /></div>;
}
