import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, getCategories, getLocations, listPublicProducts, trackEvent } from "../api";
import { AdsenseSlot } from "../components/AdsenseSlot";
import { LocationFilters } from "../components/LocationFilters";
import { PublicProductCard } from "../components/PublicProductCard";
import { Icon } from "../components/Icon";
import { ui } from "../../shared/i18n";
import type { LocationOption, ProductCategory, ProductSearchParams, ProductSearchResponse } from "../../shared/types";

const PRODUCT_PAGE_SIZE = 24;

function readFilters(): ProductSearchParams {
  const query = new URLSearchParams(window.location.search);
  const value = (key: string) => query.get(key)?.trim() || undefined;
  return { q: value("q"), provinceCode: value("provinceCode"), cityRegencyCode: value("cityRegencyCode"), districtCode: value("districtCode"), categoryCode: value("categoryCode") };
}

function writeFilters(filters: ProductSearchParams): ProductSearchParams {
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

function errorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null;
}

export function HomePage() {
  const [filters, setFilters] = useState<ProductSearchParams>(readFilters);
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [locationLoading, setLocationLoading] = useState({ provinces: true, cities: false, districts: false });
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [result, setResult] = useState<ProductSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [retryNumber, setRetryNumber] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const activeRequestKey = useRef("");
  const requestKey = JSON.stringify(filters);

  useEffect(() => {
    const onPopState = () => {
      const next = readFilters();
      setFilters(next);
      setSearchInput(next.q ?? "");
    };
    window.addEventListener("popstate", onPopState);
    Promise.all([getLocations("PROVINCE"), getCategories()])
      .then(([locationResult, categoryResult]) => { setProvinces(locationResult.items); setCategories(categoryResult.items); })
      .finally(() => { setLocationLoading((current) => ({ ...current, provinces: false })); setCategoriesLoading(false); })
      .catch((reason: unknown) => setError(errorMessage(reason)));
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!filters.provinceCode) { setCities([]); setLocationLoading((current) => ({ ...current, cities: false })); return; }
    setCities([]);
    setLocationLoading((current) => ({ ...current, cities: true }));
    getLocations("CITY_REGENCY", filters.provinceCode).then((response) => setCities(response.items)).catch((reason: unknown) => setError(errorMessage(reason))).finally(() => setLocationLoading((current) => ({ ...current, cities: false })));
  }, [filters.provinceCode]);

  useEffect(() => {
    if (!filters.cityRegencyCode) { setDistricts([]); setLocationLoading((current) => ({ ...current, districts: false })); return; }
    setDistricts([]);
    setLocationLoading((current) => ({ ...current, districts: true }));
    getLocations("DISTRICT", filters.cityRegencyCode).then((response) => setDistricts(response.items)).catch((reason: unknown) => setError(errorMessage(reason))).finally(() => setLocationLoading((current) => ({ ...current, districts: false })));
  }, [filters.cityRegencyCode]);

  useEffect(() => {
    activeRequestKey.current = requestKey;
    let active = true;
    setLoading(true);
    setLoadingMore(false);
    setLoadMoreError(null);
    setError(null);
    setErrorKind(null);
    setResult(null);
    listPublicProducts({ ...filters, limit: PRODUCT_PAGE_SIZE }).then((response) => { if (active) setResult(response); }).catch((reason: unknown) => { if (active) { setResult(null); setError(errorMessage(reason)); setErrorKind(errorCode(reason)); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, requestKey, retryNumber]);

  const nextCursor = result?.nextCursor ?? null;
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || loadingMore || activeRequestKey.current !== requestKey) return;
    const cursor = nextCursor;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const response = await listPublicProducts({ ...filters, cursor, limit: PRODUCT_PAGE_SIZE });
      if (activeRequestKey.current !== requestKey) return;
      setResult((current) => current ? { ...current, resultCount: response.resultCount, nextCursor: response.nextCursor, items: [...current.items, ...response.items] } : current);
    } catch (reason: unknown) {
      if (activeRequestKey.current === requestKey) setLoadMoreError(errorMessage(reason));
    } finally {
      if (activeRequestKey.current === requestKey) setLoadingMore(false);
    }
  }, [filters, loading, loadingMore, nextCursor, requestKey]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !nextCursor || loading || loadingMore || loadMoreError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void loadMore();
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loading, loadingMore, loadMoreError, nextCursor]);

  function apply(next: ProductSearchParams) {
    setFilters(writeFilters(next));
  }

  function applyFilter(next: ProductSearchParams) {
    const filterCount = [next.provinceCode, next.cityRegencyCode, next.districtCode, next.categoryCode].filter(Boolean).length;
    trackEvent("home_filter_applied", { filterCount, ...(next.categoryCode ? { categoryCode: next.categoryCode } : {}) });
    apply(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackEvent("home_search_submitted", { queryLength: searchInput.trim().length });
    apply({ ...filters, q: searchInput.trim() || undefined });
  }

  function clearFilters() {
    setSearchInput("");
    trackEvent("home_filter_applied", { filterCount: 0 });
    apply({});
  }

  const hasFilters = Boolean(filters.q || filters.provinceCode || filters.cityRegencyCode || filters.districtCode || filters.categoryCode);
  useEffect(() => {
    if (!loading && result && result.items.length === 0 && hasFilters) trackEvent("home_search_no_results", { resultCount: 0 });
  }, [loading, result, hasFilters]);
  return (
    <>
      <section className="filter-panel home-discovery-panel" aria-label="Pencarian dan filter produk">
        <form className="home-filter-form" onSubmit={submitSearch}>
          <div className="home-search-row">
            <div className="field filter-search-field">
              <label htmlFor="product-search">{ui.searchPlaceholder}</label>
              <input id="product-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={ui.searchPlaceholder} />
            </div>
            <button className="button button-primary filter-search-action" type="submit"><Icon name="search" size={18} /><span>{ui.search}</span></button>
          </div>
          <div className="filter-scroll">
            <div className="filter-row">
              <LocationFilters
                filters={filters}
                provinces={provinces}
                cities={cities}
                districts={districts}
                onProvinceChange={(value) => applyFilter({ ...filters, provinceCode: value || undefined, cityRegencyCode: undefined, districtCode: undefined })}
                onCityChange={(value) => applyFilter({ ...filters, cityRegencyCode: value || undefined, districtCode: undefined })}
                onDistrictChange={(value) => applyFilter({ ...filters, districtCode: value || undefined })}
                loading={locationLoading}
              />
              <div className="field filter-field">
                <label htmlFor="product-category">{ui.category}</label>
                <select id="product-category" value={filters.categoryCode ?? ""} disabled={categoriesLoading} aria-busy={categoriesLoading} onChange={(event) => applyFilter({ ...filters, categoryCode: event.target.value || undefined })}>
                  <option value="">{categoriesLoading ? "Memuat kategori..." : ui.allCategories}</option>
                  {categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
                </select>
              </div>
              {hasFilters ? <div className="filter-actions"><button className="button button-text" type="button" onClick={clearFilters}>{ui.clearFilters}</button></div> : null}
            </div>
          </div>
        </form>
      </section>
      <AdsenseSlot placement="HOME" />
      <section aria-labelledby="product-list-heading">
        <div className="section-heading"><div><p className="eyebrow">Katalog pilihan</p><h1 id="product-list-heading">Produk lokal</h1>{result ? <p>{result.resultCount} produk ditemukan</p> : null}</div></div>
        {loading && !result ? <div className="loading-state" aria-live="polite">{ui.loading}</div> : null}
        {error ? <div className="error-state" role="alert">
          <h2>{errorKind === "INVALID_LOCATION_FILTER" || errorKind === "INVALID_CATEGORY" ? "Filter tidak valid" : "Produk belum dapat dimuat"}</h2>
          <p>{error}</p>
          <div className="card-actions">
            <button className="button button-primary" type="button" onClick={() => setRetryNumber((current) => current + 1)}>{ui.retry}</button>
            {errorKind === "INVALID_LOCATION_FILTER" || errorKind === "INVALID_CATEGORY" ? <button className="button button-text" type="button" onClick={clearFilters}>{ui.clearFilters}</button> : null}
          </div>
        </div> : null}
        {!loading && !error && result && result.items.length === 0 ? <div className="empty-state">{hasFilters ? ui.noResults : ui.noProducts}</div> : null}
        {!loading && !error && result && result.items.length > 0 ? <div className="discovery-product-grid">{result.items.map((product) => <PublicProductCard key={product.id} product={product} />)}</div> : null}
        {!loading && !error && result && result.items.length > 0 && result.nextCursor ? <div ref={loadMoreRef} className="infinite-load-state" aria-live="polite">
          {loadingMore ? <><span className="loading-spinner" aria-hidden="true" />Memuat produk lainnya...</> : loadMoreError ? <><span role="alert">{loadMoreError}</span><button className="button button-text" type="button" onClick={() => void loadMore()}>{ui.retry}</button></> : <span>Gulir untuk memuat produk lainnya</span>}
        </div> : null}
        {!loading && !error && result && result.items.length > 0 && !result.nextCursor ? <p className="infinite-end-state">Semua produk telah ditampilkan.</p> : null}
      </section>
    </>
  );
}
