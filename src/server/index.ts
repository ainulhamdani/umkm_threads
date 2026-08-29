import { config } from "../shared/config";

const htmlFile = Bun.file("public/index.html");
const clientBundle = Bun.file("public/assets/app.js");
const stylesFile = Bun.file("public/styles.css");
const robotsFile = Bun.file("public/robots.txt");

function isPublicPage(pathname: string): boolean {
  return pathname === "/" || /^\/[a-z0-9-]+$/.test(pathname);
}

const server = Bun.serve({
  port: config.port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ status: "ok" });
    if (url.pathname === "/assets/app.js") return new Response(clientBundle, { headers: { "content-type": "text/javascript; charset=utf-8" } });
    if (url.pathname === "/assets/app.js.map") return new Response(Bun.file("public/assets/app.js.map"));
    if (url.pathname === "/styles.css") return new Response(stylesFile, { headers: { "content-type": "text/css; charset=utf-8" } });
    if (url.pathname === "/robots.txt") return new Response(robotsFile, { headers: { "content-type": "text/plain; charset=utf-8" } });
    if (isPublicPage(url.pathname)) return new Response(htmlFile, { headers: { "content-type": "text/html; charset=utf-8" } });
    return new Response("Tidak ditemukan.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  },
});

console.log(`Threads UMKM berjalan di http://localhost:${server.port}`);
