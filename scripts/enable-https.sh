#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-capoeira.booktolife.com}"
CERT_DIR="certbot/conf/live/$DOMAIN"

if [[ ! -f "$CERT_DIR/fullchain.pem" || ! -f "$CERT_DIR/privkey.pem" ]]; then
  echo "Certificado nao encontrado em $CERT_DIR"
  echo "Execute primeiro: ./scripts/issue-letsencrypt.sh $DOMAIN <email>"
  exit 1
fi

cp nginx/capoeira-https.conf nginx/capoeira.conf
docker compose up -d nginx

echo "HTTPS ativado para $DOMAIN"
