import { config } from "../shared/config";
import { fail, HttpError, pathSegments } from "./http";
import { serveMedia } from "./media";
import { handlePublicRoute } from "./routes/public";
import { handleSellerRoute } from "./routes/seller";
import { handleMediaRoute } from "./routes/media";
import { handleAdminRoute } from "./routes/admin";

const htmlFile = Bun.file("public/index.html");
const clientBundle = Bun.file("public/assets/app.js");
const stylesFile = Bun.file("public/styles.css");
const robotsFile = Bun.file("public/robots.txt");

const server = Bun.serve({
  port: config.port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ status: "ok" });
    if (url.pathname === "/assets/app.js") return new Response(clientBundle, { headers: { "content-type": "text/javascript; charset=utf-8" } });
    if (url.pathname === "/assets/app.js.map") return new Response(Bun.file("public/assets/app.js.map"));
    if (url.pathname === "/styles.css") return new Response(stylesFile, { headers: { "content-type": "text/css; charset=utf-8" } });
    if (url.pathname === "/robots.txt") return new Response(robotsFile, { headers: { "content-type": "text/plain; charset=utf-8" } });
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
    return new Response(htmlFile, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
});

console.log(`Threads UMKM berjalan di http://localhost:${server.port}`);
