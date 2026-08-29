import { useEffect, useState } from "react";
import { ApiError, getLocations } from "../api";
import { ui } from "../../shared/i18n";
import type { LocationOption } from "../../shared/types";

export type AddressValues = { provinceCode: string; cityRegencyCode: string; districtCode: string };

function SelectField({ id, label, value, options, disabled, onChange }: { id: string; label: string; value: string; options: LocationOption[]; disabled?: boolean; onChange: (value: string) => void }) {
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} required value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Pilih {label.toLowerCase()}</option>{options.map((option) => <option value={option.code} key={option.code}>{option.name}</option>)}</select></div>;
}

export function LocationPicker({ value, onChange }: { value: AddressValues; onChange: (value: AddressValues) => void }) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getLocations("PROVINCE").then((response) => setProvinces(response.items)).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric)); }, []);
  useEffect(() => {
    if (!value.provinceCode) { setCities([]); return; }
    getLocations("CITY_REGENCY", value.provinceCode).then((response) => setCities(response.items)).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric));
  }, [value.provinceCode]);
  useEffect(() => {
    if (!value.cityRegencyCode) { setDistricts([]); return; }
    getLocations("DISTRICT", value.cityRegencyCode).then((response) => setDistricts(response.items)).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : ui.errorGeneric));
  }, [value.cityRegencyCode]);
  return <div className="field-grid">{error ? <div className="field-error" role="alert">{error}</div> : null}<SelectField id="seller-province" label={ui.province} value={value.provinceCode} options={provinces} onChange={(provinceCode) => onChange({ provinceCode, cityRegencyCode: "", districtCode: "" })} /><SelectField id="seller-city" label={ui.cityRegency} value={value.cityRegencyCode} options={cities} disabled={!value.provinceCode} onChange={(cityRegencyCode) => onChange({ ...value, cityRegencyCode, districtCode: "" })} /><SelectField id="seller-district" label={ui.district} value={value.districtCode} options={districts} disabled={!value.cityRegencyCode} onChange={(districtCode) => onChange({ ...value, districtCode })} /></div>;
}
