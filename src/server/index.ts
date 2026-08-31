import { config } from "../shared/config";
import { fail, HttpError, pathSegments } from "./http";
import { serveMedia } from "./media";
import { handlePublicRoute } from "./routes/public";
import { handleSellerRoute } from "./routes/seller";
import { handleMediaRoute } from "./routes/media";
import { handleAdminRoute } from "./routes/admin";
import { listPublishedShopSlugs } from "./public-service";
import { getPublicShop } from "./public-service";
import { RESERVED_SHOP_SLUGS } from "../shared/validation";

const htmlFile = Bun.file("public/index.html");
const clientBundle = Bun.file("public/assets/app.js");
const stylesFile = Bun.file("public/styles.css");
const adsTxtFile = Bun.file("public/ads.txt");
const APPLICATION_ROUTES = new Set(["/", "/seller/login", "/seller/register", "/seller/setup", "/seller/dashboard", "/seller/shop", "/seller/products", "/seller/products/new", "/seller/phone", "/seller/pin", "/admin/login", "/admin", "/admin/sellers", "/admin/shops", "/admin/products", "/admin/adsense", "/admin/activity"]);

function isSellerProductEditRoute(pathname: string): boolean {
  return /^\/seller\/products\/\d+\/edit$/.test(pathname);
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

function robotsResponse(): Response {
  const body = [`User-agent: *`, `Allow: /`, `Disallow: /seller`, `Disallow: /admin`, `Sitemap: ${config.publicAppUrl.replace(/\/$/, "")}/sitemap.xml`, ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

async function sitemapResponse(): Promise<Response> {
  const baseUrl = config.publicAppUrl.replace(/\/$/, "");
  const urls = ["/", ...(await listPublishedShopSlugs()).map((slug) => `/${encodeURIComponent(slug)}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${xmlEscape(`${baseUrl}${path}`)}</loc></url>`).join("")}</urlset>`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

function htmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

async function appHtmlResponse(pathname: string, status = 200, shop: Awaited<ReturnType<typeof getPublicShop>> = null): Promise<Response> {
  let html = await htmlFile.text();
  const privateRoute = pathname.startsWith("/seller") || pathname.startsWith("/admin");
  const title = shop ? `${shop.name} | Threads UMKM` : "Threads UMKM | Katalog Toko Lokal";
  const description = shop ? `${shop.name} di ${[shop.address.provinceName, shop.address.cityRegencyName, shop.address.districtName].filter(Boolean).join(" · ")}. Lihat katalog produk UMKM dan hubungi penjual melalui WhatsApp.` : "Katalog toko UMKM Indonesia dan pemesanan langsung melalui WhatsApp.";
  const robots = privateRoute || status !== 200 ? "noindex,nofollow" : "index,follow";
  const canonicalPath = shop ? `/${shop.slug}` : privateRoute || status !== 200 ? pathname : "/";
  const canonicalTag = `<link rel="canonical" href="${htmlEscape(`${config.publicAppUrl.replace(/\/$/, "")}${canonicalPath}`)}" />`;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(title)}</title>`).replace(/<meta name="description" content="[^"]*" \/>/i, `<meta name="description" content="${htmlEscape(description)}" />`).replace(/<meta name="robots" content="[^"]*" \/>/i, `<meta name="robots" content="${robots}" />`).replace("</head>", `${canonicalTag}</head>`);
  if (shop) {
    const image = shop.profileImageUrl ?? shop.products[0]?.imageUrl;
    const og = [`<meta property="og:title" content="${htmlEscape(title)}" />`, `<meta property="og:description" content="${htmlEscape(description)}" />`, `<meta property="og:type" content="website" />`, `<meta property="og:url" content="${htmlEscape(`${config.publicAppUrl.replace(/\/$/, "")}/${shop.slug}`)}" />`, image ? `<meta property="og:image" content="${htmlEscape(`${config.publicAppUrl.replace(/\/$/, "")}${image}`)}" />` : ""].filter(Boolean).join("");
    html = html.replace("</head>", `${og}</head>`);
  }
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "content-language": "id-ID", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" } });
}

function publicShopSlug(pathname: string): string | null {
  if (!pathname.startsWith("/") || pathname.endsWith("/") || pathname.slice(1).includes("/")) return null;
  try {
    const slug = decodeURIComponent(pathname.slice(1));
    return slug && !RESERVED_SHOP_SLUGS.has(slug.toLowerCase()) ? slug : null;
  } catch (error) {
    console.warn("URL toko tidak dapat dibaca.", error);
    return null;
  }
}

const server = Bun.serve({
  port: config.port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return jsonResponse({ status: "ok" });
    if (url.pathname === "/assets/app.js") return new Response(clientBundle, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" } });
    if (url.pathname === "/assets/app.js.map") return new Response(Bun.file("public/assets/app.js.map"), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" } });
    if (url.pathname === "/styles.css") return new Response(stylesFile, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" } });
    if (url.pathname === "/ads.txt") return new Response(adsTxtFile, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
    if (url.pathname === "/robots.txt") return robotsResponse();
    if (url.pathname === "/sitemap.xml") {
      try {
        return await sitemapResponse();
      } catch (error) {
        console.error("Kesalahan sitemap", error);
        return fail(500, "INTERNAL_ERROR", "Sitemap belum dapat dimuat.");
      }
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        const segments = pathSegments(url.pathname);
        if (segments[1] === "seller") return await handleSellerRoute(request, segments);
        if (segments[1] === "admin") return await handleAdminRoute(request, segments);
        if (segments[1] === "media") return await handleMediaRoute(request, segments);
        return await handlePublicRoute(request, url, segments);
      } catch (error) {
        if (error instanceof HttpError) return fail(error.status, error.code, error.message, error.details);
        console.error("Kesalahan API", error);
        return fail(500, "INTERNAL_ERROR", "Terjadi kesalahan pada server.");
      }
    }
    if (url.pathname.startsWith("/media/")) {
      try {
        return await serveMedia(url.pathname.slice("/media/".length));
      } catch (error) {
        if (error instanceof HttpError) return fail(error.status, error.code, error.message, error.details);
        console.error("Kesalahan media", error);
        return fail(500, "INTERNAL_ERROR", "Terjadi kesalahan pada server.");
      }
    }
    const slug = publicShopSlug(url.pathname);
    if (slug) {
      try {
        const shop = await getPublicShop(slug);
        return appHtmlResponse(url.pathname, shop ? 200 : 404, shop);
      } catch (error) {
        console.error("Kesalahan halaman toko", error);
        return fail(500, "INTERNAL_ERROR", "Halaman toko belum dapat dimuat.");
      }
    }
    return appHtmlResponse(url.pathname, APPLICATION_ROUTES.has(url.pathname) || isSellerProductEditRoute(url.pathname) ? 200 : 404);
  },
});

console.log(`Threads UMKM berjalan di http://localhost:${server.port}`);

function jsonResponse(data: unknown): Response {
  return Response.json(data, { headers: { "cache-control": "no-store", "content-language": "id-ID", "x-content-type-options": "nosniff" } });
}
