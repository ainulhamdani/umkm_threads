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

export type ShopSummary = {
  id: number;
  name: string;
  slug: string;
  phone: string;
  profileImageUrl: string | null;
  address: ShopAddress;
  previews: ProductSummary[];
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
  filters: ShopSearchParams;
  resultCount: number;
  nextCursor: string | null;
  shops: ShopSummary[];
};

export type PublicShop = ShopSummary & {
  description: string | null;
  products: ProductSummary[];
};
