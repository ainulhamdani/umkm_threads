import type { LocationOption, ShopSearchParams } from "../../shared/types";
import { ui } from "../../shared/i18n";

type Props = {
  filters: ShopSearchParams;
  provinces: LocationOption[];
  cities: LocationOption[];
  districts: LocationOption[];
  onProvinceChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  loading?: { provinces: boolean; cities: boolean; districts: boolean };
};

function LocationSelect({ label, value, options, disabled, loading = false, onChange }: { label: string; value: string; options: LocationOption[]; disabled?: boolean; loading?: boolean; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={`filter-${label}`}>{label}</label>
      <select id={`filter-${label}`} value={value ?? ""} disabled={disabled || loading} aria-busy={loading} onChange={(event) => onChange(event.target.value)}>
        <option value="">{loading ? "Memuat wilayah..." : ui.allLocations}</option>
        {options.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
      </select>
    </div>
  );
}

export function LocationFilters({ filters, provinces, cities, districts, onProvinceChange, onCityChange, onDistrictChange, loading = { provinces: false, cities: false, districts: false } }: Props) {
  return (
    <div className="field-grid">
      <LocationSelect label={ui.province} value={filters.provinceCode ?? ""} options={provinces} loading={loading.provinces} onChange={onProvinceChange} />
      <LocationSelect label={ui.cityRegency} value={filters.cityRegencyCode ?? ""} options={cities} disabled={!filters.provinceCode} loading={loading.cities} onChange={onCityChange} />
      <LocationSelect label={ui.district} value={filters.districtCode ?? ""} options={districts} disabled={!filters.cityRegencyCode} loading={loading.districts} onChange={onDistrictChange} />
    </div>
  );
}
