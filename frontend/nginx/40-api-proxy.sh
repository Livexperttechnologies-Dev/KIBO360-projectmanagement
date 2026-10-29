#!/bin/sh
# Writes the /api/ proxy block when API_UPSTREAM is set. Prefer the backend's
# internal Dokploy name (http://<backend-app-name>:5000); a public
# https://api.example.com URL also works but adds a round trip through Traefik.
# Runs from the nginx image's entrypoint.
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

# Scheme and host[:port] only; a path would replace the request URI.
upstream=$(echo "$API_UPSTREAM" | sed -E 's#^(https?://[^/]+).*#\1#')

case "$upstream" in
  https://*)
    # A public URL goes back through Traefik, which routes by Host and needs
    # SNI; sending the frontend's Host would loop back to this container.
    upstream_host=${upstream#https://}
    upstream_host=${upstream_host%%:*}
    host_header=$upstream_host
    tls_lines="proxy_ssl_server_name on;
    proxy_ssl_name $upstream_host;"
    ;;
  *)
    host_header='$host'
    tls_lines=""
    ;;
esac

cat > "$target" <<CONF
resolver ${resolver} valid=10s ipv6=off;

location /api/ {
    set \$api_upstream ${upstream};
    proxy_pass \$api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host ${host_header};
    ${tls_lines}
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
echo "Proxying /api/ to ${upstream}"
