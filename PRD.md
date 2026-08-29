# Threads UMKM Marketplace
## Product Requirements Document (PRD)

| Field | Value |
| --- | --- |
| Product | Threads UMKM Marketplace |
| Document status | MVP definition |
| Version | 1.4 |
| Date | 2026-08-29 |
| Application language | Bahasa Indonesia (`id-ID`) |
| Documentation language | English |
| Application stack | Bun 1.4.x, React 19.2, and TypeScript |
| Design guidance | Mobile-first Material Design 3 |
| Database | MySQL database `threads_shop` through `D:\xampp\mysql` |

## 1. Product summary

Threads UMKM Marketplace is a lightweight marketplace for small Indonesian businesses. Customers discover shops, browse each shop's product catalog, build a cart for one shop, and hand the order to the seller through WhatsApp.

All customer-facing, seller-facing, and superadmin-facing application copy must be fully in Bahasa Indonesia. This includes labels, buttons, navigation, placeholders, validation messages, empty states, notifications, accessibility text, SEO metadata, consent copy, category labels, and the WhatsApp order message.

The application is a catalog and lead-generation product. It does not process payment, delivery, inventory, or order status inside the marketplace.

## 2. Problem

Many small sellers have products to offer but do not have a simple catalog page that is easy to share. Customers need a fast way to discover local shops and start an order without creating another account or learning a new checkout system.

The product solves this by combining:

- A marketplace home page with shop discovery.
- Product search and location/category filtering.
- A public, shareable URL for every shop.
- A simple seller-managed catalog.
- A cart that creates a prefilled WhatsApp order message.
- Advertising revenue through Google AdSense.

## 3. Product goals

### Customer goals

- Browse available shops without registering.
- Search for products by name or description.
- Filter shops by province, city/regency, district, or product category.
- See a useful visual preview of each shop's catalog.
- Open a shop directly from a shared URL.
- Understand product names, photos, prices, descriptions, and availability.
- Select multiple products from one shop.
- Send an accurate order request to the shop's WhatsApp number in a few actions.

### Seller goals

- Register with only a phone number and six-digit PIN.
- Create a shop catalog without technical knowledge.
- Select a structured location from dependent dropdowns.
- Assign products to common marketplace categories.
- Update shop information and product availability quickly.
- Share one permanent shop URL with customers.
- Receive structured order requests in WhatsApp.

### Marketplace goals

- Keep the first release small enough to operate and maintain.
- Give the superadmin control over public content and advertising configuration.
- Generate measurable catalog visits and WhatsApp order clicks.
- Create a foundation for future features without adding payment or logistics complexity to the MVP.

## 4. Target users

### Customer

An anonymous visitor looking for products from local shops. The customer may arrive from the home page, a search engine, social media, or a seller's shared shop URL. The customer does not need a marketplace account.

### Seller

An Indonesian UMKM owner who manages one shop and its product catalog. The seller is comfortable using a phone and WhatsApp but may not have an e-commerce website.

### Superadmin

The marketplace operator. The superadmin manages seller support, public visibility, PIN resets, and AdSense settings. There is one application role for this MVP: `SUPERADMIN`.

## 5. MVP scope

### 5.1 Customer experience

#### Home page

The home page must:

- List all publicly visible shops.
- Display the shop name, profile photo when available, structured location, address detail, and a link to the shop catalog.
- Display up to four preview photos from the shop's available and publicly visible products.
- Show fewer than four previews when the shop has fewer than four available products.
- Show a clear empty catalog state when a public shop has no available products.
- Use newest products first for the preview list, with a deterministic tie-breaker.
- Provide a product search field that matches active product names and descriptions.
- Provide cascading province, city/regency, and district filters for shop location.
- Provide a product category filter that matches a product's primary or secondary category.
- Combine search, location, and category conditions using AND logic.
- Return shop cards when at least one public, available product matches the active product conditions and the shop matches the location conditions.
- Show up to four matching product previews on filtered shop cards.
- Preserve search and filter state in URL query parameters.
- Provide clear loading, invalid-filter, empty-marketplace, and no-results states.
- Work for visitors who are not logged in.

All home-page copy and filter labels must be in Bahasa Indonesia. The user-facing labels are `Cari produk`, `Provinsi`, `Kabupaten/Kota`, `Kecamatan`, `Kategori produk`, and `Hapus filter`.

The MVP does not include semantic search ranking, ratings, reviews, maps, radius search, or personalized recommendations.

#### Public shop page

Each shop is available at a root-level URL such as `https://example.com/warung-makmur`.

The shop page must:

- Show the shop name, profile photo, province, city/regency, district, street/address detail, and contact phone.
- Show all products that are published by the superadmin and marked available by the seller.
- Show each product's photo, name, price in IDR, primary category, secondary categories when present, optional description, and availability.
- Allow the customer to select a quantity for an available product.
- Allow the customer to add several products from the same shop to a client-side cart.
- Prevent products from another shop from being added to the current cart.
- Let the customer remove items and change quantities before ordering.
- Show a running subtotal.
- Offer an optional customer name and note field before sending the order.
- Provide a clear WhatsApp order call to action.

Product detail is shown within the shop page through the product card or an expandable product detail panel. A separate product URL is not required for the MVP.

#### WhatsApp order handoff

When the customer submits the cart, the application must:

- Validate that the shop and all selected products are still publicly visible and available.
- Use the current product names and IDR prices.
- Include the shop name, product names, quantities, unit prices, line totals, subtotal, optional customer name, and optional note in the message.
- Encode the message for use in a URL.
- Open `https://wa.me/{normalizedPhone}?text={encodedMessage}` using the shop's current phone number.
- Record the order-link click as an analytics event without creating an in-app order.

Payment, delivery, stock confirmation, order acceptance, and order status remain between the customer and seller in WhatsApp.

### 5.2 Seller experience

#### Registration and login

The seller must be able to:

- Register with a unique phone number and a six-digit numeric PIN.
- Log in with the registered phone number and PIN.
- Log out from the seller dashboard.
- Complete shop setup after registration.
- Change the account phone number while authenticated by confirming the current PIN. The new phone number must be unique, and changing it invalidates existing sessions.

The MVP does not verify phone ownership by OTP. A forgotten PIN is reset by the superadmin.

#### Shop setup and editing

Each seller account owns exactly one shop. The seller must provide:

- Shop name.
- Shop URL slug.
- Profile photo.
- Province selected from the bundled administrative dataset.
- City/Regency (`Kabupaten/Kota`) selected from the province's available children.
- District (`Kecamatan`) selected from the city/regency's available children.
- Street or landmark address detail.
- The registration phone number, which is used for customer WhatsApp orders.

The province, city/regency, and district controls are dependent dropdowns. Changing a parent selection clears all child selections. The initial location values come from a versioned local snapshot of the public [data.go.id Kode Administrasi Wilayah dataset](https://data.go.id/dataset/dataset/kode-administrasi-wilayah), with the source URL, retrieval date, and dataset version recorded by the implementation.

The URL slug is unique and permanent after shop setup. The seller may not edit it later. This is the resolved product decision for the conflict between editable shop URLs and permanent shared links.

After a valid shop setup is saved, the shop is published immediately unless the superadmin later hides it.

#### Product management

The seller must be able to:

- Create a product with one photo, name, IDR price, and optional description.
- Select one required primary category and up to two optional secondary categories from the fixed marketplace taxonomy.
- Mark a product available or unavailable.
- Update product content and availability.
- See the current product list in the seller dashboard.

The fixed category options shown to users are `Pakaian dan Mode`, `Makanan`, `Minuman`, `Kecantikan dan Perawatan Diri`, `Kesehatan dan Kebugaran`, `Rumah Tangga`, `Elektronik dan Aksesori`, `Kerajinan dan Hadiah`, `Pertanian dan Produk Segar`, `Jasa`, and `Lainnya`. Sellers cannot create custom categories in the MVP.

Unavailable products do not appear in home previews, do not appear in the public catalog, and cannot be added to a cart. Numeric stock counting is outside the MVP.

### 5.3 Superadmin experience

The superadmin area must allow the superadmin to:

- Log in through a protected admin route.
- View sellers, shops, and products.
- Hide or restore a shop.
- Hide or restore a product.
- Reset a seller's PIN without exposing the existing PIN.
- View basic audit activity for moderation and account support.
- Configure AdSense client and slot identifiers.
- Enable or disable configured ad placements.

There is no public superadmin registration. The initial superadmin account is provisioned through deployment configuration or a protected setup process.

Publishing is immediate for sellers. Superadmin moderation is a post-publication hide or restore control, not an approval workflow.

### 5.4 Advertising

Google AdSense is the MVP monetization mechanism.

- AdSense placements may appear on every user-facing route, including public catalog pages, seller pages, and the superadmin console.
- AdSense configuration is visible and editable only to the superadmin.
- The app must support route-specific ad slot identifiers.
- API responses, file responses, and redirects do not render ads.
- The product must include the required privacy notice, consent behavior where applicable, and `ads.txt` setup before production advertising is enabled.

### 5.5 Language and localization

- The application locale is `id-ID`.
- The root document language is `id`.
- Every user-facing string must be in Bahasa Indonesia with no English fallback.
- Use Indonesian wording consistently across public pages, seller pages, the superadmin console, forms, dialogs, notifications, error messages, loading states, accessibility labels, SEO metadata, privacy copy, and AdSense consent copy.
- Use Indonesian number, date, and currency formatting. Prices use Indonesian Rupiah with no decimal display.
- Use the Indonesian category labels defined in the product taxonomy. Internal category codes, API paths, database field names, and analytics event names are technical identifiers and are not rendered directly to users.
- Seller-created shop names, product names, descriptions, and address details remain exactly as entered by the seller; the application must not translate seller content automatically.
- The WhatsApp order template must be in Bahasa Indonesia.

## 6. Business rules

| ID | Rule |
| --- | --- |
| BR-01 | One seller account owns one shop. |
| BR-02 | A customer cart contains products from one shop only. |
| BR-03 | A shop slug is unique, URL-safe, and immutable after setup. |
| BR-04 | Reserved application paths cannot be used as shop slugs. |
| BR-05 | A public shop can be viewed without a customer account. |
| BR-06 | A product must be both published and available to appear publicly. |
| BR-07 | Seller-created shops and products publish immediately after valid save. |
| BR-08 | The superadmin can hide or restore shops and products after publication. |
| BR-09 | Prices are non-negative integer amounts in Indonesian Rupiah with no decimal display. |
| BR-10 | The seller phone number is the WhatsApp recipient for the shop. |
| BR-11 | A seller PIN is exactly six numeric digits and is stored as a hash. |
| BR-12 | No order record is stored after a WhatsApp handoff. |
| BR-13 | AdSense configuration is restricted to the superadmin. |
| BR-14 | Every shop address has a province, city/regency, district, and street/address detail. |
| BR-15 | Location selections must follow the province to city/regency to district parent-child hierarchy. |
| BR-16 | Every product has one primary category and no more than two secondary categories from the fixed taxonomy. |
| BR-17 | A home search result must satisfy every active text, location, and category filter. |
| BR-18 | Home product search matches active product names and descriptions and returns shop cards. |
| BR-19 | All application copy presented to users is in Bahasa Indonesia using the `id-ID` locale. |

## 7. URL and sharing rules

- Public shop URLs use `/{shopSlug}`.
- Slugs use lowercase URL-safe characters and hyphens. Consecutive separators are normalized.
- The system reserves paths used by the application, including `seller`, `admin`, `api`, `media`, `favicon.ico`, `robots.txt`, and `sitemap.xml`.
- A slug is checked for uniqueness without regard to letter case.
- A slug cannot be changed by the seller or superadmin through the normal UI.
- Public shop pages expose canonical URLs and Open Graph metadata for sharing.

## 8. Customer journey

1. The customer opens the home page or a shared shop URL.
2. The customer searches for a product or selects location/category filters when needed.
3. The customer opens a matching shop card or direct shop link.
4. The customer reviews shop details, structured location, and available products.
5. The customer adds products and quantities to the shop cart.
6. The customer optionally enters a name and note.
7. The customer taps the WhatsApp order button.
8. The application validates the cart and opens WhatsApp with a prefilled message.
9. The customer and seller complete payment and fulfillment outside the application.

## 9. Seller journey

1. The seller opens seller registration.
2. The seller enters a unique phone number and six-digit PIN.
3. The seller is signed in and completes the one-time shop setup.
4. The seller adds products with photos, names, prices, descriptions, and availability.
5. The shop and valid products become public immediately.
6. The seller shares the permanent shop URL.
7. The seller updates shop details or marks products unavailable as needed.
8. The seller receives customer order requests in WhatsApp.

## 10. Success measurement

The MVP must make these measures available through application logs or analytics events:

| Metric | Definition |
| --- | --- |
| Seller registration rate | Completed seller registrations divided by registration starts. |
| Seller activation rate | Registered sellers who complete shop setup and add at least one product. |
| Published shops | Number of shops that are visible to customers. |
| Catalog depth | Average number of available products per visible shop. |
| Shop views | Public shop page views, including direct shared-link visits. |
| Product engagement | Product additions and cart quantity changes. |
| Discovery search usage | Home searches submitted and searches producing at least one matching shop. |
| Filter usage | Home location and category filter applications. |
| Discovery no-result rate | Searches and filter combinations that return no shop cards. |
| WhatsApp order clicks | Valid cart submissions that produce a WhatsApp link. |
| Order-link error rate | Cart submissions rejected because products or shops changed state. |
| AdSense performance | Impressions, clicks, and revenue reported by AdSense. |

The first pilot should establish a baseline for these metrics before setting numeric growth targets.

## 11. Design, accessibility, and usability goals

The visual and interaction system follows mobile-first Material Design 3 guidance:

- Start layouts at mobile widths, then add tablet and desktop arrangements.
- Use Material cards, text fields, menus, select controls, filter chips, dialogs, snackbars, and a bottom-sheet cart where appropriate.
- Keep interactive controls at least 48px by 48px.
- Keep the search field and primary filters easy to reach near the top of the home page.
- Use a sticky or bottom-sheet cart summary on mobile.
- Use clear selected, focused, disabled, loading, and error states for every filter control.
- Use responsive product and shop cards without forcing horizontal scrolling.

- Design for mobile-first use because sellers and customers will commonly use phones.
- Keep the primary order action visible without requiring complex navigation.
- Use readable IDR formatting and sufficient color contrast.
- Provide labels and validation messages for every form field.
- Give uploaded images meaningful alternative text based on the shop or product name.
- Use Bahasa Indonesia for every visible label, status, validation message, notification, and accessibility name.
- Format dates, numbers, and prices using the `id-ID` locale.
- Ensure all important actions work with keyboard navigation and visible focus states.
- Do not rely on color alone to communicate product availability or errors.

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| PIN-only authentication allows account takeover if a PIN is shared. | Hash PINs, rate-limit login attempts, use secure sessions, and provide superadmin PIN reset. |
| A seller changes a price after a customer builds a cart. | Revalidate product state and current prices when generating the WhatsApp link. |
| A seller forgets to update availability. | Provide a prominent available/unavailable control and show current public state in the dashboard. |
| Large images slow down mobile pages. | Validate image size, resize or optimize uploads, and use responsive image delivery. |
| Administrative location data becomes outdated. | Pin a public dataset snapshot, record its version, and refresh it deliberately through a reviewed seed update. |
| Category labels become inconsistent across sellers. | Use a fixed seeded category taxonomy and reject custom category values. |
| Search or filters produce confusing results. | Use explicit AND logic, show active filter state, and provide a clear no-results message. |
| English or mixed-language copy appears in the interface. | Centralize user-facing strings in an Indonesian locale resource and test every application route for untranslated fallback text. |
| Shared links break if slugs change. | Make the slug permanent and block slug edits. |
| Ad placements reduce catalog usability or violate policy. | Use bounded responsive slots, keep ad settings under superadmin control, and complete AdSense policy setup before activation. |
| Orders cannot be measured after WhatsApp opens. | Measure validated WhatsApp-link clicks and clearly treat them as leads, not completed orders. |

## 13. MVP acceptance criteria

The MVP is product-complete when:

- An anonymous customer can browse public shops and open a shop URL directly.
- Each shop preview shows up to four available product photos.
- A customer can search active product names and descriptions from the home page.
- A customer can filter the home shop list by province, city/regency, district, and product category.
- Location dropdowns are cascading and invalid parent-child combinations are rejected.
- Search, location, and category filters combine with AND logic and preserve state in the URL.
- Filtered shop cards show no more than four matching product previews.
- A customer can create a one-shop cart and send its contents to the correct WhatsApp number.
- A seller can register, log in, complete shop setup, update permitted shop fields, and manage products.
- A seller can save province, city/regency, district, and street/address detail.
- A seller can assign one primary category and up to two secondary categories to a product.
- Product categories come only from the seeded fixed taxonomy.
- All public, seller, and superadmin UI copy, metadata, accessibility text, and WhatsApp order messages are in Bahasa Indonesia.
- Indonesian labels are used for the fixed category taxonomy while technical category codes remain unchanged.
- The shop URL is unique and cannot be edited after setup.
- Invalid phone numbers, duplicate phones, invalid PINs, invalid slugs, invalid prices, and invalid images are rejected with clear messages.
- A seller cannot access another seller's shop or products.
- The superadmin can hide and restore shops and products and reset seller PINs.
- AdSense settings can be changed only by the superadmin and can render on every application page.
- Public pages have shareable metadata and seller/admin pages are protected from unauthenticated access.
- The full requirement set is covered by the functional specification and test scenarios in `FRD.md`.

## 14. Explicit exclusions

The following are not part of this MVP:

- Customer registration, customer profiles, saved carts, or order history.
- In-app payment or payment reconciliation.
- Delivery calculation, courier integration, or delivery tracking.
- Numeric stock management or stock reservation.
- Product reviews, ratings, favorites, or social features.
- Marketplace commission calculation or seller payouts.
- Multi-shop checkout.
- Seller approval before publication.
- Seller-controlled AdSense settings.
- Seller-created product categories.
- Runtime location API dependencies, maps, radius search, and GPS-based discovery.
- Editable shop URLs or automatic old-slug redirects.
