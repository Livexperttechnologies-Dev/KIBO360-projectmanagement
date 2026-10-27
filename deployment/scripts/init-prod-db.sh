#!/bin/sh
set -eu

: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD must be set}"

psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=database_name="$POSTGRES_DB" \
  --set=app_password="$POSTGRES_APP_PASSWORD" \
  --file=/docker-entrypoint-initdb.d/init-prod-db.sql.disabled
