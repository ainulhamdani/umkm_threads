# CapRover deployment

This repository deploys as a multi-stage Bun image through the root-level `captain-definition` file. The final image listens on port `80` and runs the compiled client bundle with the Bun HTTP server.

The image uses the pinned official `oven/bun:1.4.0-slim` image. It contains production dependencies only, runs as the non-root `bun` user, and keeps the migration and seed scripts available for release setup.

Every container start runs `bun run db:migrate` before the web server. If migration fails, the container exits and does not serve traffic.

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

The container already sets `PORT=80` and `UPLOAD_DIR=/data/uploads`. Do not point `DB_HOST` at `localhost` when MySQL runs in another CapRover app.

In CapRover HTTP Settings:

1. Set the container HTTP port to `80`.
2. Enable HTTPS for the public domain.
3. Keep the app at one instance while uploads use local filesystem storage.

In CapRover App Details, add `/data/uploads` as a persistent directory. Without this volume, uploaded shop and product images disappear after a restart or deployment. Back up the volume together with the MySQL database.

## Database setup

The MySQL account must be able to create the `threads_shop` database during migration, or the database must be created before running the migration. Use a dedicated application user for production rather than the MySQL root account.

After the first deployment, open the CapRover app console or execute the seed command inside the running container:

```sh
SUPERADMIN_EMAIL=admin@example.com SUPERADMIN_PASSWORD='replace-with-a-strong-password' bun run db:seed
```

Remove the temporary seed credentials from the shell and from CapRover environment variables after seeding. The entrypoint handles `bun run db:migrate` automatically for later schema releases.

The migration entrypoint runs automatically for every container start, including later deployments and restarts. Keep the app at one instance during deployments so schema changes are not applied concurrently. Each migration must remain backward-compatible with the running application during the CapRover replacement window.

## Local image checks

The deployment image can be built and started locally when Docker is installed:

```sh
docker build --pull -t threads-umkm .
docker run --rm -p 3000:80 --env-file .env threads-umkm
```

The application health endpoint is `GET /health`. The local container still needs a reachable MySQL instance configured through `.env`.

## Relevant files

- `Dockerfile`: dependency, build, and production stages.
- `docker-entrypoint.sh`: runs the database migration before starting the server.
- `.dockerignore`: excludes secrets, local uploads, dependencies, tests, and generated client assets from the build context.
- `captain-definition`: tells CapRover to use the repository Dockerfile.
