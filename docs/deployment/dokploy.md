# Deploy KIBO360 with Dokploy

This repository's `docker-compose.prod.yml` is configured for Dokploy. Dokploy provides the public domain and HTTPS certificate; the frontend container serves HTTP on port 80 inside the Compose network. The database and API have no public host ports.

## Before deploying

1. Push the project to GitHub, then create a **Docker Compose** application in Dokploy and connect the repository and production branch.
2. In the application settings, choose `docker-compose.prod.yml` as the Compose file and set the repository root as the Compose context.
3. Add the variables from [`.env.production.example`](../../.env.production.example) to the application's **Environment** settings. Replace every `CHANGE_ME` value. Do not commit production values to GitHub.
4. Configure the application's domain on the `frontend` service, container port **80**, with HTTPS/Let's Encrypt enabled. Point the domain's DNS record to the Dokploy server first.
5. Enable automatic deployment on pushes to the selected production branch if desired. A Git push only deploys automatically when this webhook/auto-deploy setting is enabled.
6. Deploy. Dokploy builds the frontend and backend, PostgreSQL starts, Prisma applies the checked-in migrations, the bootstrap job creates the initial super-admin if absent, then the API and frontend start.

## Required environment values

- `FRONTEND_URL` and `CORS_ORIGIN`: both must be the exact public origin, for example `https://kibo360.example.com` (no trailing slash).
- `SUPER_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME`, and `INITIAL_ADMIN_PASSWORD`: initial super-admin identity. Use a unique password of at least 12 characters. The bootstrap job creates the account only if the configured email does not exist. Later deployments do not change its password. After first login, set up Google Authenticator in the super-admin profile/settings and enable organization-wide enforcement there.
- `POSTGRES_PASSWORD` and `POSTGRES_APP_PASSWORD`: separate random database passwords. Use URL-safe hexadecimal values for `POSTGRES_APP_PASSWORD` because Compose also places it in the PostgreSQL connection URL. Generate with `openssl rand -hex 32`.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: separate high-entropy values; do not reuse each other or the database passwords.
- `TOTP_ENCRYPTION_KEY`: exactly 64 hexadecimal characters, generated with `openssl rand -hex 32`.

Keep all secret values stable between deployments. PostgreSQL's initialization scripts only run when its data volume is first created. Changing the PostgreSQL environment password later does not rotate the password in an existing database; rotate it in PostgreSQL and Dokploy together. Do not delete the database volume to troubleshoot a deploy.

## After deployment

- In Dokploy, confirm `postgres` is healthy, `backend-migrate` and `backend-bootstrap` completed successfully, and `backend` and `frontend` are healthy.
- Open `https://your-domain/` and confirm the login page loads. The API health endpoint is `https://your-domain/api/v1/health`.
- Sign in with the initial super-admin email and password. Configure Google Authenticator, then enable organization-wide 2FA if required.
- Create other users directly from User Management as the super admin. Set each initial password there. This app does not create demo users or demo projects on a fresh production database.
- Configure Dokploy backups (or another off-host PostgreSQL backup). The named PostgreSQL volume is persistent but is not itself a backup.

## Existing production databases

The first migration assumes a fresh database. If a database already has the application tables but does not have Prisma migration history, stop before deploying this migration setup. Take and verify a backup, baseline the existing schema with Prisma's migration resolve procedure, and confirm the schema matches every checked-in migration before redeploying. Do not run `migrate reset` or remove the volume on a live database.

## Troubleshooting

- **Compose reports a missing variable:** add the required variable in Dokploy's application Environment settings, then redeploy.
- **Domain returns 404 or gateway error:** check that the domain targets the `frontend` service on container port 80 and DNS points to the Dokploy server.
- **Backend keeps restarting:** inspect backend logs for invalid JWT/TOTP values, then inspect `backend-migrate` and `backend-bootstrap` logs.
- **Bootstrap says the account already exists:** this is expected on redeploy; it leaves the existing account and password unchanged. Use the application's user management/password reset flow if you need to change it.
- **Migration fails:** inspect PostgreSQL and migration logs. Keep the database volume; fix the migration/database issue before trying again.
