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

export {};
