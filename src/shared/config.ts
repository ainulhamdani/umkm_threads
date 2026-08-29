export const config = {
  port: Number(Bun.env.PORT ?? "3000"),
  publicAppUrl: Bun.env.PUBLIC_APP_URL ?? "http://localhost:3000",
  cookieSecure: (Bun.env.PUBLIC_APP_URL ?? "http://localhost:3000").startsWith("https://"),
  sessionDays: 7,
  db: {
    host: Bun.env.DB_HOST ?? "127.0.0.1",
    port: Number(Bun.env.DB_PORT ?? "3306"),
    name: Bun.env.DB_NAME ?? "threads_shop",
    user: Bun.env.DB_USER ?? "root",
    password: Bun.env.DB_PASSWORD ?? "",
  },
  uploadDir: Bun.env.UPLOAD_DIR ?? "storage/uploads",
  maxImageBytes: Number(Bun.env.MAX_IMAGE_BYTES ?? "5242880"),
};
