# Deploy KIBO360 with Dokploy

KIBO360 runs as two containers built from their own Dockerfiles, plus PostgreSQL. Dokploy provides the public domain and HTTPS certificate; the frontend container serves HTTP on port 80. The database and API need no public domain.

| Piece | Dockerfile | Port | Notes |
|---|---|---|---|
| Backend API | `backend/Dockerfile` | 5000 | On every start runs `prisma migrate deploy`, then the super-admin bootstrap (when `INITIAL_ADMIN_PASSWORD` is set), then the API |
| Frontend | `frontend/Dockerfile` | 80 | nginx serving the SPA; proxies `/api/` to the backend when `API_UPSTREAM` is set |
| Database | Dokploy PostgreSQL service, or the Compose `postgres` service | 5432 | PostgreSQL 16 |

Serve the frontend and the API on **one domain** (the frontend proxies `/api/`). The refresh-token cookie is `SameSite=Lax`, so an API on an unrelated domain would sign users out whenever their 15-minute access token expires.

Two ways to deploy: **Option A** (two Dokploy Applications, each using its Dockerfile) or **Option B** (one Docker Compose application).

## Option A — two Dokploy Applications (Dockerfile build)

### 1. Database
Create a **PostgreSQL** service in the Dokploy project. Copy its **internal** connection URL, e.g. `postgresql://kibo:<password>@kibo360-db-abc123:5432/kibo360_hub`, and append `?schema=public`. Use a URL-safe (hex) password, since it goes into the URL.

### 2. Backend application
- Source: this repository and the production branch
- Build type: **Dockerfile** · Docker file: `Dockerfile` · Build path (context): `backend`
- **Environment**:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://kibo:<password>@<db-internal-host>:5432/kibo360_hub?schema=public
FRONTEND_URL=https://kibo360.example.com
CORS_ORIGIN=https://kibo360.example.com
SUPER_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_NAME=KIBO360 Super Admin
INITIAL_ADMIN_PASSWORD=<unique, at least 12 characters>
TOTP_ENCRYPTION_KEY=<openssl rand -hex 32>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
TRUST_PROXY=1
```

- **Volumes / Mounts**: add a volume mounted at `/app/uploads` (task attachments). Without it, uploads are lost on every redeploy.
- **Domains**: none — the frontend reaches the backend over Dokploy's internal network.
- Note the backend's **App Name** shown by Dokploy (e.g. `kibo360-backend-x1y2z3`); it is the internal hostname.

Optional: `RUN_MIGRATIONS=false` skips migrations at start-up. `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `COMPANY_TIMEZONE`, `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` keep their defaults when unset.

### 3. Frontend application
- Source: this repository and the production branch
- Build type: **Dockerfile** · Docker file: `Dockerfile` · Build path (context): `frontend`
- **Environment**: `API_UPSTREAM=http://<backend-app-name>:5000` (scheme, host and port only — no path or trailing slash)
- Build args: none. The default `VITE_API_URL=/api/v1` is correct when the frontend proxies the API.
- **Domains**: `kibo360.example.com`, container port **80**, HTTPS with Let's Encrypt. Point the domain's DNS record to the Dokploy server first.

Deploy the backend first, then the frontend. Enable auto-deploy on both if pushes should deploy automatically.

## Option B — Docker Compose

1. Create a **Docker Compose** application in Dokploy and connect the repository and production branch.
2. Choose `docker-compose.prod.yml` as the Compose file with the repository root as the context.
3. Add the variables from [`.env.production.example`](../../.env.production.example) to the application's **Environment** settings. Replace every `CHANGE_ME` value. Do not commit production values to GitHub.
4. Configure the domain on the `frontend` service, container port **80**, with HTTPS/Let's Encrypt enabled.
5. Enable automatic deployment on pushes if desired. A Git push only deploys automatically when this webhook/auto-deploy setting is enabled.
6. Deploy. Dokploy builds the frontend and backend, PostgreSQL starts, `backend-migrate` applies the checked-in migrations, `backend-bootstrap` creates the initial super-admin if absent, then the API and frontend start. PostgreSQL is initialized with an unprivileged `kibo360_app` user for the API.

## Required environment values

- `FRONTEND_URL` and `CORS_ORIGIN`: both must be the exact public origin, for example `https://kibo360.example.com` (no trailing slash).
- `SUPER_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME`, and `INITIAL_ADMIN_PASSWORD`: initial super-admin identity. Use a unique password of at least 12 characters. The bootstrap creates the account only if the configured email does not exist. Later deployments do not change its password.
- Option B only — `POSTGRES_PASSWORD` and `POSTGRES_APP_PASSWORD`: separate random database passwords. Use URL-safe hexadecimal values for `POSTGRES_APP_PASSWORD` because Compose also places it in the PostgreSQL connection URL. Generate with `openssl rand -hex 32`.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: separate high-entropy values; do not reuse each other or the database passwords.
- `TOTP_ENCRYPTION_KEY`: exactly 64 hexadecimal characters, generated with `openssl rand -hex 32`.
- `TRUST_PROXY`: number of reverse proxies in front of the API. Keep `1` (Dokploy's Traefik) in both options; the frontend nginx forwards Traefik's client address unchanged.

Keep all secret values stable between deployments. PostgreSQL's initialization scripts only run when its data volume is first created. Changing the PostgreSQL environment password later does not rotate the password in an existing database; rotate it in PostgreSQL and Dokploy together. Do not delete the database volume to troubleshoot a deploy.

## After deployment

- Option A: confirm both applications are running and healthy; the backend log ends with `API server listening`. Option B: confirm `postgres` is healthy, `backend-migrate` and `backend-bootstrap` completed successfully, and `backend` and `frontend` are healthy.
- `https://your-domain/health` returns `{"status":"healthy"}` (frontend) and `https://your-domain/api/v1/health` returns the API status.
- Open `https://your-domain/` and sign in with the initial super-admin email and password. Configure Google Authenticator in the profile/settings, then enable organization-wide 2FA if required.
- Create other users directly from User Management as the super admin. This app does not create demo users or demo projects on a fresh production database.
- Configure Dokploy backups (or another off-host PostgreSQL backup). A persistent volume is not itself a backup.

## Existing production databases

The first migration assumes a fresh database. If a database already has the application tables but does not have Prisma migration history, stop before deploying. Take and verify a backup, baseline the existing schema with Prisma's migration resolve procedure, and confirm the schema matches every checked-in migration before redeploying. Do not run `migrate reset` or remove the volume on a live database.

## Troubleshooting

- **`/api/...` returns the HTML login page:** `API_UPSTREAM` is not set on the frontend; its log prints `API_UPSTREAM not set`.
- **502 on `/api/`:** the host in `API_UPSTREAM` is not the backend's internal name, or the backend is still starting or crashed (check its log).
- **Compose reports a missing variable:** add the required variable in Dokploy's Environment settings, then redeploy.
- **Domain returns 404 or gateway error:** check that the domain targets the frontend on container port 80 and DNS points to the Dokploy server.
- **Backend keeps restarting:** inspect its log for `Invalid environment variables` (missing secret, or `TOTP_ENCRYPTION_KEY` not 64 hex characters) and for migration errors.
- **Everyone gets "Too many login attempts":** `TRUST_PROXY` is `0`, so every request appears to come from the proxy.
- **Bootstrap says the account already exists:** expected on redeploy; the existing account and password are left unchanged.
- **Migration fails:** inspect the migration output in the backend log (Option A) or `backend-migrate` (Option B). Keep the database volume; fix the migration/database issue before trying again.
