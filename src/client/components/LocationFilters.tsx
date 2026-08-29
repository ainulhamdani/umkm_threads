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
};

function LocationSelect({ label, value, options, disabled, onChange }: { label: string; value: string; options: LocationOption[]; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={`filter-${label}`}>{label}</label>
      <select id={`filter-${label}`} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{ui.allLocations}</option>
        {options.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
      </select>
    </div>
  );
}

export function LocationFilters({ filters, provinces, cities, districts, onProvinceChange, onCityChange, onDistrictChange }: Props) {
  return (
    <div className="field-grid">
      <LocationSelect label={ui.province} value={filters.provinceCode ?? ""} options={provinces} onChange={onProvinceChange} />
      <LocationSelect label={ui.cityRegency} value={filters.cityRegencyCode ?? ""} options={cities} disabled={!filters.provinceCode} onChange={onCityChange} />
      <LocationSelect label={ui.district} value={filters.districtCode ?? ""} options={districts} disabled={!filters.cityRegencyCode} onChange={onDistrictChange} />
    </div>
  );
}
