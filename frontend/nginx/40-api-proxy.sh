#!/bin/sh
# Writes the /api/ proxy block when API_UPSTREAM is set (e.g.
# http://kibo360-backend:5000). Runs from the nginx image's entrypoint.
set -e

mkdir -p /etc/nginx/kibo360
target=/etc/nginx/kibo360/api-proxy.conf

if [ -z "${API_UPSTREAM:-}" ]; then
  : > "$target"
  echo "API_UPSTREAM not set; /api/ is not proxied"
  exit 0
fi

# Docker's embedded DNS; resolving per request lets nginx start before the
# backend is up and follow it across redeploys.
resolver="${NGINX_RESOLVER:-127.0.0.11}"

cat > "$target" <<CONF
resolver ${resolver} valid=10s ipv6=off;

location /api/ {
    set \$api_upstream ${API_UPSTREAM%/};
    proxy_pass \$api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Connection "";
    proxy_set_header X-Real-IP \$remote_addr;
    # Forward Traefik's header unchanged so the API (TRUST_PROXY=1) reads the
    # client address Traefik appended.
    proxy_set_header X-Forwarded-For \$http_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$http_x_forwarded_proto;
    proxy_connect_timeout 60s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
    proxy_buffering off;
}
CONF
echo "Proxying /api/ to ${API_UPSTREAM}"
