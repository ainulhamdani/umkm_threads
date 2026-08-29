# Threads UMKM Marketplace
## Functional Requirements Document (FRD)

| Field | Value |
| --- | --- |
| Product | Threads UMKM Marketplace |
| Document status | MVP implementation specification |
| Version | 1.3 |
| Date | 2026-08-29 |
| Application stack | Bun 1.4.x, React 19.2, TypeScript |
| Design guidance | Mobile-first Material Design 3 |
| Application language | Bahasa Indonesia (`id-ID`) |
| Database service | MySQL through `D:\xampp\mysql` |
| Database name | `threads_shop` |

## 1. Purpose and implementation boundary

This document converts the product requirements in `PRD.md` into implementable behavior, data contracts, validation rules, security controls, and acceptance tests.

The application is a catalog and WhatsApp lead handoff. It does not persist marketplace orders or process payment, delivery, inventory, or order status.

## 2. Technical baseline

### 2.1 Application

- Use React 19.2 for interactive UI components.
- Use TypeScript for application, service, and data types.
- Serve a small static HTML shell and render the React application in the browser, with server-side HTTP handlers for JSON APIs and mutation boundaries.
- Keep public SEO metadata synchronized in the HTML shell and client route state.
- Use React components for interactive state such as the cart, forms, and upload controls.

### 2.2 Runtime and package management

- Use Bun 1.4.x as the local runtime, package manager, script runner, and test runner.
- Commit the Bun lockfile `bun.lock` when the application is created.
- Define development, lint, type-check, test, build, and start scripts for Bun.
- Keep runtime configuration in environment variables; do not commit database, session, media, or AdSense secrets.

### 2.3 Design system

- Follow mobile-first Material Design 3 guidance.
- Design the base layout for mobile widths before adding tablet and desktop arrangements.
- Use Material text fields, select menus, cards, filter chips, dialogs, snackbars, loading indicators, and bottom sheets where they fit the interaction.
- Keep interactive controls at least 48px by 48px.
- Keep the home search and primary filter controls near the top of the mobile layout.
- Use a sticky or bottom-sheet cart summary on mobile.
- Use responsive shop and product cards without horizontal scrolling.
- Define responsive layout tiers as mobile below 600px, tablet from 600px through 1023px, and desktop at 1024px or wider.
- Provide visible selected, focused, disabled, loading, success, and error states for every form and filter control.

#### 2.3.1 Language and localization

- The application locale is `id-ID`.
- Set the root document language to `id` and the response content language to Indonesian where applicable.
- Every user-facing string must be written in Bahasa Indonesia. This includes navigation, headings, labels, buttons, placeholders, helper text, validation errors, success messages, loading states, empty states, confirmation dialogs, notifications, accessibility names, SEO metadata, privacy and consent copy, and AdSense copy.
- Use Indonesian number, date, and currency formatting. Prices use Indonesian Rupiah with no decimal display.
- Use the Indonesian category labels defined in Section 6.6. Internal route names, API paths, database field names, enum codes, and analytics event names may remain in English because they are not rendered directly to users.
- Seller-entered shop names, product names, descriptions, and address details are shown as entered and are not automatically translated.
- Keep all user-facing strings in a centralized Indonesian locale resource. There must be no English fallback for application copy.
- Required public labels include `Cari produk`, `Provinsi`, `Kabupaten/Kota`, `Kecamatan`, `Kategori produk`, `Hapus filter`, `Tambah ke keranjang`, `Keranjang`, `Jumlah`, `Subtotal`, and `Pesan melalui WhatsApp`.
- Required seller labels include `Daftar sebagai penjual`, `Masuk`, `Simpan`, `Tersedia`, and `Tidak tersedia`.
- Required superadmin labels include `Masuk sebagai superadmin`, `Sembunyikan`, `Tampilkan`, and `Atur ulang PIN`.
- Example empty-state copy includes `Belum ada toko`, `Belum ada produk`, and `Tidak ada hasil yang sesuai`.

### 2.4 Database

- Use MySQL served from `D:\xampp\mysql` for local development.
- Use the `threads_shop` database.
- Default local connection is `127.0.0.1:3306`; the port and credentials must be environment-configurable.
- Use a migration-managed MySQL data access layer.
- Provision a dedicated application database user with only the permissions needed by the application. Credentials must come from environment variables and must not be committed.
- Store monetary values as integer IDR amounts, not floating-point values.

### 2.5 Media storage

- Store uploaded files outside Git-tracked source files.
- The application must use a media storage adapter with a stable media identifier.
- Local development uses a configured local uploads directory.
- Production uses a persistent object or file storage target configured by deployment.
- The database stores media metadata and a storage key, not binary image contents.
- Public media is served through a stable media URL and may be optimized by the configured image delivery pipeline.

## 3. Actors and permissions

| Actor | Authentication | Permissions |
| --- | --- | --- |
| Customer | None | Read public shops and products; create a browser cart; generate a WhatsApp order link. |
| Seller | Phone and six-digit PIN | Manage one owned shop, update permitted shop fields, upload media, and manage owned products. |
| Superadmin | Separate protected admin credentials | Manage all sellers, shops, products, seller PIN resets, audit records, and AdSense configuration. |

There is no public customer account and no seller self-service superadmin registration.

## 4. Route map

### 4.1 Page routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Marketplace home and shop discovery. |
| `/{shopSlug}` | Public | Public shop profile, catalog, cart, and WhatsApp order action. |
| `/seller/register` | Public | Seller account registration. |
| `/seller/login` | Public | Seller login. |
| `/seller/dashboard` | Seller | Seller overview and shop state. |
| `/seller/shop` | Seller | Shop profile setup and permitted edits. |
| `/seller/products` | Seller | Product creation, editing, and availability management. |
| `/admin/login` | Public | Superadmin login. |
| `/admin` | Superadmin | Moderation, seller support, and AdSense configuration. |
| `/robots.txt` | Public | Search crawler rules. |
| `/sitemap.xml` | Public | Public shop URL discovery. |

Product details are rendered on `/{shopSlug}`. A separate product page is not required.

### 4.2 Reserved shop slugs

The following exact or normalized path segments cannot be shop slugs:

`seller`, `admin`, `api`, `media`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `login`, `register`, and `undefined`.

The reserved list must be maintained in one shared server and client validation module. A reserved path must return the application route, not a shop lookup.

## 5. Page requirements

### 5.1 Home page

The home page must:

1. Request publicly visible shops from the server.
2. Render a responsive list or grid of shop cards.
3. Show shop name, profile image when available, structured location, address detail, and a link to the public shop URL.
4. Render up to four available and published product images for each shop.
5. Use products ordered by `created_at DESC, id DESC` when no product search or category filter is active.
6. Provide a `Cari produk` input that matches active product names and descriptions.
7. Provide cascading `Provinsi`, `Kabupaten/Kota`, and `Kecamatan` filters for shop location.
8. Provide one `Kategori produk` filter that matches a product's primary or secondary category.
9. Combine search, location, and category conditions using AND logic.
10. Return shop cards when at least one public, available product matches the product conditions and the shop matches the location conditions.
11. Show up to four matching product previews on filtered shop cards.
12. Preserve `q`, `provinceCode`, `cityRegencyCode`, `districtCode`, and `categoryCode` in the URL query string.
13. Show Bahasa Indonesia loading, invalid-filter, no-shops, empty-catalog, and no-results messages.
14. Render an AdSense placement using the current `HOME` slot configuration.

The home page must not expose seller phone numbers, PIN state, internal session data, or hidden shops.

Search behavior is case-insensitive and trims the query before matching product names and descriptions. A blank query removes the text condition. The home page keeps the shop-card result layout rather than switching to standalone product result cards.

### 5.2 Public shop page

The shop page must:

1. Resolve the slug case-insensitively and use the canonical stored slug in metadata.
2. Return a not-found response for a missing or hidden shop.
3. Render the shop name, profile photo, province, city/regency, district, street/address detail, and WhatsApp contact phone.
4. Render available and published products ordered by `created_at DESC, id DESC`.
5. Show each product photo, name, formatted IDR price, primary category, secondary categories when present, optional description, and availability state.
6. Provide quantity controls with a minimum of one and maximum of 99 per product.
7. Keep cart state in the browser and scope it to the current shop ID.
8. Clear or replace an existing cart when the customer chooses a product from another shop, after a confirmation message.
9. Show line totals and a cart subtotal.
10. Provide optional customer name and note fields.
11. Validate cart items before generating the WhatsApp link.
12. Render an AdSense placement using the current `SHOP` slot configuration.

The product card must make unavailable products visibly distinct and must not expose an add-to-cart control for them.

Home search and filter state does not change the direct shop page. A direct shop page always shows all products that are published and available for that shop.

### 5.3 Seller registration

The registration form contains:

- `Nomor telepon`.
- `PIN enam digit`.
- `Konfirmasi PIN`.

On success, the server creates the seller, starts a seller session, and directs the seller to shop setup. The seller cannot appear publicly until a valid shop setup exists.

The form must show field-level errors for invalid phone, invalid PIN, mismatched PIN confirmation, and duplicate phone.

### 5.4 Seller login

The login form contains:

- `Nomor telepon`.
- `PIN enam digit`.

Successful login creates or rotates a secure seller session and redirects to `/seller/dashboard`. Failed login responses must not reveal whether the phone number exists.

The login endpoint must use rate limiting by normalized phone and source IP.

### 5.5 Seller dashboard

The dashboard must show:

- Shop setup status.
- Current shop visibility.
- Product count and available product count.
- A link to the public catalog when the shop is set up.
- Links to shop editing and product management.
- A logout action.

Seller routes must redirect unauthenticated visitors to `/seller/login`.

### 5.6 Shop setup and editing

The shop form contains:

- Shop name.
- Permanent shop slug during initial setup only.
- Profile photo.
- `Provinsi` selected from the bundled administrative dataset.
- `Kabupaten/Kota` selected from the selected province.
- `Kecamatan` selected from the selected city/regency.
- Required `Detail alamat` containing street or landmark information.
- The seller phone number used for login and WhatsApp orders.

Province, city/regency, and district are dependent dropdowns. Changing a parent selection clears all child selections. The values are loaded from a versioned local snapshot of the public [data.go.id Kode Administrasi Wilayah dataset](https://data.go.id/dataset/dataset/kode-administrasi-wilayah). The source URL, retrieval date, and dataset version must be recorded with the seed data.

After setup:

- Shop name, profile photo, structured location, street/address detail, and phone number remain editable.
- The slug input is absent or read-only and cannot be changed through the API.
- The phone number is stored once on `sellers.phone_e164` and is displayed as the shop contact number.
- Changing the phone number requires the authenticated seller's current PIN through the phone-change operation.
- A phone number change must be unique and must invalidate existing sessions.
- A valid save publishes the shop immediately unless the superadmin has hidden it.

### 5.7 Product management

The product form contains:

- `Foto produk`.
- `Nama produk`.
- `Harga` in IDR.
- One required `Kategori utama`.
- Up to two optional `Kategori tambahan` values.
- `Deskripsi` optional.
- `Ketersediaan` toggle.

The seller can update all product fields and availability. The seller cannot change another seller's product by changing an ID in the request.

The fixed category options shown to users are `Pakaian dan Mode`, `Makanan`, `Minuman`, `Kecantikan dan Perawatan Diri`, `Kesehatan dan Kebugaran`, `Rumah Tangga`, `Elektronik dan Aksesori`, `Kerajinan dan Hadiah`, `Pertanian dan Produk Segar`, `Jasa`, and `Lainnya`. Sellers cannot create custom categories in the MVP.

Product deletion is not required. A seller makes a product unavailable instead. The superadmin can hide a product from public pages.

### 5.8 Superadmin console

The console must provide:

- Lists of sellers, shops, and products.
- Search by phone, shop name, slug, or product name within the loaded data set.
- Hide and restore controls for shops and products.
- Seller PIN reset control.
- Audit activity for moderation, PIN reset, and AdSense changes.
- AdSense client and slot configuration.

The console has one application role, `SUPERADMIN`. Unauthenticated visitors must be redirected to `/admin/login`. Sellers must receive a forbidden response if they call admin APIs.

## 6. Data model

### 6.1 `sellers`

| Field | Type and rules |
| --- | --- |
| `id` | Internal primary key. |
| `phone_e164` | Required, unique, normalized phone number. Used for seller login and WhatsApp recipient. |
| `pin_hash` | Required Argon2id or equivalent password hash. Never return it from an API. |
| `status` | `ACTIVE` or `SUSPENDED`; suspended sellers cannot log in or publish changes. |
| `pin_reset_required` | Boolean set after superadmin reset when the next login must replace the PIN. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |

### 6.2 `shops`

| Field | Type and rules |
| --- | --- |
| `id` | Internal primary key. |
| `seller_id` | Required unique foreign key to `sellers`. Enforces one shop per seller. |
| `name` | Required, trimmed, length-limited shop name. |
| `slug` | Required, unique, normalized, URL-safe, immutable after creation. |
| `profile_media_id` | Optional foreign key to `media`. |
| `province_code` | Required foreign key to a `PROVINCE` location. |
| `city_regency_code` | Required foreign key to a `CITY_REGENCY` location whose parent is `province_code`. |
| `district_code` | Required foreign key to a `DISTRICT` location whose parent is `city_regency_code`. |
| `address_detail` | Required, trimmed street or landmark address text. |
| `visibility` | `PUBLISHED` or `HIDDEN`; seller save defaults to `PUBLISHED`. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |

### 6.3 `locations`

This table is seeded from the checked-in public dataset snapshot and is not seller-editable.

| Field | Type and rules |
| --- | --- |
| `code` | Required unique administrative code. |
| `name` | Required display name. |
| `level` | `PROVINCE`, `CITY_REGENCY`, or `DISTRICT`. |
| `parent_code` | Null only for provinces; references the parent location for child levels. |
| `dataset_version` | Required snapshot version. |
| `created_at` | Required timestamp. |

Required database indexes are `level`, `parent_code`, and `(level, parent_code, name)`.

### 6.4 `location_dataset_metadata`

Store one active record for the bundled location snapshot:

- `source_url`.
- `retrieved_at`.
- `dataset_version`.
- `record_count`.
- `checksum`.

The seed process must reject orphaned child records, duplicate codes, invalid levels, and multiple active dataset versions.

### 6.5 `products`

| Field | Type and rules |
| --- | --- |
| `id` | Internal primary key. |
| `shop_id` | Required foreign key to `shops`. |
| `media_id` | Required foreign key to one product image in `media`. |
| `name` | Required, trimmed, length-limited product name. |
| `description` | Optional trimmed text. |
| `price_idr` | Required non-negative integer. |
| `primary_category_code` | Required foreign key to one active `product_categories` record. |
| `availability` | `AVAILABLE` or `UNAVAILABLE`; seller-controlled. |
| `visibility` | `PUBLISHED` or `HIDDEN`; superadmin-controlled. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |

### 6.6 `product_categories`

Seed the fixed category taxonomy with these codes and labels:

| Code | Label | Display order |
| --- | --- | ---: |
| `CLOTHING_FASHION` | Pakaian dan Mode | 1 |
| `FOOD` | Makanan | 2 |
| `DRINKS` | Minuman | 3 |
| `BEAUTY_PERSONAL_CARE` | Kecantikan dan Perawatan Diri | 4 |
| `HEALTH_WELLNESS` | Kesehatan dan Kebugaran | 5 |
| `HOME_HOUSEHOLD` | Rumah Tangga | 6 |
| `ELECTRONICS_ACCESSORIES` | Elektronik dan Aksesori | 7 |
| `HANDICRAFTS_GIFTS` | Kerajinan dan Hadiah | 8 |
| `AGRICULTURE_FRESH_PRODUCE` | Pertanian dan Produk Segar | 9 |
| `SERVICES` | Jasa | 10 |
| `OTHER` | Lainnya | 11 |

| Field | Type and rules |
| --- | --- |
| `code` | Required unique immutable category code. |
| `label` | Required display label. |
| `display_order` | Required positive integer. |
| `active` | Seeded true; category management is outside the MVP. Labels are Bahasa Indonesia. |

### 6.7 `product_category_assignments`

Store only secondary category assignments separately. The product's `primary_category_code` is the canonical primary category.

| Field | Type and rules |
| --- | --- |
| `product_id` | Required foreign key to `products`. |
| `category_code` | Required foreign key to `product_categories`. |
| `role` | Always `SECONDARY` in the persisted secondary-assignment table. |
| `position` | `1` or `2`; unique per product. |

Enforce a unique `(product_id, category_code)` pair and a unique `(product_id, position)` pair. The service transaction must reject more than two rows and must reject a secondary category equal to `primary_category_code`. The category filter matches the product primary field or a secondary assignment.

### 6.8 `media`

| Field | Type and rules |
| --- | --- |
| `id` | Internal primary key or opaque public identifier. |
| `storage_key` | Required unique provider key or local path. |
| `mime_type` | Required allowlisted image MIME type. |
| `byte_size` | Required positive integer. |
| `width` | Required positive integer after inspection. |
| `height` | Required positive integer after inspection. |
| `original_name` | Optional sanitized source name for support only. |
| `created_by_seller_id` | Optional foreign key for ownership checks. |
| `created_at` | Required timestamp. |

### 6.9 `seller_sessions`

| Field | Type and rules |
| --- | --- |
| `id` | Internal primary key. |
| `seller_id` | Required foreign key. |
| `token_hash` | Required hash of the browser session token. |
| `expires_at` | Required expiration timestamp. |
| `last_seen_at` | Required timestamp. |
| `created_at` | Required timestamp. |

### 6.10 `superadmin_users`

| Field | Type and rules |
| --- | --- |
| `id` | Internal primary key. |
| `email` | Required unique login identifier. |
| `password_hash` | Required password hash. |
| `status` | `ACTIVE` or `DISABLED`. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |

Only the `SUPERADMIN` role is required in the MVP.

### 6.11 `superadmin_sessions`

Use the same session rules as seller sessions, with a separate table or an actor-type discriminator. Tokens must not be shared between seller and superadmin sessions.

### 6.12 `adsense_settings`

Use one active settings record containing:

- `enabled`.
- `client_id`.
- `home_slot_id`.
- `shop_slot_id`.
- `seller_slot_id`.
- `admin_slot_id`.
- `updated_by_superadmin_id`.
- `updated_at`.

The settings API must redact or protect values as appropriate for the frontend. The superadmin is the only actor allowed to update them.

### 6.13 `audit_logs`

Record security-sensitive operations:

- Actor type and actor ID.
- Action name.
- Target type and target ID.
- Safe metadata without PINs, session tokens, or secrets.
- Timestamp.

There is no `orders` table in the MVP.

## 7. API contracts

All JSON responses use the following error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Satu atau beberapa kolom tidak valid.",
    "fields": {
      "priceIdr": "Harga harus berupa bilangan bulat Rupiah yang tidak negatif."
    }
  }
}
```

Successful mutation responses should return the updated resource or a minimal result object. Internal hashes, session tokens, storage credentials, and audit secrets are never returned.

### 7.1 Public APIs

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/shops` | Return paginated published shops with up to four available product previews per shop, applying the optional search and filter parameters below. |
| `GET` | `/api/shops/{slug}` | Return one published shop with structured location data and its available, published products and categories. |
| `GET` | `/api/locations` | Return location options from the seeded dataset. Accept `level` and, for child levels, `parentCode`. |
| `GET` | `/api/product-categories` | Return the active fixed product category taxonomy in display order. |
| `POST` | `/api/shops/{slug}/whatsapp-link` | Validate submitted cart item IDs and quantities, calculate current totals, record a click event, and return a WhatsApp URL. Do not create an order. |

The `GET /api/shops` query parameters are:

| Parameter | Rules |
| --- | --- |
| `q` | Optional trimmed, case-insensitive search string matched against active product names and descriptions. |
| `provinceCode` | Optional valid province location code. |
| `cityRegencyCode` | Optional valid city/regency child of `provinceCode`. |
| `districtCode` | Optional valid district child of `cityRegencyCode`. |
| `categoryCode` | Optional active category code matched against primary or secondary product assignments. |
| `cursor` | Optional pagination cursor. |
| `limit` | Optional bounded page size. |

All supplied conditions are combined with AND logic. A shop is returned only when its location satisfies the supplied location conditions and at least one of its products satisfies the supplied product search/category conditions. When no product search or category filter is active, previews use the newest available products. When product conditions are active, previews contain only matching products.

The shop-list response must include the applied filters, result count, pagination state, shop structured location, and up to four matching preview products:

```json
{
  "items": [
    {
      "shop": {
        "slug": "warung-makmur",
        "name": "Warung Makmur",
        "provinceCode": "31",
        "cityRegencyCode": "31.01",
        "districtCode": "31.01.01",
        "addressDetail": "Jalan Contoh Nomor 1",
        "profileImageUrl": "/media/shop-image"
      },
      "matchingProducts": []
    }
  ],
  "appliedFilters": {
    "q": "kemeja",
    "provinceCode": "31",
    "cityRegencyCode": null,
    "districtCode": null,
    "categoryCode": "CLOTHING_FASHION"
  },
  "resultCount": 1,
  "nextCursor": null
}
```

`GET /api/locations` must reject an invalid level or parent-child relationship with `INVALID_LOCATION_FILTER`. The seller and home filter interfaces use the same location response shape.

The corresponding application types are:

```ts
type ShopAddress = {
  addressDetail: string;
  provinceCode: string;
  cityRegencyCode: string;
  districtCode: string;
};

type ProductCategory = {
  code: string;
  label: string;
  displayOrder: number;
};

type ProductCategoryAssignment = {
  categoryCode: string;
  role: "PRIMARY" | "SECONDARY";
  position: 0 | 1 | 2;
};

type ShopSearchParams = {
  q?: string;
  provinceCode?: string;
  cityRegencyCode?: string;
  districtCode?: string;
  categoryCode?: string;
};
```

The `whatsapp-link` request body is:

```json
{
  "items": [
    { "productId": "product-id", "quantity": 2 }
  ],
  "customerName": "Budi",
  "customerNote": "Tolong kirim sore ini"
}
```

The response is:

```json
{
  "shop": { "name": "Warung Makmur" },
  "items": [
    {
      "productId": "product-id",
      "name": "Kemeja batik",
      "quantity": 2,
      "unitPriceIdr": 25000,
      "lineTotalIdr": 50000
    }
  ],
  "subtotalIdr": 50000,
  "whatsappUrl": "https://wa.me/628123456789?text=..."
}
```

### 7.2 Seller authentication APIs

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/seller/register` | Create a seller with a unique phone and six-digit PIN, start a session, and return setup state. |
| `POST` | `/api/seller/login` | Authenticate phone and PIN, apply rate limits, and start a session. |
| `POST` | `/api/seller/logout` | Revoke the current seller session. |
| `GET` | `/api/seller/me` | Return the authenticated seller and shop setup state. |
| `PATCH` | `/api/seller/phone` | Change the seller phone after current PIN confirmation; invalidate existing sessions. The new value becomes the shop WhatsApp recipient. |
| `PATCH` | `/api/seller/pin` | Change the current PIN, including completing a superadmin-forced reset. |

### 7.3 Seller shop APIs

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/seller/shop` | Create the one shop, permanently reserve its slug, and save structured location plus address detail. |
| `GET` | `/api/seller/shop` | Return the authenticated seller's shop. |
| `PATCH` | `/api/seller/shop` | Update name, profile media, province, city/regency, district, and address detail. The slug and phone fields are rejected; phone changes use `/api/seller/phone`. |

The seller phone is stored once on `sellers.phone_e164` and is used for both login and public WhatsApp orders.

The shop-create request body is:

```json
{
  "name": "Warung Makmur",
  "slug": "warung-makmur",
  "profileMediaId": "media-id",
  "provinceCode": "31",
  "cityRegencyCode": "31.01",
  "districtCode": "31.01.01",
  "addressDetail": "Jalan Contoh Nomor 1"
}
```

The shop-update request may contain the same address fields except `slug`. The server must verify that city/regency belongs to the selected province and that district belongs to the selected city/regency.

The phone-change request body is:

```json
{
  "currentPin": "123456",
  "newPhone": "08123456789"
}
```

The PIN-change request body is:

```json
{
  "currentPin": "123456",
  "newPin": "654321"
}
```

When `pin_reset_required` is true, the seller may authenticate with the temporary PIN but may access only the PIN-change operation until a new PIN is saved.

### 7.4 Seller product APIs

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/seller/products` | Return products owned by the authenticated seller's shop. |
| `POST` | `/api/seller/products` | Create a product with one owned media ID, name, IDR price, category assignments, optional description, and availability. |
| `GET` | `/api/seller/products/{id}` | Return one product only when it belongs to the seller's shop. |
| `PATCH` | `/api/seller/products/{id}` | Update product fields, category assignments, or availability after ownership validation. |

Physical deletion is not required. Unavailable status is the seller-facing removal behavior.

The product-create and product-update category fields are:

```json
{
  "primaryCategoryCode": "CLOTHING_FASHION",
  "secondaryCategoryCodes": [
    "HANDICRAFTS_GIFTS",
    "OTHER"
  ]
}
```

The API rejects a missing primary category, more than two secondary categories, duplicate category codes, unknown category codes, or a primary category repeated as a secondary category.

### 7.5 Media API

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/media` | Accept one validated image upload, store it through the media adapter, and return the media ID and public URL. |

The media endpoint accepts `multipart/form-data`, while all metadata and mutation APIs use JSON.

### 7.6 Superadmin APIs

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/admin/login` | Authenticate the seeded or provisioned superadmin account. |
| `POST` | `/api/admin/logout` | Revoke the current superadmin session. |
| `GET` | `/api/admin/sellers` | Return seller support and status data without PIN hashes. |
| `POST` | `/api/admin/sellers/{id}/pin-reset` | Replace a seller PIN with a new six-digit temporary PIN, mark reset required, revoke sessions, and show the new PIN once to the superadmin. Never return the old PIN. |
| `PATCH` | `/api/admin/shops/{id}/visibility` | Hide or restore a shop. |
| `PATCH` | `/api/admin/products/{id}/visibility` | Hide or restore a product. |
| `GET` | `/api/admin/adsense` | Return current AdSense configuration to the superadmin UI. |
| `PATCH` | `/api/admin/adsense` | Update AdSense client and route slot identifiers. |
| `GET` | `/api/admin/audit-logs` | Return paginated safe audit activity. |

## 8. Validation rules

### 8.1 Phone numbers

- Accept common Indonesian input formats such as `0812...`, `+62812...`, or `62812...`.
- Normalize and store as E.164-style digits with country code `62`.
- Remove spaces, hyphens, parentheses, and a leading local `0` during normalization.
- Reject letters, extensions, unsupported country codes, and numbers outside the configured length range.
- Enforce uniqueness after normalization.
- Use the normalized digits without a leading `+` in the `wa.me` path.

### 8.2 PINs

- Exactly six characters.
- Numeric characters only.
- Store only a one-way password hash.
- Never log or include a PIN in an API response.
- Reject the current PIN when a new PIN is required after reset.

### 8.3 Shop names and slugs

- Trim leading and trailing whitespace.
- Require a non-empty shop name.
- Convert slugs to lowercase.
- Allow only `a-z`, `0-9`, and single hyphen separators.
- Reject leading or trailing hyphens, repeated hyphens, reserved paths, and duplicate slugs.
- Do not auto-change an explicitly requested slug after validation. Return the validation error instead.

### 8.4 Address and locations

- Require one province code, one city/regency code, one district code, and non-empty address detail for every shop.
- Accept only location codes present in the active seeded dataset.
- Require `cityRegencyCode` to have `provinceCode` as its parent.
- Require `districtCode` to have `cityRegencyCode` as its parent.
- Reject orphaned, inactive, or cross-parent location combinations.
- Allow the address detail to contain street, building, landmark, and local directions within the configured text limit.
- Return child location options only for the selected parent code.
- Clear city/regency and district values when the province changes.
- Clear district when the city/regency changes.

### 8.5 Products, prices, and categories

- Require a non-empty product name.
- Accept optional description text and trim it.
- Accept only non-negative integer IDR amounts.
- Reject decimal, exponent, negative, non-numeric, or excessively large values.
- Require exactly one primary category from the seeded active taxonomy.
- Allow zero, one, or two secondary categories from the seeded active taxonomy.
- Reject missing, inactive, unknown, duplicate, or custom category codes.
- Reject a primary category repeated in the secondary category list.
- Store primary and secondary assignments in one transaction.
- Enforce quantity as an integer from 1 through 99.
- Reject unavailable or hidden products during cart validation.

### 8.6 Images

- Allow JPEG, PNG, and WebP only.
- Validate MIME type from file content, not only the filename.
- Enforce a maximum upload size of 5 MB per image.
- Require positive dimensions and reject corrupted files.
- Generate a server-side storage key; never use a raw user filename as the storage path.
- Use a consistent public media URL and safe image response headers.

## 9. Authentication and security

### 9.1 Seller sessions

- Create a cryptographically random session token after successful login or registration.
- Store only a hash of the token in `seller_sessions`.
- Send the token in an HTTP-only cookie.
- Set `Secure` in production and `SameSite=Lax`.
- Apply an absolute session expiry and refresh `last_seen_at` during active use.
- Revoke sessions on logout, phone change, suspension, and superadmin reset.

### 9.2 Superadmin sessions

- Use a separate credential and session path from sellers.
- Do not expose a superadmin registration route.
- Require the `SUPERADMIN` actor for every admin mutation.
- Keep the initial credential in deployment secrets or a protected provisioning flow.

### 9.3 Login protection

- Rate-limit failed login attempts by normalized phone or admin email and source IP.
- Use generic authentication failure messages.
- Log security events without secrets.
- Do not reveal whether a seller account exists during failed login.

### 9.4 Authorization

- Derive the seller identity from the session, never from a request body seller ID.
- Check shop ownership on every seller shop and product query or mutation.
- Check product-to-shop ownership before every seller product mutation.
- Check the superadmin session on every admin API.
- Apply CSRF protection to cookie-authenticated state-changing requests.

### 9.5 Input and output safety

- Validate all input at the API boundary.
- Escape user text when rendering HTML.
- Do not render arbitrary HTML from product descriptions.
- Use parameterized database queries through the data access layer.
- Do not expose internal PIN hashes, session tokens, storage credentials, or sensitive audit metadata.

## 10. Cart and WhatsApp behavior

### 10.1 Client cart state

The client cart stores:

- Current shop ID.
- Product IDs.
- Quantities.

Names and prices are display data, not trusted order data. The server re-fetches current product records when creating the WhatsApp link.

If the customer adds a product from another shop:

1. Detect the shop mismatch.
2. Show a confirmation explaining that the current cart belongs to another shop.
3. Clear the current cart only after confirmation.
4. Start a new cart for the selected shop.

### 10.2 Order-link validation

The server must reject the request when:

- The shop is missing or hidden.
- The cart is empty.
- A product does not belong to the requested shop.
- A product is unavailable or hidden.
- A quantity is not an integer from 1 through 99.
- The shop has no valid WhatsApp phone number.

The server must calculate every line total and subtotal from current integer IDR prices. Client-submitted prices are ignored.

### 10.3 Message format

The message should be readable in WhatsApp and use the following structure:

```text
Halo, saya ingin memesan dari {nama toko}:

- {nama produk} x {jumlah} = Rp {total baris}

Subtotal: Rp {subtotal}
Nama pelanggan: {nama jika diisi}
Catatan: {catatan jika diisi}

Mohon konfirmasi ketersediaan, pembayaran, dan pengiriman.
```

The message must be encoded with `encodeURIComponent` or an equivalent standards-compliant URL encoder. The final URL must use the normalized digits in `https://wa.me/{digits}`.

### 10.4 Handoff result

After a valid response, the client opens the returned WhatsApp URL. The UI must show a clear failure state if link generation fails and must not claim that an order was completed.

## 11. Media behavior

- Profile photos and product photos use the same upload validation pipeline.
- New media is uploaded before the related shop or product mutation is committed.
- If a later mutation fails, the media record is marked unused for cleanup rather than silently discarded.
- Public media URLs must not expose local absolute filesystem paths.
- The UI shows upload progress, file validation errors, and a preview before save.
- The server can generate resized variants for thumbnails and responsive public pages.

## 12. AdSense behavior

### 12.1 Placement model

Render a shared `AdSlot` component in the layout for these placement keys:

- `HOME` on `/`.
- `SHOP` on `/{shopSlug}`.
- `SELLER` on seller pages.
- `ADMIN` on the superadmin console.

The component reads the active settings and does not provide seller-level configuration controls.

### 12.2 Configuration rules

- Only a superadmin can read or update AdSense settings through the admin UI.
- Client and slot values are validated as non-empty safe identifiers before save.
- The `enabled` flag controls whether configured placements render.
- Missing or disabled configuration produces an intentional empty slot state, not an invented default identifier.
- AdSense scripts must load according to Google's integration requirements and must not block core catalog or cart behavior.
- Production launch requires `ads.txt`, required privacy disclosures, and any applicable consent mechanism.

## 13. SEO and public sharing

- Public shop pages use a canonical URL based on the immutable slug.
- Generate Bahasa Indonesia title and description metadata from shop name, address, and catalog context.
- Generate Open Graph metadata with the profile image or first available product image.
- Include published shops in `sitemap.xml`.
- Exclude `/seller` and `/admin` routes from search indexing.
- Return `404` for unknown or hidden shop slugs without exposing whether a hidden record exists.
- Provide descriptive image alt text.

## 14. Error and empty states

The UI must define states for:

- No public shops.
- Public shop with no available products.
- Unknown shop slug.
- Hidden shop or product.
- Product becoming unavailable while in the cart.
- Cart becoming empty.
- Invalid seller registration fields.
- Duplicate phone or slug.
- Expired seller or superadmin session.
- Unauthorized or forbidden API access.
- Failed image upload.
- Failed catalog save.
- Failed WhatsApp-link generation.
- Invalid location filter or broken location parent-child relationship.
- Location dropdown loading or empty-child state.
- Product category loading or invalid category state.
- Home search with no matching shops.
- Home filters with no matching shops.
- AdSense disabled or not configured.
- Temporary database or storage failure.

Errors must be written in plain language, identify the next action, and avoid leaking implementation details.
All error, success, confirmation, loading, and empty-state copy must be in Bahasa Indonesia.

## 15. Accessibility and responsive behavior

- Follow the Material Design 3 component and state guidance defined in Section 2.3.
- Build and test the mobile layout first, then add tablet and desktop arrangements.
- Keep touch targets at least 48px by 48px.
- Keep the search field and primary filters near the top of the mobile home layout.
- Use a sticky or bottom-sheet cart summary on mobile.
- Do not require horizontal scrolling for shop cards, product cards, or filters.
- Use semantic headings, landmarks, labels, buttons, and form controls.
- Write accessible names, labels, status announcements, and system-generated alt text in Bahasa Indonesia.
- Ensure all interactive elements are keyboard reachable.
- Show visible focus styles.
- Use `aria-live` for cart totals and form result messages where needed.
- Keep text and controls readable at mobile widths.
- Ensure the cart remains reachable on narrow screens through a sticky summary or drawer.
- Provide alt text for uploaded shop and product images.
- Do not use color alone for availability, validation, or moderation state.

## 16. Logging and analytics

Record structured events for:

- `seller_registered`.
- `seller_login_success` and `seller_login_failure`.
- `shop_created` and `shop_updated`.
- `product_created`, `product_updated`, and `product_availability_changed`.
- `shop_viewed`.
- `home_search_submitted`.
- `home_filter_applied`.
- `home_search_no_results`.
- `product_added_to_cart`.
- `whatsapp_link_generated`.
- `whatsapp_link_generation_failed`.
- `admin_visibility_changed`.
- `seller_pin_reset`.
- `adsense_settings_changed`.

Do not log PINs, session tokens, full customer notes, or other secrets. Customer name and note should not be stored as an order record.
Analytics event names remain technical identifiers and are not shown to users.

## 17. Test plan and acceptance scenarios

### 17.1 Unit tests

- Normalize Indonesian phone inputs to the same canonical value.
- Reject invalid phone formats.
- Accept exactly six numeric PIN digits and reject all other values.
- Hash and verify PINs without exposing plaintext values.
- Normalize valid slugs and reject reserved or duplicate slugs.
- Validate location level, parent-child relationships, and dataset codes.
- Validate the bundled location snapshot for duplicate codes and orphaned records.
- Validate fixed category codes and display order.
- Verify category labels are presented in Bahasa Indonesia.
- Validate one primary category and no more than two secondary categories.
- Normalize and trim home search input before matching product names and descriptions.
- Verify the application locale is `id-ID` and no user-facing English fallback is rendered.
- Format integer IDR prices consistently.
- Calculate line totals and cart subtotals without floating-point arithmetic.
- Encode WhatsApp messages correctly.
- Reject cart quantities outside 1 through 99.

### 17.2 Integration tests

- Registration rejects duplicate normalized phones.
- Registration starts a seller session and returns setup-required state.
- Shop creation enforces one shop per seller and permanent slug uniqueness.
- Location seed data loads all supported levels without orphaned parent references.
- Location API returns only children for the selected parent.
- Shop creation and update reject invalid province, city/regency, district, or address detail values.
- Shop update rejects any slug mutation.
- Product creation requires an owned media record.
- Product creation and update enforce one primary category and a maximum of two secondary categories.
- Product category assignments reject duplicates, unknown codes, and primary-secondary overlap.
- Seller product reads and writes are limited to the seller's own shop.
- Hidden shops and products are excluded from public APIs.
- Unavailable products are excluded from previews and order-link validation.
- Shop search matches product names and descriptions case-insensitively after trimming.
- Home search, location, and category conditions combine with AND logic.
- Category search matches either primary or secondary product assignments.
- Filtered previews contain only matching available products and no more than four items.
- Invalid location filters return `INVALID_LOCATION_FILTER`.
- WhatsApp-link generation uses current database prices, ignores client prices, and returns the correct seller phone.
- Superadmin visibility changes are audited.
- Seller PIN reset revokes sessions and sets reset-required state.
- Sellers cannot read or update AdSense settings.

### 17.3 End-to-end scenarios

1. A visitor opens `/` with no shops and sees the empty state.
2. A visitor opens `/` with one shop and sees no more than four product previews.
3. A visitor searches for a product name and sees only shops with matching active products.
4. A visitor searches by a description term and sees the matching shop cards.
5. A visitor selects a province, then sees only its city/regency options.
6. A visitor selects a city/regency, then sees only its district options.
7. A visitor changes a parent location and child selections are cleared.
8. A visitor combines search, location, and category filters and sees only shops matching all conditions.
9. A visitor selects a category that is assigned as a product's secondary category and sees that shop.
10. A visitor receives the no-results state and can clear all filters.
11. A visitor opens a shared `/{shopSlug}` URL directly and sees the correct catalog.
12. A visitor adds two products from one shop, changes quantities, and receives a correct WhatsApp link.
13. A visitor attempts to add a product from another shop and receives the cart replacement confirmation.
14. A product becomes unavailable before checkout and the customer receives a clear correction message.
15. A seller registers with a valid phone and PIN, completes shop setup, and sees the published catalog.
16. A seller saves a valid province, city/regency, district, and address detail combination.
17. A seller attempts to save an invalid location hierarchy and receives a field-level error.
18. A seller attempts to use an existing phone or slug and receives a field-level error.
19. A seller creates a product with one primary category and two secondary categories.
20. A seller attempts to create a product without a primary category or with three secondary categories and receives validation errors.
21. A seller attempts to edit the slug and the API rejects the mutation.
22. A seller cannot access another seller's product by changing the product ID.
23. A superadmin hides a shop and confirms that its public URL returns not found.
24. A superadmin restores the shop and confirms that it is public again.
25. A superadmin resets a seller PIN and the old session no longer works.
26. A seller attempts to modify AdSense settings and receives a forbidden response.
27. AdSense slots render on public, seller, and superadmin pages when enabled.
28. Invalid images are rejected before they become shop or product media.
29. The primary mobile layout uses Material components and keeps all key controls at least 48px.

### 17.4 Quality checks

- Install dependencies and run scripts through Bun 1.4.x.
- Run the full test suite against a MySQL database named `threads_shop`.
- Verify migrations apply to a clean database and can be used to start the app.
- Verify the location seed includes its public source URL, retrieval date, version, checksum, and valid hierarchy.
- Verify the category seed contains the fixed taxonomy in the documented order.
- Verify all user-facing labels, messages, metadata, accessibility names, and WhatsApp templates are in Bahasa Indonesia.
- Verify the application does not commit uploads, secrets, build output, or compiled artifacts.
- Test mobile, tablet, and desktop widths and keyboard navigation on all primary flows.
- Test filter state persistence through refresh, back, forward, and copied URLs.
- Validate Markdown rendering and cross-reference every PRD requirement in this FRD.

## 18. Traceability matrix

| PRD area | FRD sections |
| --- | --- |
| Technology and design guidance | 2.1, 2.2, 2.3, 15, 17 |
| Bahasa Indonesia application language | 2.3.1, 5, 7, 13, 14, 15, 17 |
| Anonymous shop discovery | 4, 5.1, 6.3, 6.4, 7.1, 13, 17 |
| Home product search and filtering | 5.1, 6.3, 6.4, 6.6, 6.7, 7.1, 8, 16, 17 |
| Public shop catalog | 5.2, 6.2, 6.5, 6.6, 7.1, 10 |
| WhatsApp ordering | 7.1, 10, 17.1, 17.2 |
| Seller phone and PIN access | 3, 5.3, 5.4, 8, 9, 17 |
| Shop profile and structured address management | 5.6, 6.2, 6.3, 6.4, 7.3, 8.4 |
| Permanent shop URL | 4.2, 5.6, 8.3, 13 |
| Product creation, categories, and availability | 5.7, 6.5, 6.6, 6.7, 7.4, 8.5 |
| Superadmin moderation | 3, 5.8, 7.6, 9.4, 16, 17 |
| AdSense monetization | 5.8, 7.6, 12, 17 |
| IDR and Indonesian phones | 2.4, 8.1, 8.5, 10 |
| Media upload and serving | 2.5, 7.5, 8.6, 11, 17 |

## 19. Implementation assumptions

- The seller phone is the login identifier and the WhatsApp recipient for the shop.
- A seller's shop is created after account registration and becomes public after valid setup.
- The public home page includes public shops even when their catalog is empty, with an empty catalog state.
- The home page returns shop cards, with up to four matching product previews when search or category filters are active.
- Home search matches product names and descriptions using case-insensitive substring behavior.
- Home search, category, and location filters combine with AND logic.
- A category filter matches a product's primary or secondary assignment.
- The home location filter supports province, city/regency, and district with cascading controls.
- The seller address includes required structured location codes plus required street/address detail.
- The location dropdowns use a versioned bundled snapshot sourced from the public data.go.id administrative dataset rather than a runtime API.
- Product categories are fixed seed data, with one primary category and up to two secondary categories per product.
- The category filter has one selected category at a time.
- Bun 1.4.x is the runtime, package manager, script runner, and test runner.
- Material Design means Material Design 3 and the mobile layout is implemented first.
- The application locale is `id-ID`, and all user-facing application copy is Bahasa Indonesia.
- Technical API paths, database fields, enum codes, and analytics event names remain unchanged and are not displayed directly to users.
- Product order is newest first because seller-defined sorting is outside the MVP.
- A product is never physically deleted by the seller in the MVP; unavailable is the seller removal state.
- The internal superadmin console is included in the user-facing AdSense route scope because that was selected for this MVP.
- There is no old-slug redirect because shop slugs never change.
