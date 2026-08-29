import { useEffect, useState, type FormEvent } from "react";
import { ApiError, getCategories, getLocations, listShops } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { LocationFilters } from "../components/LocationFilters";
import { ShopCard } from "../components/ShopCard";
import { ui } from "../../shared/i18n";
import type { LocationOption, ProductCategory, ShopSearchParams, ShopSearchResponse } from "../../shared/types";

function readFilters(): ShopSearchParams {
  const query = new URLSearchParams(window.location.search);
  const value = (key: string) => query.get(key)?.trim() || undefined;
  return { q: value("q"), provinceCode: value("provinceCode"), cityRegencyCode: value("cityRegencyCode"), districtCode: value("districtCode"), categoryCode: value("categoryCode") };
}

function writeFilters(filters: ShopSearchParams): ShopSearchParams {
  const query = new URLSearchParams();
  for (const key of ["q", "provinceCode", "cityRegencyCode", "districtCode", "categoryCode"] as const) {
    const value = filters[key];
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  window.history.pushState({}, "", suffix ? `/?${suffix}` : "/");
  return readFilters();
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : ui.errorGeneric;
}

export function HomePage() {
  const [filters, setFilters] = useState<ShopSearchParams>(readFilters);
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [result, setResult] = useState<ShopSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      const next = readFilters();
      setFilters(next);
      setSearchInput(next.q ?? "");
    };
    window.addEventListener("popstate", onPopState);
    Promise.all([getLocations("PROVINCE"), getCategories()])
      .then(([locationResult, categoryResult]) => { setProvinces(locationResult.items); setCategories(categoryResult.items); })
      .catch((reason: unknown) => setError(errorMessage(reason)));
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!filters.provinceCode) { setCities([]); return; }
    setCities([]);
    getLocations("CITY_REGENCY", filters.provinceCode).then((response) => setCities(response.items)).catch((reason: unknown) => setError(errorMessage(reason)));
  }, [filters.provinceCode]);

  useEffect(() => {
    if (!filters.cityRegencyCode) { setDistricts([]); return; }
    setDistricts([]);
    getLocations("DISTRICT", filters.cityRegencyCode).then((response) => setDistricts(response.items)).catch((reason: unknown) => setError(errorMessage(reason)));
  }, [filters.cityRegencyCode]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listShops(filters).then(setResult).catch((reason: unknown) => { setResult(null); setError(errorMessage(reason)); }).finally(() => setLoading(false));
  }, [filters]);

  function apply(next: ShopSearchParams) {
    setFilters(writeFilters(next));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({ ...filters, q: searchInput.trim() || undefined });
  }

  function clearFilters() {
    setSearchInput("");
    apply({});
  }

  const hasFilters = Boolean(filters.q || filters.provinceCode || filters.cityRegencyCode || filters.districtCode || filters.categoryCode);
  return (
    <>
      <section className="hero">
        <h1>Temukan toko lokal di sekitar Anda</h1>
        <p>Jelajahi katalog produk UMKM Indonesia dan hubungi penjual langsung melalui WhatsApp.</p>
      </section>
      <section className="filter-panel" aria-label="Pencarian dan filter toko">
        <form onSubmit={submitSearch}>
          <div className="field">
            <label htmlFor="product-search">{ui.searchPlaceholder}</label>
            <input id="product-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={ui.searchPlaceholder} />
          </div>
          <div className="filter-actions">
            <button className="button button-primary" type="submit">{ui.search}</button>
            {hasFilters ? <button className="button button-text" type="button" onClick={clearFilters}>{ui.clearFilters}</button> : null}
          </div>
        </form>
        <LocationFilters
          filters={filters}
          provinces={provinces}
          cities={cities}
          districts={districts}
          onProvinceChange={(value) => apply({ ...filters, provinceCode: value || undefined, cityRegencyCode: undefined, districtCode: undefined })}
          onCityChange={(value) => apply({ ...filters, cityRegencyCode: value || undefined, districtCode: undefined })}
          onDistrictChange={(value) => apply({ ...filters, districtCode: value || undefined })}
        />
        <div className="field">
          <label htmlFor="product-category">{ui.category}</label>
          <select id="product-category" value={filters.categoryCode ?? ""} onChange={(event) => apply({ ...filters, categoryCode: event.target.value || undefined })}>
            <option value="">{ui.allCategories}</option>
            {categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
          </select>
        </div>
      </section>
      <AdsenseSlot placement="HOME" />
      <section aria-labelledby="shop-list-heading">
        <div className="section-heading"><div><h2 id="shop-list-heading">{ui.shops}</h2>{result ? <p>{result.resultCount} toko ditemukan</p> : null}</div></div>
        {loading ? <div className="loading-state" aria-live="polite">{ui.loading}</div> : null}
        {error ? <div className="error-state" role="alert">{error}</div> : null}
        {!loading && !error && result && result.items.length === 0 ? <div className="empty-state">{hasFilters ? ui.noResults : ui.noShops}</div> : null}
        {!loading && !error && result && result.items.length > 0 ? <div className="shop-grid">{result.items.map((item) => <ShopCard key={item.shop.id} item={item} />)}</div> : null}
      </section>
    </>
  );
}
