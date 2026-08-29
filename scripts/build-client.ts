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

export {};
