const result = await Bun.build({
  entrypoints: ["src/client/main.tsx"],
  outdir: "public/assets",
  naming: "app.js",
  target: "browser",
  minify: false,
  sourcemap: "external",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("Client bundle created in public/assets/app.js");

const styles = Bun.spawn(["bunx", "--no-install", "@tailwindcss/cli", "-i", "src/client/styles.css", "-o", "public/styles.css"], { stdout: "inherit", stderr: "inherit" });
const stylesExitCode = await styles.exited;
if (stylesExitCode !== 0) process.exit(stylesExitCode);

console.log("Tailwind stylesheet created in public/styles.css");

const assetHasher = new Bun.CryptoHasher("sha256");
assetHasher.update(await Bun.file("public/assets/app.js").arrayBuffer());
assetHasher.update(await Bun.file("public/styles.css").arrayBuffer());
const assetVersion = assetHasher.digest("hex").slice(0, 16);
const indexPath = "public/index.html";
const indexHtml = await Bun.file(indexPath).text();
if (!indexHtml.includes("/styles.css") || !indexHtml.includes("/assets/app.js")) {
  throw new Error("Referensi aset client tidak ditemukan di public/index.html.");
}
const versionedIndexHtml = indexHtml
  .replace(/\/styles\.css(?:\?v=[^"]*)?/g, `/styles.css?v=${assetVersion}`)
  .replace(/\/assets\/app\.js(?:\?v=[^"]*)?/g, `/assets/app.js?v=${assetVersion}`);
await Bun.write(indexPath, versionedIndexHtml);
console.log(`Client assets versioned with ${assetVersion}`);

export {};
