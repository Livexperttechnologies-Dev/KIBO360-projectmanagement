#!/usr/bin/env bash
# ==============================================================================
# KIBO360 Project Hub — SSL Certificate Generator (Linux / macOS)
# Livexpert Technologies Pvt. Ltd.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../ssl"
DOMAIN="${1:-kibo360.livexpert.in}"

echo "🔐 Generating self-signed TLS/SSL certificate for ${DOMAIN}..."

mkdir -p "${OUTPUT_DIR}"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${OUTPUT_DIR}/kibo360.key" \
  -out "${OUTPUT_DIR}/kibo360.crt" \
  -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=Livexpert Technologies/OU=IT Infrastructure/CN=${DOMAIN}" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:localhost,IP:127.0.0.1"

chmod 600 "${OUTPUT_DIR}/kibo360.key"
chmod 644 "${OUTPUT_DIR}/kibo360.crt"

echo "✅ SSL certificate and private key generated in ${OUTPUT_DIR}"
