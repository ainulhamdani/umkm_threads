# CapRover deployment

This repository deploys as a multi-stage Bun image through the root-level `captain-definition` file. The final image listens on port `80` and runs the compiled client bundle with the Bun HTTP server.

The image uses the pinned official `oven/bun:1.4.0-slim` image. It contains production dependencies only, runs as the non-root `bun` user, and keeps the migration and seed scripts available for release setup.

Every container start runs `bun run db:migrate` before the web server. Migration also synchronizes the bundled location and category reference data, so the province dropdown is available without a separate location seed command. If migration fails, the container exits and does not serve traffic.

## CapRover app configuration

Create one CapRover app and deploy the repository. CapRover should use the root `captain-definition` file.

Set these application environment variables in CapRover App Configs:

| Variable | Value |
| --- | --- |
| `PUBLIC_APP_URL` | The public HTTPS URL, for example `https://market.example.com` |
| `DB_HOST` | The MySQL CapRover app/service hostname or external database hostname |
| `DB_PORT` | `3306` |
| `DB_NAME` | `threads_shop` |
| `DB_USER` | A database user with access to `threads_shop` |
| `DB_PASSWORD` | The database password |
| `MAX_IMAGE_BYTES` | `5242880` |
| `PICTSHARE_API_URL` | Private PictShare URL, for example `http://srv-captain--pictshare:80` |
| `PICTSHARE_PUBLIC_URL` | Public PictShare HTTPS URL used in browser redirects |
| `PICTSHARE_UPLOAD_CODE` | The same secret as the PictShare `UPLOAD_CODE` setting |
| `PICTSHARE_TIMEOUT_MS` | `30000` |

The container already sets `PORT=80` and keeps `UPLOAD_DIR=/data/uploads` only for legacy media records. New uploads are sent to PictShare. Do not point `DB_HOST` at `localhost` when MySQL runs in another CapRover app.

In CapRover HTTP Settings:

1. Set the container HTTP port to `80`.
2. Enable HTTPS for the public domain.
3. Keep one instance during schema migrations. The application can scale after the migration completes because new media is stored by PictShare.

If the installation still has legacy local media, keep `/data/uploads` as a persistent directory until those records are deliberately migrated. Back up this volume together with the MySQL database.

## PictShare app configuration

Run PictShare as a separate CapRover app on the same CapRover server. For example, name the app `pictshare` and deploy the image `hascheksolutions/pictshare:2` directly through CapRover's image deployment screen. The UMKM app must not replace its own image with PictShare; it calls the separate service over the CapRover network.

Configure the PictShare app as follows:

| Setting | Value |
| --- | --- |
| Container HTTP port | `80` |
| Persistent directory | `/usr/share/nginx/html/data` |
| `URL` | The public PictShare URL with a trailing slash, for example `https://images.example.com/` |
| `MAX_UPLOAD_SIZE` | `5` or another value at least as large as the UMKM limit, in MB |
| `UPLOAD_CODE` | A strong secret shared only with the UMKM server configuration |
| `IMAGE_CHANGE_CODE` | A strong PictShare administration secret |
| `MASTER_DELETE_CODE` | A strong PictShare deletion secret |

Enable HTTPS and assign the public PictShare domain before setting `PICTSHARE_PUBLIC_URL` in the UMKM app. For an app named `pictshare`, set the UMKM variables like this:

```text
PICTSHARE_API_URL=http://srv-captain--pictshare:80
PICTSHARE_PUBLIC_URL=https://images.example.com
PICTSHARE_UPLOAD_CODE=<same value as PictShare UPLOAD_CODE>
PICTSHARE_TIMEOUT_MS=30000
```

The private URL is used only for the server-to-server `POST /api/upload` request. The public URL is used to build the browser-facing image URL. The v2 API receives the upload code in the `uploadcode` form field. Never put `PICTSHARE_UPLOAD_CODE`, `IMAGE_CHANGE_CODE`, or `MASTER_DELETE_CODE` in client variables, committed files, logs, or HTML.

PictShare is file-based and does not use the `threads_shop` database. Back up `/usr/share/nginx/html/data` separately from MySQL. Do not remove the PictShare volume during an app update.

## Database setup

The MySQL account must be able to create the `threads_shop` database during migration, or the database must be created before running the migration. Use a dedicated application user for production rather than the MySQL root account.

After the first deployment, open the CapRover app console or execute the superadmin seed command inside the running container:

```sh
SUPERADMIN_EMAIL=admin@example.com SUPERADMIN_PASSWORD='replace-with-a-strong-password' bun run db:seed
```

Remove the temporary seed credentials from the shell and from CapRover environment variables after seeding. The entrypoint handles `bun run db:migrate` and reference-data synchronization automatically for later schema releases.

The migration entrypoint runs automatically for every container start, including later deployments and restarts. Keep the app at one instance during deployments so schema changes are not applied concurrently. Each migration must remain backward-compatible with the running application during the CapRover replacement window.

## Local image checks

The deployment image can be built and started locally when Docker is installed:

```sh
docker run -d --name pictshare -p 8080:80 \
  -e URL=http://localhost:8080/ \
  -e MAX_UPLOAD_SIZE=5 \
  -e UPLOAD_CODE=replace-with-a-local-secret \
  hascheksolutions/pictshare:2

PICTSHARE_API_URL=http://localhost:8080
PICTSHARE_PUBLIC_URL=http://localhost:8080
docker build --pull -t threads-umkm .
docker run --rm -p 3000:80 --env-file .env threads-umkm
```

The application health endpoint is `GET /health`. The local container still needs a reachable MySQL instance configured through `.env`.

## Relevant files

- `Dockerfile`: dependency, build, and production stages.
- `docker-entrypoint.sh`: runs the database migration before starting the server.
- `scripts/reference-data.ts`: atomically synchronizes the bundled locations and categories.
- `.dockerignore`: excludes secrets, local uploads, dependencies, tests, and generated client assets from the build context.
- `captain-definition`: tells CapRover to use the repository Dockerfile.
- `sql/002_pictshare_media.sql`: adds remote PictShare hash and URL columns while preserving legacy local records.
