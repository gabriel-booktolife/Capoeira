#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-capoeira.booktolife.com}"
EMAIL="${2:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Uso: $0 <dominio> <email>"
  echo "Exemplo: $0 capoeira.booktolife.com admin@booktolife.com"
  exit 1
fi

docker compose up -d nginx

docker run --rm \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  -m "$EMAIL" \
  --agree-tos \
  --no-eff-email

echo "Certificado emitido para $DOMAIN em certbot/conf/live/$DOMAIN"
