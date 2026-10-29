#!/bin/sh
# ==============================================================================
# KIBO360 Project Hub — Backend container entrypoint
# Applies pending Prisma migrations and provisions the super-admin before the
# API starts, so a single-container deploy (Dokploy "Application" using this
# Dockerfile) needs no separate migration job.
# ==============================================================================
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  npx --no-install prisma migrate deploy
fi

# Creates the account only when SUPER_ADMIN_EMAIL does not exist yet; an
# existing account's password is never changed.
if [ -n "${INITIAL_ADMIN_PASSWORD:-}" ]; then
  echo "Ensuring super-admin account exists..."
  node dist/src/scripts/bootstrap-admin.js
fi

exec "$@"
