export type LocationLevel = "PROVINCE" | "CITY_REGENCY" | "DISTRICT";

export type LocationOption = {
  code: string;
  name: string;
  level: LocationLevel;
  parentCode: string | null;
};

export type ShopAddress = {
  addressDetail: string;
  provinceCode: string;
  cityRegencyCode: string;
  districtCode: string;
  provinceName?: string;
  cityRegencyName?: string;
  districtName?: string;
};

export type ProductCategory = {
  code: string;
  label: string;
  displayOrder: number;
};

export type ProductCategoryAssignment = {
  categoryCode: string;
  label?: string;
  position: number;
};

export type ProductSummary = {
  id: number;
  name: string;
  priceIdr: number;
  description: string | null;
  imageUrl: string;
  primaryCategory: ProductCategory;
  secondaryCategories: ProductCategory[];
  available: boolean;
};

export type SellerProduct = {
  id: number;
  mediaId: number;
  imageUrl: string;
  name: string;
  priceIdr: number;
  description: string | null;
  primaryCategoryCode: string;
  primaryCategory: ProductCategory;
  secondaryCategoryCodes: string[];
  secondaryCategories: ProductCategory[];
  available: boolean;
  visibilityStatus: string;
};

export type ShopSummary = {
  id: number;
  name: string;
  slug: string;
  profileImageUrl: string | null;
  address: ShopAddress;
};

export type ShopSearchItem = {
  shop: ShopSummary;
  matchingProducts: ProductSummary[];
};

export type ShopSearchParams = {
  q?: string;
  provinceCode?: string;
  cityRegencyCode?: string;
  districtCode?: string;
  categoryCode?: string;
  cursor?: string;
  limit?: number;
};

export type ShopSearchResponse = {
  appliedFilters: ShopSearchParams;
  resultCount: number;
  nextCursor: string | null;
  items: ShopSearchItem[];
};

export type PublicShop = ShopSummary & {
  phone: string;
  description: string | null;
  products: ProductSummary[];
};
