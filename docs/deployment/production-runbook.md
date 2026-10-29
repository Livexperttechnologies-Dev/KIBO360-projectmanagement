# Production deployment runbook

The supported production deployment path is Dokploy, either as two Dockerfile applications (`backend/Dockerfile`, `frontend/Dockerfile`) or with the repository's `docker-compose.prod.yml`.

Follow the [Dokploy deployment guide](dokploy.md) for initial setup, required variables, domain and HTTPS configuration, initial super-admin provisioning, database migration behavior, health checks, and troubleshooting.

## Routine release

1. Review and merge the intended changes to the configured production branch.
2. Ensure Dokploy auto-deploy is enabled for that branch, or start a deployment from the Dokploy application page.
3. Review the migration, bootstrap, backend, and frontend service logs in Dokploy.
4. Confirm the frontend and `https://your-domain/api/v1/health` are reachable.

## Recovery

Before schema changes or recovery operations, take and verify a PostgreSQL backup. Preserve the named PostgreSQL volume. Do not use `docker compose down -v`, remove the volume, or run `prisma migrate reset` against production. If a migration fails, stop and resolve it against the current database state before redeploying. Use Dokploy's deployment rollback for code-only failures; restoring a database requires a separately verified backup and an explicit recovery plan.
